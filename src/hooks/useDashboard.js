'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_INITIAL_CHALLAN,
  DEFAULT_PASSWORD,
  DEFAULT_USERNAME,
  GOOGLE_SHEET_WEB_APP_URL,
  fmtCalc,
  getInitialForm,
  recalcBalance,
  roundMeasurement,
  toEnglishNumber,
} from '@/lib/dashboardUtils';
import { saveMultipleToHistory } from '@/hooks/useAutocomplete';

export function useDashboard() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [form, setForm] = useState(() => getInitialForm());
  const [feetMode, setFeetMode] = useState('tons');
  const [customerOptions, setCustomerOptions] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [lastSlip, setLastSlip] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddSuccessModal, setShowAddSuccessModal] = useState(false);
  const [addedCustomerName, setAddedCustomerName] = useState('');
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositSuccessAmount, setDepositSuccessAmount] = useState(0);
  const [showDepositSuccess, setShowDepositSuccess] = useState(false);
  const [showPreviousDueModal, setShowPreviousDueModal] = useState(false);
  const [previousDueAmount, setPreviousDueAmount] = useState('');
  const [showPreviousDueSuccess, setShowPreviousDueSuccess] = useState(false);
  const [previousDueSuccessAmount, setPreviousDueSuccessAmount] = useState(0);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', mobile: '', address: '' });
  const [globalSummary, setGlobalSummary] = useState({ globalDeposited: 0, globalRemaining: 0, globalDue: 0 });
  const [isLoadingGlobalSummary, setIsLoadingGlobalSummary] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [pollingEnabled, setPollingEnabled] = useState(true);

  const customerSummaryRequest = useRef(0);
  const pollingRef = useRef(null);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchNextChallanNo = async () => {
    setIsFetchingData(true);
    try {
      const res = await fetch('/api/next-challan');
      if (!res.ok) return;
      const data = await res.json();
      if (data?.nextChallanNo) {
        setForm((prev) => ({ ...prev, challanNo: String(data.nextChallanNo) }));
      }
    } catch {
      setForm((prev) => ({ ...prev, challanNo: '' }));
    } finally {
      setIsFetchingData(false);
    }
  };

  const fetchCustomerSummary = useCallback(async (customerName, isSilent = false) => {
    if (!isSilent) setIsFetchingData(true);
    const requestId = customerSummaryRequest.current + 1;
    customerSummaryRequest.current = requestId;

    if (!customerName) {
      if (!isSilent) setIsFetchingData(false);
      return;
    }

    try {
      const res = await fetch(`/api/customer-summary?customer=${encodeURIComponent(customerName)}`, { cache: 'no-store' });
      if (!res.ok) { if (!isSilent) setIsFetchingData(false); return; }

      const data = await res.json();
      if (customerSummaryRequest.current !== requestId) { if (!isSilent) setIsFetchingData(false); return; }

      setForm((prev) => {
        if (prev.customer !== customerName) return prev;
        return {
          ...prev,
          depositedTotal:   String(Number(data.deposited)   || 0),
          depositedBase:    String(Number(data.deposited)   || 0),
          remaining:        String(Number(data.remaining)   || 0),
          due:              String(Number(data.due)         || 0),
          remainingBase:    String(Number(data.remaining)   || 0),
          dueBase:          String(Number(data.due)         || 0),
          totalAmountBase:  String(Number(data.totalAmount) || 0),
        };
      });
    } catch {
      if (customerSummaryRequest.current !== requestId) { if (!isSilent) setIsFetchingData(false); return; }
      setForm((prev) => {
        if (prev.customer !== customerName) return prev;
        return { ...prev, depositedTotal: '0', depositedBase: '0', remaining: '0', due: '0' };
      });
    } finally {
      if (!isSilent) setIsFetchingData(false);
    }
  }, []);

  const fetchCustomers = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsFetchingData(true);
    try {
      const res = await fetch('/api/customers', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.ok || !data.customers) return;

      const incoming = data.customers;
      setCustomerOptions(incoming);

      queueMicrotask(() => {
        setForm((prev) => {
          if (incoming.length === 0) {
            if (prev.customer) customerSummaryRequest.current += 1;
            return { ...prev, customer: '', depositedTotal: '0', depositedBase: '0', deposited: '0', remaining: '0', due: '0', remainingBase: '0', dueBase: '0', totalAmountBase: '0' };
          }
          if (!prev.customer) {
            const first = incoming[0].name;
            queueMicrotask(() => fetchCustomerSummary(first, isSilent));
            return { ...prev, customer: first };
          }
          const exact = incoming.find((c) => c.name.toLowerCase() === prev.customer.toLowerCase());
          if (exact) return prev;

          const byMobile = incoming.find((c) => {
            const a = (c.mobile || '').replace(/\D/g, '');
            const b = (prev.customer || '').replace(/\D/g, '');
            return a && b && (a.includes(b) || b.includes(a));
          });
          const fallback = (byMobile || incoming[0]).name;
          queueMicrotask(() => fetchCustomerSummary(fallback, isSilent));
          customerSummaryRequest.current += 1;
          return { ...prev, customer: fallback, depositedTotal: '0', depositedBase: '0', deposited: '0', remaining: '0', due: '0', remainingBase: '0', dueBase: '0', totalAmountBase: '0', length: '', width: '', height: '', tons: '0', feetPerTon: '0', feet: '0', rate: '', amount: '' };
        });
      });
    } catch { /* silent */ } finally {
      if (!isSilent) setIsFetchingData(false);
    }
  }, [fetchCustomerSummary]);

  const fetchGlobalSummary = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoadingGlobalSummary(true);
    try {
      const res = await fetch('/api/global-summary', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setGlobalSummary({
        globalDeposited: Number(data.globalDeposited) || 0,
        globalRemaining: Number(data.globalRemaining) || 0,
        globalDue:       Number(data.globalDue)       || 0,
      });
    } catch { /* silent */ } finally {
      if (!isSilent) setIsLoadingGlobalSummary(false);
    }
  }, []);

  const refreshAllNow = useCallback(async (isSilent = true) => {
    await Promise.all([
      fetchCustomers(isSilent),
      fetchGlobalSummary(isSilent),
      form.customer ? fetchCustomerSummary(form.customer, isSilent) : Promise.resolve(),
    ]);
    setLastSyncedAt(new Date());
  }, [form.customer, fetchCustomers, fetchGlobalSummary, fetchCustomerSummary]);

  // ── Polling ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoggedIn || !pollingEnabled) {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      return;
    }
    pollingRef.current = setInterval(() => refreshAllNow(true), 5000);
    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
  }, [isLoggedIn, pollingEnabled, refreshAllNow]);

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  // ── Auth ──────────────────────────────────────────────────────────────────

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim() === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
      setIsLoggedIn(true);
      setError('');
      queueMicrotask(() => { fetchNextChallanNo(); fetchCustomers(); fetchGlobalSummary(); });
    } else {
      setError('ভুল ইউজারনেম বা পাসওয়ার্ড দিয়েছেন পুনরায় আবার চেষ্টা করুন');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setError('');
    setStatus('');
  };

  // ── Form calculation ──────────────────────────────────────────────────────

  const handleNumberInput = (fieldName, value) => {
    const sanitized = String(value).replace(/[^\d.০-৯]/g, '');
    setForm((prev) => {
      const next = { ...prev, [fieldName]: sanitized };

      if (feetMode === 'measurement' && ['length', 'width', 'height'].includes(fieldName)) {
        const l = Number(toEnglishNumber(next.length)) || 0;
        const w = Number(toEnglishNumber(next.width))  || 0;
        const h = Number(toEnglishNumber(next.height)) || 0;
        if (l > 0 && w > 0 && h > 0) next.feet = roundMeasurement(l * w * h);
      }

      if (feetMode === 'tons' && ['tons', 'feetPerTon'].includes(fieldName)) {
        const t  = Number(toEnglishNumber(next.tons))      || 0;
        const fp = Number(toEnglishNumber(next.feetPerTon)) || 0;
        if (t > 0 && fp > 0) next.feet = fmtCalc(t * fp);
      }

      const recalcAmount =
        (feetMode === 'tons'        && ['tons', 'feetPerTon', 'rate'].includes(fieldName)) ||
        (feetMode === 'measurement' && ['length', 'width', 'height', 'rate'].includes(fieldName)) ||
        fieldName === 'rate';
      if (recalcAmount) {
        next.amount = fmtCalc((Number(toEnglishNumber(next.feet)) || 0) * (Number(toEnglishNumber(next.rate)) || 0));
      }

      const recalcTruck =
        fieldName === 'truckRatePerFoot' ||
        (feetMode === 'tons'        && ['tons', 'feetPerTon'].includes(fieldName)) ||
        (feetMode === 'measurement' && ['length', 'width', 'height'].includes(fieldName));
      if (recalcTruck) {
        next.truckCharge = fmtCalc((Number(toEnglishNumber(next.feet)) || 0) * (Number(toEnglishNumber(next.truckRatePerFoot)) || 0));
      }

      const recalcBal =
        fieldName === 'deposited' ||
        (feetMode === 'tons'        && ['tons', 'feetPerTon', 'rate'].includes(fieldName)) ||
        (feetMode === 'measurement' && ['length', 'width', 'height', 'rate'].includes(fieldName));
      if (recalcBal) {
        const dep  = Number(toEnglishNumber(next.deposited))    || 0;
        const amt  = Number(toEnglishNumber(next.amount))       || 0;
        const remB = Number(toEnglishNumber(next.remainingBase)) || 0;
        const dueB = Number(toEnglishNumber(next.dueBase))      || 0;
        const { remaining, due } = recalcBalance(remB, dueB, amt, dep);
        next.remaining = String(remaining);
        next.due       = String(due);
        if (fieldName === 'deposited') {
          next.depositedTotal = String((Number(toEnglishNumber(next.depositedBase)) || 0) + dep);
        }
      }
      return next;
    });
  };

  const handleFeetModeChange = (mode) => {
    setFeetMode(mode);
    setForm((prev) => {
      const next = { ...prev };
      if (mode === 'measurement') {
        const l = Number(toEnglishNumber(next.length)) || 0;
        const w = Number(toEnglishNumber(next.width))  || 0;
        const h = Number(toEnglishNumber(next.height)) || 0;
        if (l > 0 && w > 0 && h > 0) next.feet = roundMeasurement(l * w * h);
      } else {
        const t  = Number(toEnglishNumber(next.tons))      || 0;
        const fp = Number(toEnglishNumber(next.feetPerTon)) || 0;
        if (t > 0 && fp > 0) next.feet = fmtCalc(t * fp);
      }
      const feet  = Number(toEnglishNumber(next.feet)) || 0;
      const rate  = Number(toEnglishNumber(next.rate)) || 0;
      next.amount = fmtCalc(feet * rate);
      next.truckCharge = fmtCalc(feet * (Number(toEnglishNumber(next.truckRatePerFoot)) || 0));
      const { remaining, due } = recalcBalance(
        Number(toEnglishNumber(next.remainingBase)) || 0,
        Number(toEnglishNumber(next.dueBase))       || 0,
        Number(toEnglishNumber(next.amount))        || 0,
        Number(toEnglishNumber(next.deposited))     || 0,
      );
      next.remaining = String(remaining);
      next.due       = String(due);
      return next;
    });
  };

  // ── Customer actions ──────────────────────────────────────────────────────

  const handleSelectCustomer = (customerName) => {
    const name = customerName?.trim?.() || '';
    customerSummaryRequest.current += 1;
    setForm((prev) => ({
      ...prev, customer: name,
      depositedTotal: '0', depositedBase: '0', deposited: '0',
      remaining: '0', due: '0', remainingBase: '0', dueBase: '0', totalAmountBase: '0',
      length: '', width: '', height: '', tons: '0', feetPerTon: '0', feet: '0', rate: '', amount: '',
    }));
    fetchCustomerSummary(name);
  };

  const handleOpenSelectedSheet = () => {
    if (!form.customer) return;
    const base = process.env.NEXT_PUBLIC_GOOGLE_SHEET_OPEN_URL || GOOGLE_SHEET_WEB_APP_URL;
    if (!base || base.includes('PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
      setStatus('শিট খুলতে Google Sheet Open URL সেট করতে হবে।'); setError(''); return;
    }
    if (base.includes('docs.google.com/spreadsheets')) {
      const u = new URL(base);
      window.open(u.hash.includes('gid=') ? u.toString() : `${u.origin}${u.pathname}${u.search}`, '_blank', 'noopener,noreferrer');
      return;
    }
    const u = new URL(base);
    u.searchParams.set('action', 'openSheet');
    u.searchParams.set('sheetName', form.customer);
    window.open(u.toString(), '_blank', 'noopener,noreferrer');
  };

  const handleAddCustomer = () => {
    setNewCustomerForm({ name: '', mobile: '', address: '' });
    setShowAddModal(true);
  };

  const handleConfirmAddCustomer = async () => {
    const name = newCustomerForm.name.trim();
    if (!name) return;
    const entry = { name, mobile: newCustomerForm.mobile.trim(), address: newCustomerForm.address.trim() };
    setCustomerOptions((prev) => prev.some((c) => c.name.toLowerCase() === name.toLowerCase()) ? prev : [...prev, entry]);
    setForm((prev) => ({ ...prev, customer: name }));
    setShowAddModal(false);
    setAddedCustomerName(name);
    setShowAddSuccessModal(true);
    try {
      await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addCustomer', ...entry }) });
    } catch { /* silent */ }
    refreshAllNow(false);
  };

  const handleDeleteCustomer = () => { if (form.customer.trim()) setShowDeleteModal(true); };

  const handleConfirmDeleteCustomer = async () => {
    const name = form.customer.trim();
    if (!name) return;
    setShowDeleteModal(false);
    setCustomerOptions((prev) => {
      const next = prev.filter((c) => c.name.toLowerCase() !== name.toLowerCase());
      setForm((f) => ({ ...f, customer: next.length > 0 ? next[0].name : '' }));
      return next;
    });
    try {
      await fetch(`/api/customers?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
    } catch { /* silent */ }
    queueMicrotask(() => refreshAllNow(false));
  };

  // ── Deposit only ──────────────────────────────────────────────────────────

  const handleDepositOnly = async () => {
    const customer = form.customer.trim();
    const deposited = Number(toEnglishNumber(depositAmount)) || 0;
    if (!customer) { setError('গ্রাহকের নাম নির্বাচন করুন।'); return; }
    if (deposited <= 0) { setError('সঠিক পরিমাণ দিন।'); return; }

    setIsSubmitting(true); setError(''); setStatus('');
    const obj = customerOptions.find((c) => c.name.toLowerCase() === customer.toLowerCase());
    try {
      const res = await fetch('/api/sales-submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'depositOnly', date: form.date, customer, sheetName: customer, mobile: obj?.mobile || '', address: obj?.address || '', deposited }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setDepositAmount('');
      setShowDepositModal(false);
      setDepositSuccessAmount(deposited);
      setShowDepositSuccess(true);
      await refreshAllNow(false);
    } catch (err) {
      setError(`জমা দেওয়া সম্ভব হয়নি। ${err?.message || ''}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Add previous due ─────────────────────────────────────────────────────

  const handleAddPreviousDue = async () => {
    const customer = form.customer.trim();
    const amount = Number(toEnglishNumber(previousDueAmount)) || 0;
    if (!customer) { setError('গ্রাহকের নাম নির্বাচন করুন।'); return; }
    if (amount <= 0) { setError('সঠিক পরিমাণ দিন।'); return; }

    setIsSubmitting(true); setError(''); setStatus('');
    const obj = customerOptions.find((c) => c.name.toLowerCase() === customer.toLowerCase());
    try {
      const res = await fetch('/api/sales-submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'previousDue',
          date: form.date,
          customer,
          sheetName: customer,
          mobile: obj?.mobile || '',
          address: obj?.address || '',
          previousDue: amount,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setPreviousDueAmount('');
      setShowPreviousDueModal(false);
      setPreviousDueSuccessAmount(amount);
      setShowPreviousDueSuccess(true);
      await refreshAllNow(false);
    } catch (err) {
      setError(`পাওয়ানা যোগ করা সম্ভব হয়নি। ${err?.message || ''}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Sale submit ───────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    const customer = form.customer.trim();
    if (!customer) { setError('গ্রাহকের নাম নির্বাচন করুন।'); setStatus(''); return; }
    if (GOOGLE_SHEET_WEB_APP_URL === 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
      setError('Google Sheet Web App URL কনফিগার করুন।'); setStatus(''); return;
    }

    const length = Number(toEnglishNumber(form.length)) || 0;
    const width  = Number(toEnglishNumber(form.width))  || 0;
    const height = Number(toEnglishNumber(form.height)) || 0;
    const tons      = Number(toEnglishNumber(form.tons))      || 0;
    const feetPerTon = Number(toEnglishNumber(form.feetPerTon)) || 0;
    let feet = 0;
    if (length > 0 && width > 0 && height > 0) { feet = Math.round(length * width * height); }
    else if (tons > 0 && feetPerTon > 0)         { feet = tons * feetPerTon; }

    const rate     = Number(toEnglishNumber(form.rate))          || 0;
    const amount   = feet * rate;
    const deposited = Number(toEnglishNumber(form.deposited))    || 0;
    const { remaining, due } = recalcBalance(
      Number(toEnglishNumber(form.remainingBase)) || 0,
      Number(toEnglishNumber(form.dueBase))       || 0,
      amount, deposited,
    );
    const challanNo = form.challanNo.trim();
    const obj = customerOptions.find((c) => c.name.toLowerCase() === customer.toLowerCase());

    setIsSubmitting(true); setStatus(''); setError('');
    try {
      const vehicleMeasurementFeet = feetMode === 'measurement' && length > 0 && width > 0 && height > 0 ? Math.round(length * width * height) : '';
      const payload = {
        date: form.date, business: form.business.trim(), sheetName: customer, customer,
        mobile: obj?.mobile || '', address: obj?.address || '',
        vehicle: form.vehicle.trim(), description: form.description.trim(), feetMode,
        length: feetMode === 'measurement' ? length : '',
        width:  feetMode === 'measurement' ? width  : '',
        height: feetMode === 'measurement' ? height : '',
        vehicleMeasurementFeet, feet, rate, amount, deposited, remaining, due,
        tons:       feetMode === 'tons' ? tons       : '',
        feetPerTon: feetMode === 'tons' ? feetPerTon : '',
        challanNo, createdAt: new Date().toISOString(),
      };

      const res = await fetch('/api/sales-submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error((body?.error) || `HTTP ${res.status}`);

      let actualChallan = challanNo;
      const pg = body?.parsed;
      if (pg?.challanNo != null) actualChallan = String(pg.challanNo);
      else if (body?.response) { try { const p = JSON.parse(body.response); if (p?.challanNo) actualChallan = String(p.challanNo); } catch { /* noop */ } }

      const nextChallan = (parseInt(actualChallan, 10) || DEFAULT_INITIAL_CHALLAN) + 1;
      setLastSlip({ ...payload, challanNo: actualChallan, driverName: form.driverName.trim(), driverMobile: form.driverMobile.trim(), destination: form.destination.trim(), truckRatePerFoot: Number(toEnglishNumber(form.truckRatePerFoot)) || 0, truckCharge: feet * (Number(toEnglishNumber(form.truckRatePerFoot)) || 0) });
      setShowSlipModal(true);
      setStatus(`বিক্রয় হিসাব (চালান নং: ${actualChallan}) Google Sheet-এ সফলভাবে যোগ হয়েছে।`);
      setError('');
      setForm({ ...getInitialForm(), customer, challanNo: String(nextChallan) });
      await refreshAllNow(false);

      // UI reset ও sheet sync-এর পরে background-এ localStorage history সেভ করি
      setTimeout(() => {
        saveMultipleToHistory([
          { key: 'description',      value: form.description },
          { key: 'vehicle',          value: form.vehicle },
          { key: 'driverName',       value: form.driverName },
          { key: 'driverMobile',     value: form.driverMobile },
          { key: 'destination',      value: form.destination },
          { key: 'rate',             value: form.rate },
          { key: 'truckRatePerFoot', value: form.truckRatePerFoot },
          { key: 'tons',             value: form.tons },
          { key: 'feetPerTon',       value: form.feetPerTon },
          { key: 'deposited',        value: form.deposited },
        ]);
      }, 0);
    } catch (err) {
      const msg = err?.message || '';
      setError(msg ? `Google Sheet-এ ডাটা পাঠানো সম্ভব হয়নি। ${msg}` : 'Google Sheet-এ ডাটা পাঠানো সম্ভব হয়নি।');
      setStatus('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Slip print ────────────────────────────────────────────────────────────

  const handleDownloadSlip = () => {
    if (!lastSlip) return;
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) return;

    const fmt  = (n) => Number(n || 0).toLocaleString('bn-BD');
    const fmtM = (n) => '৳ ' + fmt(n);
    const fmtPhone = (v) => {
      if (!v || v === '—') return v || '—';
      const s = String(v).trim();
      return /^\d/.test(s) && !s.startsWith('0') ? '0' + s : s;
    };
    const date        = lastSlip.date ? lastSlip.date.split('-').reverse().join('-') : '—';
    const slipFeetMode = lastSlip.feetMode || 'tons';

    const measureRow = slipFeetMode === 'measurement'
      ? `<tr><th>মালের পরিমাণ</th><td colspan="3"><span class="formula-row"><span class="fl">দৈর্ঘ্য</span><span class="fv">${fmt(lastSlip.length)}</span><span class="fsym">×</span><span class="fl">প্রস্থ</span><span class="fv">${fmt(lastSlip.width)}</span><span class="fsym">×</span><span class="fl">উচ্চতা</span><span class="fv">${fmt(lastSlip.height)}</span><span class="fsym">=</span><span class="fl">মোট ফুট</span><span class="fv bold">${fmt(lastSlip.feet)}</span></span></td></tr>`
      : `<tr><th>মালের পরিমাণ</th><td colspan="3"><span class="formula-row"><span class="fl">টন</span><span class="fv">${fmt(lastSlip.tons)}</span><span class="fsym">×</span><span class="fl">গুণ</span><span class="fv">${fmt(lastSlip.feetPerTon)}</span><span class="fsym">=</span><span class="fl">মোট ফুট</span><span class="fv bold">${fmt(lastSlip.feet)}</span></span></td></tr>`;

    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>চালান নং ${lastSlip.challanNo}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700;800&family=Manrope:wght@400;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body{font-family:'Hind Siliguri','Noto Sans Bengali',Arial,sans-serif;color:#111827;background:#e5e7eb}
.page{width:210mm;min-height:297mm;margin:10px auto;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,.12);display:flex;flex-direction:column}
.slip{flex:1;padding:8mm 10mm;display:flex;flex-direction:column;gap:8px;min-height:297mm}
.slip-header{display:flex;align-items:flex-start;gap:10px;padding-bottom:5px}
.header-left{flex-shrink:0;padding-top:4px}
.header-center{flex:1;text-align:center;min-width:0}
.header-right{flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end}
.mst-logo{width:70px;height:70px;border:3px solid #000;border-radius:50%;display:grid;place-items:center;font-family:Georgia,serif;font-weight:700;font-size:20px}
.bn-company{font-size:28px;font-weight:800;white-space:nowrap;margin:0 0 2px}
.en-company{font-family:'Manrope',Arial,sans-serif;font-size:22px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;white-space:nowrap}
.tagline{font-size:13.5px;margin:4px 0 5px;white-space:nowrap;letter-spacing:-.3px}
.contact-bar{display:inline-flex;align-items:center;gap:8px;background:#000;color:#fff;padding:6px 18px;border-radius:999px;font-size:15px;font-weight:600;font-family:'Manrope','Hind Siliguri',sans-serif}
.contact-bar .sep{opacity:.4}
.challan-box{border:3px solid #000;border-radius:6px;padding:5px 16px;text-align:center;background:#fff}
.challan-label{display:block;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.challan-no{display:block;font-size:28px;font-weight:800}
.challan-date{display:block;font-size:14px;font-weight:800;margin-top:8px;padding-top:6px;border-top:1.5px solid #000;font-family:'Manrope',sans-serif;letter-spacing:.3px}
.office-bars{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.office-bar{background:#000;color:#fff;padding:6px 10px;font-size:15px;font-weight:600;border-radius:4px;text-align:center}
.divider-line{height:3px;background:#000;margin:2px 0}
.info-table{width:100%;flex:1;border-collapse:collapse;border:3px solid #000}
.info-table th,.info-table td{padding:14px 16px;font-size:17px;line-height:1.5;border:2px solid #000;vertical-align:middle;font-family:'Hind Siliguri','Noto Sans Bengali',Arial,sans-serif;background:#fff}
.info-table th{background:#f0f0f0;font-weight:800;text-align:left;white-space:nowrap;width:20%}
.info-table tr:nth-child(even) th{background:#e0e0e0}
.info-table tr:nth-child(even) td{background:#fafafa}
.info-table tr.amount-row th{background:#d0d0d0;font-size:18px}
.info-table tr.amount-row td{background:#f5f5f5}
.info-table tr.truck-row th{background:#d0d0d0}
.bold{font-weight:800}
.formula-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.fl{font-size:13px;color:#444;font-weight:800;font-family:'Manrope',sans-serif}
.fv{font-size:17px;font-weight:700;font-family:'Manrope',sans-serif}
.fsym{font-size:22px;font-weight:700;font-family:'Manrope',sans-serif}
.big-amount{font-size:24px;font-weight:800;font-family:'Manrope',sans-serif}
.truck-total{font-size:22px;font-weight:800;font-family:'Manrope',sans-serif}
.sig-row{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;padding-top:55px}
.sig-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px}
.sig-line{width:100%;border-top:2px solid #000}
.sig-label{font-size:14px;font-weight:700;text-align:center;font-family:'Hind Siliguri',sans-serif}
.spacer{flex:1;min-height:45mm}
.footer-banner{display:flex;justify-content:space-between;background:#000;color:#fff;padding:10px 20px;border-radius:5px;font-size:15px;font-weight:700;font-family:'Hind Siliguri','Manrope',sans-serif}
@media print{@page{size:A4 portrait;margin:0}html,body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.page{margin:0;box-shadow:none;width:210mm;min-height:297mm}}
</style></head><body><div class="page"><div class="slip">
<div class="slip-header">
  <div class="header-left"><div class="mst-logo">MST</div></div>
  <div class="header-center">
    <h1 class="bn-company">মেসার্স সাইফুল ট্রেডার্স এন্ড স্টোন ক্রাশার</h1>
    <h2 class="en-company">M/S SAIFUL TRADERS &amp; STONE CRUSHER</h2>
    <p class="tagline">সাদা এলসি, কালো এলসি, কয়লা সহ সর্বপ্রকার ভাঙ্গা পাথর ও বালুর নির্ভরযোগ্য প্রতিষ্ঠান</p>
    <div class="contact-bar"><span>প্রোঃ জাকির হোসেন মেয়াজী</span><span class="sep">|</span><span>মোবা: 01711-662074, 01834-863675</span></div>
  </div>
  <div class="header-right">
    <div class="challan-box">
      <span class="challan-label">চালান নং</span>
      <span class="challan-no">${lastSlip.challanNo || '—'}</span>
      <span class="challan-date">${date}</span>
    </div>
  </div>
</div>
<div class="office-bars"><div class="office-bar">হেড অফিস: তামাবিল, গোয়াইনঘাট, সিলেট।</div><div class="office-bar">শাখা অফিস: সুতারকান্দি, সিলেট।</div></div>
<div class="divider-line"></div>
<table class="info-table"><tbody>
<tr><th>গ্রাহকের নাম</th><td colspan="3" class="bold">${lastSlip.customer || '—'}</td></tr>
<tr><th>ঠিকানা</th><td colspan="3" class="bold">${lastSlip.address || '—'}</td></tr>
<tr><th>ড্রাইভারের নাম</th><td class="bold">${lastSlip.driverName || '—'}</td><th>ড্রাইভারের মোবাইল</th><td class="bold">${fmtPhone(lastSlip.driverMobile)}</td></tr>
<tr><th>গাড়ি নাং</th><td class="bold">${lastSlip.vehicle || '—'}</td><th>গন্তব্য স্থান</th><td class="bold">${lastSlip.destination || '—'}</td></tr>
<tr><th>মালের বিবরণ</th><td colspan="3" class="bold">${lastSlip.description || '—'}</td></tr>
${measureRow}
<tr class="amount-row"><th>মোট টাকা</th><td colspan="3"><span class="formula-row"><span class="fl">ফুট</span><span class="fv">${fmt(lastSlip.feet)}</span><span class="fsym">×</span><span class="fl">দর</span><span class="fv">${fmtM(lastSlip.rate)}</span><span class="fsym">=</span><span class="big-amount">${fmtM(lastSlip.amount)}</span></span></td></tr>
<tr class="truck-row"><th>গাড়ি ভাড়া</th><td colspan="3"><span class="formula-row"><span class="fl">ফুট</span><span class="fv">${fmt(lastSlip.feet)}</span><span class="fsym">×</span><span class="fl">ভাড়া/ফুট</span><span class="fv">${lastSlip.truckRatePerFoot ? fmtM(lastSlip.truckRatePerFoot) : '—'}</span><span class="fsym">=</span><span class="truck-total">${lastSlip.truckCharge ? fmtM(lastSlip.truckCharge) : '—'}</span></span></td></tr>
</tbody></table>
<div class="sig-row"><div class="sig-col"><span class="sig-line"></span><span class="sig-label">ড্রাইভারের স্বাক্ষর</span></div><div class="sig-col"><span class="sig-line"></span><span class="sig-label">ক্রেতার স্বাক্ষর</span></div><div class="sig-col"><span class="sig-line"></span><span class="sig-label">পক্ষে: মেসার্স সাইফুল ট্রেডার্স</span></div></div>
<div class="spacer"></div>
<div class="footer-banner"><span>সততা ব্যবসার মূলধন</span><span>ধন্যবাদ আবার আসবেন</span></div>
</div></div></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 800);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const filteredCustomerOptions = customerOptions.filter((opt) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase().trim();
    return opt.name.toLowerCase().includes(q) || opt.mobile.toLowerCase().includes(q) || opt.address.toLowerCase().includes(q);
  });

  const selectedCustomerObj = customerOptions.find((c) => c.name === form.customer) || null;

  return {
    // auth
    username, setUsername, password, setPassword, isLoggedIn,
    handleLogin, handleLogout,
    // status
    error, setError, status, setStatus, isSubmitting, isFetchingData,
    // form
    form, setForm, feetMode,
    handleNumberInput, handleFeetModeChange, handleSubmit,
    // sync
    pollingEnabled, setPollingEnabled, lastSyncedAt, isLoadingGlobalSummary,
    refreshAllNow,
    // customers
    customerOptions, customerSearch, setCustomerSearch,
    filteredCustomerOptions, selectedCustomerObj,
    handleSelectCustomer, handleOpenSelectedSheet,
    handleAddCustomer, handleConfirmAddCustomer,
    handleDeleteCustomer, handleConfirmDeleteCustomer,
    newCustomerForm, setNewCustomerForm,
    // summary
    globalSummary,
    // modals
    showAddModal, setShowAddModal,
    showDeleteModal, setShowDeleteModal,
    showAddSuccessModal, setShowAddSuccessModal, addedCustomerName,
    showSlipModal, setShowSlipModal,
    showDepositModal, setShowDepositModal,
    depositAmount, setDepositAmount,
    showDepositSuccess, setShowDepositSuccess, depositSuccessAmount,
    handleDepositOnly,
    showPreviousDueModal, setShowPreviousDueModal,
    previousDueAmount, setPreviousDueAmount,
    handleAddPreviousDue,
    showPreviousDueSuccess, setShowPreviousDueSuccess, previousDueSuccessAmount,
    // slip
    lastSlip, setLastSlip, handleDownloadSlip,
  };
}
