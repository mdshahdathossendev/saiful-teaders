'use client';

import LoadingSpinner from '../../components/LoadingSpinner';
import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_USERNAME = 'সাইফুল';
const DEFAULT_PASSWORD = 'সাইফুল১২৩';
const GOOGLE_SHEET_WEB_APP_URL =
  process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEB_APP_URL ||
  'https://script.google.com/macros/s/AKfycbxzDZw5dBghxj0YWWWwgOaW5fdpoZ1gn_TjqZMxBUatahTySkV5dzIr5I8Js8qon2Mh6g/exec';

const BUSINESS_OPTIONS = [
  'সাইফুল ট্রেডার্স ১',
  'সাইফুল ট্রেডার্স ২',
  'সাইফুল ট্রেডার্স ৩',
  'সাইফুল ট্রেডার্স ৪',
  'সাইফুল ট্রেডার্স ৫',
];



const DEFAULT_INITIAL_CHALLAN = 5000;

const getAmountSizeClass = (rawValue) => {
  const str = String(Number(rawValue || 0).toLocaleString('bn-BD'));
  const len = str.length;
  if (len >= 14) return 'size-14';
  if (len >= 12) return 'size-12';
  if (len >= 10) return 'size-10';
  if (len >= 8) return 'size-8';
  return '';
};

// দশমিক হলে ২ ঘর, নইলে পূর্ণসংখ্যা
const fmtCalc = (n) => {
  if (!isFinite(n) || n === 0) return '0';
  const fixed = parseFloat(n.toFixed(2));
  return String(fixed);
};

const getInitialForm = () => ({
  date: new Date().toISOString().split('T')[0],
  business: '',
  customer: '',
  vehicle: '',
  description: '',
  driverName: '',
  driverMobile: '',
  destination: '',
  length: '',
  width: '',
  height: '',
  feet: '0',
  rate: '',
  amount: '',
  truckRatePerFoot: '',
  truckCharge: '0',
  depositedTotal: '0',
  depositedBase: '0',
  deposited: '0',
  remaining: '0',
  due: '0',
  remainingBase: '0',
  dueBase: '0',
  totalAmountBase: '0',
  tons: '',
  feetPerTon: '',
  challanNo: 'লোড হচ্ছে...',
});

const LocationPinIcon = ({ className = '', size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`location-svg-icon ${className}`}
    aria-hidden="true"
    style={{ display: 'inline-block', verticalAlign: '-0.15em', flexShrink: 0 }}
  >
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </svg>
);

export default function ProjectDashboardPage() {
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
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [lastSlip, setLastSlip] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', mobile: '', address: '' });
  const customerSummaryRequest = useRef(0);
  const [globalSummary, setGlobalSummary] = useState({
    globalDeposited: 0,
    globalRemaining: 0,
    globalDue: 0,
  });
  const [isLoadingGlobalSummary, setIsLoadingGlobalSummary] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const pollingRef = useRef(null);

  const fetchNextChallanNo = async () => {
    setIsFetchingData(true);
    try {
      const response = await fetch('/api/next-challan');
      if (!response.ok) return;
      const data = await response.json();
      if (data && data.nextChallanNo) {
        setForm((prev) => ({ ...prev, challanNo: String(data.nextChallanNo) }));
      }
    } catch (error) {
      setForm((prev) => ({ ...prev, challanNo: '' }));
    } finally {
      setIsFetchingData(false);
    }
  };

  const fetchCustomers = async (isSilent = false) => {
    if (!isSilent) setIsFetchingData(true);
    try {
      const response = await fetch('/api/customers', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.customers) {
          const incoming = data.customers;
          setCustomerOptions(incoming);
          queueMicrotask(() => {
            setForm((prev) => {
              if (incoming.length === 0) {
                if (prev.customer) {
                  customerSummaryRequest.current += 1;
                }
                return {
                  ...prev,
                  customer: '',
                  depositedTotal: '0',
                  depositedBase: '0',
                  deposited: '0',
                  remaining: '0',
                  due: '0',
                  remainingBase: '0',
                  dueBase: '0',
                  totalAmountBase: '0',
                };
              }

              if (!prev.customer) {
                const firstCustomer = incoming[0].name;
                queueMicrotask(() => fetchCustomerSummary(firstCustomer, isSilent));
                return { ...prev, customer: firstCustomer };
              }

              const exactMatch = incoming.find(
                (c) => c.name.toLowerCase() === prev.customer.toLowerCase()
              );
              if (exactMatch) {
                return prev;
              }

              const matchedByMobile = incoming.find((c) => {
                const a = (c.mobile || '').replace(/\D/g, '');
                const b = (prev.customer || '').replace(/\D/g, '');
                return a && b && (a.includes(b) || b.includes(a));
              });
              const fallback = matchedByMobile || incoming[0];
              const fallbackName = fallback.name;

              queueMicrotask(() => fetchCustomerSummary(fallbackName, isSilent));

              customerSummaryRequest.current += 1;
              return {
                ...prev,
                customer: fallbackName,
                depositedTotal: '0',
                depositedBase: '0',
                deposited: '0',
                remaining: '0',
                due: '0',
                remainingBase: '0',
                dueBase: '0',
                totalAmountBase: '0',
                length: '',
                width: '',
                height: '',
                tons: '0',
                feetPerTon: '0',
                feet: '0',
                rate: '',
                amount: '',
              };
            });
          });
        }
      }
    } catch (e) {}
    if (!isSilent) setIsFetchingData(false);
  };

  const fetchGlobalSummary = async (isSilent = false) => {
    if (!isSilent) setIsLoadingGlobalSummary(true);
    try {
      const response = await fetch('/api/global-summary', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setGlobalSummary({
          globalDeposited: Number(data.globalDeposited) || 0,
          globalRemaining: Number(data.globalRemaining) || 0,
          globalDue: Number(data.globalDue) || 0,
        });
      }
    } catch (e) {}
    if (!isSilent) setIsLoadingGlobalSummary(false);
  };

  const fetchCustomerSummary = async (customerName, isSilent = false) => {
    if (!isSilent) setIsFetchingData(true);
    const requestId = customerSummaryRequest.current + 1;
    customerSummaryRequest.current = requestId;

    if (!customerName) {
      if (!isSilent) setIsFetchingData(false);
      return;
    }

    try {
      const response = await fetch(`/api/customer-summary?customer=${encodeURIComponent(customerName)}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        if (!isSilent) setIsFetchingData(false);
        return;
      }

      const data = await response.json();
      if (customerSummaryRequest.current !== requestId) {
        if (!isSilent) setIsFetchingData(false);
        return;
      }

      setForm((previousForm) => {
        if (previousForm.customer !== customerName) {
          return previousForm;
        }

        return {
          ...previousForm,
          depositedTotal: String(Number(data.deposited) || 0),
          depositedBase: String(Number(data.deposited) || 0),
          remaining: String(Number(data.remaining) || 0),
          due: String(Number(data.due) || 0),
          remainingBase: String(Number(data.remaining) || 0),
          dueBase: String(Number(data.due) || 0),
          totalAmountBase: String(Number(data.totalAmount) || 0),
        };
      });
    } catch (error) {
      if (customerSummaryRequest.current !== requestId) {
        if (!isSilent) setIsFetchingData(false);
        return;
      }

      setForm((previousForm) => {
        if (previousForm.customer !== customerName) {
          return previousForm;
        }

        return {
          ...previousForm,
          depositedTotal: '0',
          depositedBase: '0',
          remaining: '0',
          due: '0',
        };
      });
    } finally {
      if (!isSilent) setIsFetchingData(false);
    }
  };

  const handleLogin = (event) => {
    event.preventDefault();

    if (username.trim() === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
      setIsLoggedIn(true);
      setError('');
      setStatus('');
      queueMicrotask(() => {
        fetchNextChallanNo();
        fetchCustomers();
        fetchGlobalSummary();
      });
      return;
    }

    setError('ভুল ইউজারনেম বা পাসওয়ার্ড দিয়েছেন পুনরায় আবার চেষ্টা করুন');
  };

  const refreshAllNow = useCallback(
    async (isSilent = true) => {
      await Promise.all([
        fetchCustomers(isSilent),
        fetchGlobalSummary(isSilent),
        form.customer ? fetchCustomerSummary(form.customer, isSilent) : Promise.resolve(),
      ]);
      setLastSyncedAt(new Date());
    },
    [form.customer, fetchCustomers, fetchGlobalSummary, fetchCustomerSummary]
  );

  useEffect(() => {
    if (!isLoggedIn) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    if (!pollingEnabled) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    pollingRef.current = setInterval(() => {
      refreshAllNow(true);
    }, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isLoggedIn, pollingEnabled, refreshAllNow]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  const toEnglishNumber = (value) => {
    const banglaDigits = {
      '০': '0',
      '১': '1',
      '২': '2',
      '৩': '3',
      '৪': '4',
      '৫': '5',
      '৬': '6',
      '৭': '7',
      '৮': '8',
      '৯': '9',
    };

    return String(value ?? '').replace(/[০-৯]/g, (digit) => banglaDigits[digit] || digit);
  };

  /**
   * নতুন sale এর পর remaining ও due হিসাব করে।
   *
   * নিয়ম:
   *  ১. নতুন টাকা (amount) আগে পুরনো অবশিষ্ট (remainingBase) থেকে বাদ যাবে।
   *  ২. অবশিষ্ট কম হলে বাকি টাকা পাওনায় (dueBase-তে) যোগ হবে।
   *  ৩. তারপর নতুন জমা (deposited) দিয়ে পাওনা / অবশিষ্ট আপডেট হবে।
   */
  const recalcBalance = (remainingBase, dueBase, amount, deposited) => {
    // ধাপ ১ — নতুন বিক্রি
    const afterSale = remainingBase - amount;
    let rem = Math.max(afterSale, 0);
    let due = dueBase + Math.max(-afterSale, 0);

    // ধাপ ২ — নতুন জমা
    const afterDeposit = rem + deposited - due;
    if (afterDeposit >= 0) {
      rem = afterDeposit;
      due = 0;
    } else {
      rem = 0;
      due = -afterDeposit;
    }

    return { remaining: rem, due };
  };

  const handleNumberInput = (fieldName, value) => {
    const sanitizedValue = String(value)
      .replace(/[^\d.০-৯]/g, '')
      .replace(/[০-৯]/g, (digit) => digit);

    setForm((previousForm) => {
      const nextForm = {
        ...previousForm,
        [fieldName]: sanitizedValue,
      };

      if (
        feetMode === 'measurement' &&
        (fieldName === 'length' || fieldName === 'width' || fieldName === 'height')
      ) {
        const length = Number(toEnglishNumber(nextForm.length)) || 0;
        const width = Number(toEnglishNumber(nextForm.width)) || 0;
        const height = Number(toEnglishNumber(nextForm.height)) || 0;
        if (length > 0 && width > 0 && height > 0) {
          nextForm.feet = fmtCalc(length * width * height);
        }
      }

      if (
        feetMode === 'tons' &&
        (fieldName === 'tons' || fieldName === 'feetPerTon')
      ) {
        const tons = Number(toEnglishNumber(nextForm.tons)) || 0;
        const feetPerTon = Number(toEnglishNumber(nextForm.feetPerTon)) || 0;
        if (tons > 0 && feetPerTon > 0) {
          nextForm.feet = fmtCalc(tons * feetPerTon);
        }
      }

      if (
        (feetMode === 'tons' && (fieldName === 'tons' || fieldName === 'feetPerTon' || fieldName === 'rate')) ||
        (feetMode === 'measurement' && (fieldName === 'length' || fieldName === 'width' || fieldName === 'height' || fieldName === 'rate')) ||
        fieldName === 'rate'
      ) {
        const feet = Number(toEnglishNumber(nextForm.feet)) || 0;
        const rate = Number(toEnglishNumber(nextForm.rate)) || 0;
        nextForm.amount = fmtCalc(feet * rate);
      }

      // গাড়ি ভাড়া: feet × truckRatePerFoot
      if (
        fieldName === 'truckRatePerFoot' ||
        (feetMode === 'tons' && (fieldName === 'tons' || fieldName === 'feetPerTon')) ||
        (feetMode === 'measurement' && (fieldName === 'length' || fieldName === 'width' || fieldName === 'height'))
      ) {
        const feet = Number(toEnglishNumber(nextForm.feet)) || 0;
        const truckRate = Number(toEnglishNumber(nextForm.truckRatePerFoot)) || 0;
        nextForm.truckCharge = fmtCalc(feet * truckRate);
      }

      if (
        fieldName === 'deposited' ||
        (feetMode === 'tons' && (fieldName === 'tons' || fieldName === 'feetPerTon' || fieldName === 'rate')) ||
        (feetMode === 'measurement' && (fieldName === 'length' || fieldName === 'width' || fieldName === 'height' || fieldName === 'rate'))
      ) {
        const deposited = Number(toEnglishNumber(nextForm.deposited)) || 0;
        const amount = Number(toEnglishNumber(nextForm.amount)) || 0;
        const remainingBase = Number(toEnglishNumber(nextForm.remainingBase)) || 0;
        const dueBase = Number(toEnglishNumber(nextForm.dueBase)) || 0;
        const { remaining, due } = recalcBalance(remainingBase, dueBase, amount, deposited);
        nextForm.remaining = String(remaining);
        nextForm.due = String(due);
        if (fieldName === 'deposited') {
          const depositedBase = Number(toEnglishNumber(nextForm.depositedBase)) || 0;
          nextForm.depositedTotal = String(depositedBase + deposited);
        }
      }

      return nextForm;
    });
  };

  const handleFeetModeChange = (mode) => {
    setFeetMode(mode);
    setForm((previousForm) => {
      const nextForm = { ...previousForm };
      if (mode === 'measurement') {
        const length = Number(toEnglishNumber(nextForm.length)) || 0;
        const width = Number(toEnglishNumber(nextForm.width)) || 0;
        const height = Number(toEnglishNumber(nextForm.height)) || 0;
        if (length > 0 && width > 0 && height > 0) {
          nextForm.feet = fmtCalc(length * width * height);
        }
      } else {
        const tons = Number(toEnglishNumber(nextForm.tons)) || 0;
        const feetPerTon = Number(toEnglishNumber(nextForm.feetPerTon)) || 0;
        if (tons > 0 && feetPerTon > 0) {
          nextForm.feet = fmtCalc(tons * feetPerTon);
        }
      }
      const feet = Number(toEnglishNumber(nextForm.feet)) || 0;
      const rate = Number(toEnglishNumber(nextForm.rate)) || 0;
      nextForm.amount = fmtCalc(feet * rate);
      const truckRate = Number(toEnglishNumber(nextForm.truckRatePerFoot)) || 0;
      nextForm.truckCharge = fmtCalc(feet * truckRate);
      const deposited = Number(toEnglishNumber(nextForm.deposited)) || 0;
      const amount = Number(toEnglishNumber(nextForm.amount)) || 0;
      const remainingBase = Number(toEnglishNumber(nextForm.remainingBase)) || 0;
      const dueBase = Number(toEnglishNumber(nextForm.dueBase)) || 0;
      const { remaining, due } = recalcBalance(remainingBase, dueBase, amount, deposited);
      nextForm.remaining = String(remaining);
      nextForm.due = String(due);
      return nextForm;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const business = (form.business || '').trim();
    const customer = (form.customer || '').trim();
    const vehicle = (form.vehicle || '').trim();
    const description = (form.description || '').trim();
    const driverName = (form.driverName || '').trim();
    const driverMobile = (form.driverMobile || '').trim();
    const destination = (form.destination || '').trim();
    const length = Number(toEnglishNumber(form.length)) || 0;
    const width = Number(toEnglishNumber(form.width)) || 0;
    const height = Number(toEnglishNumber(form.height)) || 0;
    const tons = Number(toEnglishNumber(form.tons)) || 0;
    const feetPerTon = Number(toEnglishNumber(form.feetPerTon)) || 0;
    let feet = 0;
    if (length > 0 && width > 0 && height > 0) {
      feet = length * width * height;
    } else if (tons > 0 && feetPerTon > 0) {
      feet = tons * feetPerTon;
    }
    const rate = Number(toEnglishNumber(form.rate)) || 0;
    const amount = feet * rate;
    const truckRatePerFoot = Number(toEnglishNumber(form.truckRatePerFoot)) || 0;
    const deposited = Number(toEnglishNumber(form.deposited)) || 0;
    const remainingBase = Number(toEnglishNumber(form.remainingBase)) || 0;
    const dueBase = Number(toEnglishNumber(form.dueBase)) || 0;
    const { remaining, due } = recalcBalance(remainingBase, dueBase, amount, deposited);
    const challanNo = (form.challanNo || '').trim();

    if (GOOGLE_SHEET_WEB_APP_URL === 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
      setError('Google Sheet Web App URL কনফিগার করুন। .env.local-এ NEXT_PUBLIC_GOOGLE_SHEET_WEB_APP_URL সেট করুন।');
      setStatus('');
      return;
    }

    if (!customer) {
      setError('গ্রাহকের নাম নির্বাচন করুন।');
      setStatus('');
      return;
    }

    setIsSubmitting(true);
    setStatus('');
    setError('');

    const currentCustomerObj = customerOptions.find(
      (c) => c.name.toLowerCase() === customer.toLowerCase()
    );
    const mobile = currentCustomerObj?.mobile || '';
    const address = currentCustomerObj?.address || '';

    let errorDetail = '';

    try {
    const outLength = feetMode === 'measurement' ? length : '';
      const outWidth = feetMode === 'measurement' ? width : '';
      const outHeight = feetMode === 'measurement' ? height : '';
      const outTons = feetMode === 'tons' ? tons : '';
      const outFeetPerTon = feetMode === 'tons' ? feetPerTon : '';
      const vehicleMeasurementFeet =
        feetMode === 'measurement' && length > 0 && width > 0 && height > 0
          ? length * width * height
          : '';

      const payload = {
        date: form.date,
        business,
        sheetName: customer,
        customer,
        mobile,
        address,
        vehicle,
        description,
        feetMode,
        length: outLength,
        width: outWidth,
        height: outHeight,
        vehicleMeasurementFeet,
        feet,
        rate,
        amount,
        deposited,
        remaining,
        due,
        tons: outTons,
        feetPerTon: outFeetPerTon,
        challanNo,
        createdAt: new Date().toISOString(),
      };

      const response = await fetch('/api/sales-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let responseBody = null;
      try {
        responseBody = await response.json();
      } catch (_) {
        responseBody = null;
      }

      if (!response.ok) {
        const msgFromBody =
          responseBody && typeof responseBody.error === 'string'
            ? responseBody.error
            : '';
        errorDetail =
          msgFromBody ||
          `HTTP ${response.status}: Google Sheet অনুরোধ প্রত্যাখ্যান করেছে।`;
        throw new Error(errorDetail);
      }

      const submitResult = responseBody || {};

      let actualChallanNo = challanNo;

      const parsedGAS = submitResult.parsed;
      if (parsedGAS && typeof parsedGAS.challanNo !== 'undefined') {
        actualChallanNo = String(parsedGAS.challanNo);
      } else if (submitResult.response) {
        try {
          const parsed = JSON.parse(submitResult.response);
          if (parsed && parsed.challanNo) {
            actualChallanNo = String(parsed.challanNo);
          }
        } catch (_) {}
      }

      const currentChallanNum = parseInt(actualChallanNo, 10) || DEFAULT_INITIAL_CHALLAN;
      const nextChallanNum = currentChallanNum + 1;

      setLastSlip({
        ...payload,
        challanNo: actualChallanNo,
        vehicle,
        driverName,
        driverMobile,
        destination,
        truckRatePerFoot,
        truckCharge: feet * truckRatePerFoot,
      });
      setStatus(`বিক্রয় হিসাব (চালান নং: ${actualChallanNo}) Google Sheet-এ সফলভাবে যোগ হয়েছে।`);
      setError('');
      setForm({
        ...getInitialForm(),
        customer,
        challanNo: String(nextChallanNum),
      });
      await refreshAllNow(false);
    } catch (submitError) {
      const msg = submitError?.message || String(submitError || '');
      const finalMsg = msg
        ? `Google Sheet-এ ডাটা পাঠানো সম্ভব হয়নি। ${msg}`
        : 'Google Sheet-এ ডাটা পাঠানো সম্ভব হয়নি। URL ঠিক আছে কিনা, Web App Deploy করা হয়েছে কিনা দেখুন।';
      setError(finalMsg);
      setStatus('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setError('');
    setStatus('');
  };

  const handleSelectCustomer = (customerName) => {
    const nextCustomer = customerName?.trim?.() || '';
    customerSummaryRequest.current += 1;
    setForm((previousForm) => ({
      ...previousForm,
      customer: nextCustomer,
      depositedTotal: '0',
      depositedBase: '0',
      deposited: '0',
      remaining: '0',
      due: '0',
      remainingBase: '0',
      dueBase: '0',
      totalAmountBase: '0',
      length: '',
      width: '',
      height: '',
      tons: '0',
      feetPerTon: '0',
      feet: '0',
      rate: '',
      amount: '',
    }));
    fetchCustomerSummary(nextCustomer);
  };

  const handleOpenSelectedSheet = () => {
    if (!form.customer) {
      return;
    }

    const sheetOpenBaseUrl =
      process.env.NEXT_PUBLIC_GOOGLE_SHEET_OPEN_URL ||
      GOOGLE_SHEET_WEB_APP_URL;

    if (!sheetOpenBaseUrl || sheetOpenBaseUrl.includes('PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
      setStatus('শিট খুলতে Google Sheet Open URL সেট করতে হবে।');
      setError('');
      return;
    }

    if (sheetOpenBaseUrl.includes('docs.google.com/spreadsheets')) {
      const spreadsheetUrl = new URL(sheetOpenBaseUrl);
      if (!spreadsheetUrl.hash.includes('gid=')) {
        const directSheetUrl = `${spreadsheetUrl.origin}${spreadsheetUrl.pathname}${spreadsheetUrl.search}`;
        window.open(directSheetUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      window.open(spreadsheetUrl.toString(), '_blank', 'noopener,noreferrer');
      return;
    }

    const sheetUrl = new URL(sheetOpenBaseUrl);
    sheetUrl.searchParams.set('action', 'openSheet');
    sheetUrl.searchParams.set('sheetName', form.customer);

    window.open(sheetUrl.toString(), '_blank', 'noopener,noreferrer');
  };

  const handleAddCustomer = () => {
    setNewCustomerForm({ name: '', mobile: '', address: '' });
    setShowAddModal(true);
  };

  const handleConfirmAddCustomer = async () => {
    const trimmedName = newCustomerForm.name.trim();
    if (!trimmedName) return;

    const newEntry = {
      name: trimmedName,
      mobile: newCustomerForm.mobile.trim(),
      address: newCustomerForm.address.trim(),
    };

    setCustomerOptions((prev) => {
      if (prev.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) return prev;
      return [...prev, newEntry];
    });

    setForm((prev) => ({
      ...prev,
      customer: trimmedName,
    }));

    setShowAddModal(false);

    try {
      await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addCustomer', ...newEntry })
      });
    } catch (e) {}

    refreshAllNow(false);
  };

  const handleDeleteCustomer = async () => {
    const currentCustomer = form.customer.trim();
    if (!currentCustomer) return;

    const confirmed = window.confirm(`⚠️  WARNING\n\n"${currentCustomer}" নামটি মুছে ফেললে ঐ গ্রাহকের সম্পূর্ণ হিসাব শিটসহ (সকল চালান, জমা-খরচের হিসাব) স্থায়ীভাবে মুছে যাবে।\n\nএখনও মুছে ফেলবেন?`);
    if (!confirmed) return;

    setCustomerOptions((prev) => {
      const nextOptions = prev.filter(c => c.name.toLowerCase() !== currentCustomer.toLowerCase());
      if (nextOptions.length > 0) {
        setForm(f => ({ ...f, customer: nextOptions[0].name }));
      } else {
        setForm(f => ({ ...f, customer: '' }));
      }
      return nextOptions;
    });

    try {
      await fetch(`/api/customers?name=${encodeURIComponent(currentCustomer)}`, {
        method: 'DELETE'
      });
    } catch (e) {}

    queueMicrotask(() => refreshAllNow(false));
  };

  const handleDownloadSlip = () => {
    if (!lastSlip) {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1100,height=800');

    if (!printWindow) {
      return;
    }

    const date = lastSlip.date;
    const customer = lastSlip.customer;
    const mobile = lastSlip.mobile || '';
    const address = lastSlip.address || '';
    const vehicle = lastSlip.vehicle || '—';
    const description = lastSlip.description || '—';
    const driverName = lastSlip.driverName || '';
    const driverMobile = lastSlip.driverMobile || '';
    const destination = lastSlip.destination || '';
    const truckCharge = lastSlip.truckCharge ? '৳ ' + Number(lastSlip.truckCharge).toLocaleString('bn-BD') : '';
    const length = Number(lastSlip.length || 0).toLocaleString('bn-BD');
    const width = Number(lastSlip.width || 0).toLocaleString('bn-BD');
    const height = Number(lastSlip.height || 0).toLocaleString('bn-BD');
    const tons = Number(lastSlip.tons || 0).toLocaleString('bn-BD');
    const feetPerTon = Number(lastSlip.feetPerTon || 0).toLocaleString('bn-BD');
    const feet = Number(lastSlip.feet || 0).toLocaleString('bn-BD');
    const rate = '৳ ' + Number(lastSlip.rate || 0).toLocaleString('bn-BD');
    const amount = '৳ ' + Number(lastSlip.amount || 0).toLocaleString('bn-BD');
    const deposited = '৳ ' + Number(lastSlip.deposited || 0).toLocaleString('bn-BD');
    const remaining = '৳ ' + Number(lastSlip.remaining || 0).toLocaleString('bn-BD');
    const due = '৳ ' + Number(lastSlip.due || 0).toLocaleString('bn-BD');
    const challanNo = lastSlip.challanNo || '—';
    const totalAmount = '৳ ' + Number(lastSlip.amount || 0).toLocaleString('bn-BD');

    // feetMode নির্ধারণ: lastSlip.feetMode থেকে
    const slipFeetMode = lastSlip.feetMode || 'tons';

    const buildSlip = () => `
      <div class="slip">

        <!-- হেডার -->
        <div class="slip-header">
          <div class="header-left">
            <div class="mst-logo">MST</div>
          </div>
          <div class="header-center">
            <h1 class="bn-company">মেসার্স সাইফুল ট্রেডার্স এন্ড স্টোন ক্রাশার</h1>
            <h2 class="en-company">M/S SAIFUL TRADERS &amp; STONE CRUSHER</h2>
            <p class="tagline">সাদা এলসি, কালো এলসি, কয়লা সহ সর্বপ্রকার ভাঙ্গা পাথর ও বালুর নির্ভরযোগ্য প্রতিষ্ঠান</p>
            <div class="contact-bar">
              <span>প্রোঃ জাকির হোসেন মোয়াজী</span>
              <span class="sep">|</span>
              <span>মোবা: 01711-662074, 01834-863675</span>
            </div>
          </div>
          <div class="header-right">
            <div class="challan-box">
              <span class="challan-label">চালান নং</span>
              <span class="challan-no">${challanNo}</span>
            </div>
          </div>
        </div>

        <!-- অফিস বার -->
        <div class="office-bars">
          <div class="office-bar">হেড অফিস: তামাবিল, গোয়াইনঘাট, সিলেট।</div>
          <div class="office-bar">শাখা অফিস: সুতারকান্দি, সিলেট।</div>
        </div>

        <div class="divider-line"></div>

        <!-- মূল তথ্য টেবিল -->
        <table class="info-table">
          <tbody>

            <!-- লাইন ১: তারিখ | চালান নং -->
            <tr>
              <th>তারিখ</th>
              <td>${date}</td>
              <th>চালান নং</th>
              <td class="bold blue">${challanNo}</td>
            </tr>

            <!-- লাইন ২: গ্রাহকের নাম | ঠিকানা -->
            <tr>
              <th>গ্রাহকের নাম</th>
              <td class="bold">${customer}</td>
              <th>ঠিকানা</th>
              <td>${address || '—'}</td>
            </tr>

            <!-- লাইন ৩: ড্রাইভার | মোবাইল -->
            <tr>
              <th>ড্রাইভারের নাম</th>
              <td>${driverName || '—'}</td>
              <th>ড্রাইভারের মোবাইল</th>
              <td>${driverMobile || '—'}</td>
            </tr>

            <!-- লাইন ৪: গাড়ি নাং | গন্তব্য -->
            <tr>
              <th>গাড়ি নাং</th>
              <td class="bold">${vehicle}</td>
              <th>গন্তব্য স্থান</th>
              <td>${destination || '—'}</td>
            </tr>

            <!-- লাইন ৫: মালের বিবরণ -->
            <tr>
              <th>মালের বিবরণ</th>
              <td colspan="3">${description || '—'}</td>
            </tr>

            <!-- লাইন ৬: মালের পরিমাণ (measurement বা টন মোড) -->
            ${slipFeetMode === 'measurement' ? `
            <tr>
              <th>মালের পরিমাণ</th>
              <td colspan="3">
                <span class="formula-row">
                  <span class="fl">দৈর্ঘ্য</span><span class="fv">${length}</span>
                  <span class="fsym">×</span>
                  <span class="fl">প্রস্থ</span><span class="fv">${width}</span>
                  <span class="fsym">×</span>
                  <span class="fl">উচ্চতা</span><span class="fv">${height}</span>
                  <span class="fsym">=</span>
                  <span class="fl">মোট CFT</span><span class="fv bold blue">${feet}</span>
                </span>
              </td>
            </tr>` : `
            <tr>
              <th>মালের পরিমাণ</th>
              <td colspan="3">
                <span class="formula-row">
                  <span class="fl">টন</span><span class="fv">${tons}</span>
                  <span class="fsym">×</span>
                  <span class="fl">গুণ</span><span class="fv">${feetPerTon}</span>
                  <span class="fsym">=</span>
                  <span class="fl">মোট CFT</span><span class="fv bold blue">${feet}</span>
                </span>
              </td>
            </tr>`}

            <!-- লাইন ৭: মোট টাকা -->
            <tr class="amount-row">
              <th>মোট টাকা</th>
              <td colspan="3">
                <span class="formula-row">
                  <span class="fl">CFT</span><span class="fv">${feet}</span>
                  <span class="fsym">×</span>
                  <span class="fl">দর</span><span class="fv">${rate}</span>
                  <span class="fsym">=</span>
                  <span class="big-amount">${amount}</span>
                </span>
              </td>
            </tr>

            <!-- লাইন ৮: গাড়ি ভাড়া -->
            <tr class="truck-row">
              <th>গাড়ি ভাড়া</th>
              <td colspan="3">
                <span class="formula-row">
                  <span class="fl">ফুট</span><span class="fv">${feet}</span>
                  <span class="fsym">×</span>
                  <span class="fl">ভাড়া/ফুট</span><span class="fv">${lastSlip.truckRatePerFoot ? '৳ ' + Number(lastSlip.truckRatePerFoot).toLocaleString('bn-BD') : '—'}</span>
                  <span class="fsym">=</span>
                  <span class="truck-total">${truckCharge || '—'}</span>
                </span>
              </td>
            </tr>

          </tbody>
        </table>

        <!-- স্বাক্ষর -->
        <div class="sig-row">
          <div class="sig-col">
            <span class="sig-line"></span>
            <span class="sig-label">ড্রাইভারের স্বাক্ষর</span>
          </div>
          <div class="sig-col">
            <span class="sig-line"></span>
            <span class="sig-label">ক্রেতার স্বাক্ষর</span>
          </div>
          <div class="sig-col">
            <span class="sig-line"></span>
            <span class="sig-label">পক্ষে: মেসার্স সাইফুল ট্রেডার্স</span>
          </div>
        </div>

        <!-- খালি জায়গা -->
        <div class="spacer"></div>

        <!-- footer banner একদম নিচে -->
        <div class="footer-banner">
          <span>সততা ব্যবসার মূলধন</span>
          <span>ধন্যবাদ আবার আসবেন</span>
        </div>

      </div>
    `;

    const slipHtml = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Saiful Traders — চালান নং ${challanNo}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            html, body {
              font-family: 'Hind Siliguri', 'Noto Sans Bengali', Arial, sans-serif;
              color: #111827;
              background: #e5e7eb;
            }
            .page {
              width: 210mm;
              min-height: 297mm;
              margin: 10px auto;
              background: #fff;
              box-shadow: 0 4px 20px rgba(0,0,0,0.12);
              display: flex;
              flex-direction: column;
            }

            .slip {
              flex: 1;
              padding: 10mm 12mm 8mm;
              display: flex;
              flex-direction: column;
              gap: 8px;
              min-height: 297mm;
            }

            /* হেডার */
            .slip-header {
              display: flex;
              align-items: flex-start;
              gap: 10px;
              padding-bottom: 5px;
            }
            .header-left { flex-shrink: 0; padding-top: 4px; }
            .header-center { flex: 1; text-align: center; }
            .header-right {
              flex-shrink: 0;
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              gap: 6px;
            }
            .mst-logo {
              width: 58px; height: 58px;
              border: 3px solid #1e3a8a;
              border-radius: 50%;
              display: grid; place-items: center;
              font-family: 'Georgia', serif;
              font-weight: 700; font-size: 16px;
              color: #1e3a8a;
            }
            .bn-company {
              font-size: 32px; font-weight: 800;
              color: #1e3a8a; line-height: 1.25;
              font-family: 'Hind Siliguri', 'Noto Sans Bengali', Arial, sans-serif;
              letter-spacing: 0.3px;
              text-shadow: 0 1px 2px rgba(30,58,138,0.12);
            }
            .en-company {
              font-family: 'Manrope', 'Arial', sans-serif;
              font-size: 15px; font-weight: 700;
              color: #1e3a8a; letter-spacing: 2.5px;
              text-transform: uppercase;
              margin-top: 3px;
            }
            .tagline {
              font-size: 12px; color: #374151;
              margin: 4px 0 5px;
              font-family: 'Hind Siliguri', sans-serif;
            }
            .contact-bar {
              display: inline-flex; align-items: center; gap: 8px;
              background: #1e3a8a; color: #fff;
              padding: 4px 16px; border-radius: 999px;
              font-size: 12px; font-weight: 600;
              font-family: 'Manrope', 'Hind Siliguri', sans-serif;
            }
            .tagline {
              font-size: 10px; color: #374151;
              margin: 3px 0 4px;
            }
            .contact-bar {
              display: inline-flex; align-items: center; gap: 8px;
              background: #1e3a8a; color: #fff;
              padding: 3px 14px; border-radius: 999px;
              font-size: 10.5px; font-weight: 600;
            }
            .contact-bar .sep { opacity: 0.35; }
            .copy-tag {
              padding: 3px 12px;
              border: 1.5px solid #1e3a8a;
              border-radius: 999px;
              color: #1e3a8a; font-weight: 700;
              font-size: 10px; background: #eff6ff;
            }
            .challan-box {
              border: 2px solid #1e3a8a;
              border-radius: 6px;
              padding: 5px 16px;
              text-align: center;
              background: #eff6ff;
            }
            .challan-label {
              display: block; font-size: 10px;
              color: #6b7280; font-weight: 600;
              text-transform: uppercase; letter-spacing: 0.5px;
            }
            .challan-no {
              display: block; font-size: 22px;
              font-weight: 800; color: #1e3a8a;
            }

            /* অফিস বার */
            .office-bars {
              display: grid; grid-template-columns: 1fr 1fr; gap: 5px;
            }
            .office-bar {
              background: #1e3a8a; color: #fff;
              padding: 4px 10px; font-size: 10px;
              font-weight: 600; border-radius: 4px;
              text-align: center;
            }
            .divider-line {
              height: 2px;
              background: linear-gradient(90deg, transparent, #1e3a8a 20%, #1e3a8a 80%, transparent);
              opacity: 0.45; margin: 1px 0;
            }

            /* মূল টেবিল */
            .info-table {
              width: 100%;
              flex: 1;
              border-collapse: collapse;
              border: 1.5px solid #94a3b8;
              border-radius: 8px;
              overflow: hidden;
            }
            .info-table th,
            .info-table td {
              padding: 13px 15px;
              font-size: 15px;
              line-height: 1.5;
              border: 1px solid #d1d5db;
              vertical-align: middle;
              font-family: 'Hind Siliguri', 'Noto Sans Bengali', Arial, sans-serif;
            }
            .info-table th {
              background: #eef4ff;
              color: #1e3a8a;
              font-weight: 700;
              text-align: left;
              white-space: nowrap;
              width: 18%;
            }
            .info-table td { background: #fff; }
            .info-table tr:nth-child(even) th { background: #e8efff; }
            .info-table tr:nth-child(even) td { background: #fafbff; }

            /* amount & truck rows */
            .info-table tr.amount-row th { background: #dbeafe; color: #1e40af; }
            .info-table tr.amount-row td { background: #eff6ff; }
            .info-table tr.truck-row  th { background: #d1fae5; color: #065f46; }
            .info-table tr.truck-row  td { background: #f0fdf4; }

            /* helper classes */
            .bold  { font-weight: 700; }
            .blue  { color: #1e3a8a; }
            .green { color: #047857; }
            .red   { color: #b91c1c; }

            /* formula row */
            .formula-row {
              display: flex; align-items: center;
              gap: 8px; flex-wrap: wrap;
            }
            .fl  { font-size: 12px; color: #6b7280; font-weight: 600; font-family: 'Manrope', sans-serif; }
            .fv  { font-size: 15px; font-weight: 700; color: #111827; font-family: 'Manrope', sans-serif; }
            .fv.bold { font-weight: 800; }
            .fv.blue { color: #1e3a8a; }
            .fsym { font-size: 15px; color: #9ca3af; font-weight: 600; font-family: 'Manrope', sans-serif; }
            .big-amount {
              font-size: 22px; font-weight: 800; color: #1e3a8a;
              font-family: 'Manrope', sans-serif;
            }
            .truck-total {
              font-size: 20px; font-weight: 800; color: #065f46;
              font-family: 'Manrope', sans-serif;
            }

            /* স্বাক্ষর */
            .sig-row {
              display: flex; justify-content: space-between;
              align-items: flex-end; gap: 20px;
              padding-top: 55px;
            }
            .sig-col {
              flex: 1; display: flex;
              flex-direction: column; align-items: center; gap: 5px;
            }
            .sig-line {
              width: 100%; border-top: 1px dashed #9ca3af;
            }
            .sig-label {
              font-size: 13px; color: #374151;
              font-weight: 600; text-align: center;
              font-family: 'Hind Siliguri', sans-serif;
            }

            /* খালি spacer */
            .spacer { flex: 1; min-height: 45mm; }

            /* footer banner */
            .footer-banner {
              display: flex; justify-content: space-between;
              background: #1e3a8a; color: #fff;
              padding: 9px 20px; border-radius: 5px;
              font-size: 14px; font-weight: 700;
              font-family: 'Hind Siliguri', 'Manrope', sans-serif;
            }

            @media print {
              @page { size: A4 portrait; margin: 0; }
              html, body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
              .page { margin: 0; box-shadow: none; width: 210mm; min-height: 297mm; }
              .slip { min-height: 297mm; }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            ${buildSlip()}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(slipHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 800);
  };

  if (!isLoggedIn) {
    return (
      <div className="dashboard-shell">
        <div className="login-panel">
          <p className="login-tag">ব্যবসায়িক হিসাব</p>
          <h1>মেসার্স সাইফুল ট্রেডার্স</h1>
          <p className="login-subtitle">প্রোঃ জাকির হোসেন মিয়াজী</p>
          <form onSubmit={handleLogin} className="login-form">
            <label>
              ইউজারনেম
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="ইউজার এর নাম"
              />
            </label>
            <label>
              পাসওয়ার্ড
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="আপনার পাসওয়াড দিন"
              />
            </label>

            {error ? <p className="error-text">{error}</p> : null}

            <button type="submit" className="primary-btn full-width-btn login-submit-btn">
              লগইন করুন
            </button>
          </form>
        </div>
        {isFetchingData && (
          <div className="spinner-overlay">
            <LoadingSpinner />
          </div>
        )}
      </div>
    );
  }

  const filteredCustomerOptions = customerOptions.filter((option) => {
    if (!customerSearch.trim()) return true;
    const query = customerSearch.toLowerCase().trim();
    return (
      option.name.toLowerCase().includes(query) ||
      option.mobile.toLowerCase().includes(query) ||
      option.address.toLowerCase().includes(query)
    );
  });

  const selectedCustomerObj = customerOptions.find((c) => c.name === form.customer);

  return (
    <div className="dashboard-shell">
      {isFetchingData && (
        <div className="spinner-overlay">
          <LoadingSpinner />
        </div>
      )}
      <header className="dashboard-header">
        <div>
          <p className="login-tag">Saiful Traders</p>
          <h2>বিক্রয় হিসাব ড্যাশবোর্ড</h2>
          <p className="sync-status-line">
            <span
              className={`sync-dot ${pollingEnabled ? 'sync-active' : 'sync-paused'}`}
              aria-hidden="true"
            />
            {pollingEnabled ? 'অটো সিঙ্ক চালু আছে' : 'অটো সিঙ্ক বন্ধ'}
            {lastSyncedAt && (
              <>
                <span className="sync-sep">•</span>
                <span>শেষ সিঙ্ক: {lastSyncedAt.toLocaleTimeString('bn-BD')}</span>
              </>
            )}
            {isLoadingGlobalSummary && (
              <>
                <span className="sync-sep">•</span>
                <span className="sync-spinner-text">আপডেট হচ্ছে…</span>
              </>
            )}
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            onClick={() => refreshAllNow(false)}
            className="secondary-btn small-btn action-btn"
            title="এখনই রিফ্রেশ করুন (কাস্টমার তালিকা, হিসাব, গ্লোবাল সারাংশ)"
          >
            <span aria-hidden="true">⟳</span>
            <span>এখন রিফ্রেশ</span>
          </button>
          <button
            type="button"
            onClick={() => setPollingEnabled((v) => !v)}
            className={`small-btn action-btn ${pollingEnabled ? 'primary-btn' : 'secondary-btn'}`}
            title="অটো সিঙ্ক ৫ সেকেন্ডে শীতে শীতে চালু/বন্ধ করুন"
          >
            <span aria-hidden="true">{pollingEnabled ? '🔵' : '⚪'}</span>
            <span>{pollingEnabled ? 'অটো সিঙ্ক ON' : 'অটো সিঙ্ক OFF'}</span>
          </button>
          <button type="button" onClick={handleAddCustomer} className="secondary-btn small-btn action-btn add-customer-btn" title="কাস্টমার যোগ করুন">
            <span aria-hidden="true">＋</span>
            <span>কাস্টমার যোগ করুন</span>
          </button>
          <button type="button" onClick={handleDeleteCustomer} className="secondary-btn small-btn action-btn delete-customer-btn" title="কাস্টমার ডিলেট করুন">
            <span aria-hidden="true">−</span>
            <span>কাস্টমার ডিলেট করুন</span>
          </button>
          <button type="button" onClick={handleLogout} className="primary-btn small-btn action-btn" title="লগআউট">
            <span aria-hidden="true">⎋</span>
            <span>লগআউট</span>
          </button>
        </div>
      </header>

      <section className="stats-grid stats-grid-global">
        <div className="global-summary-header">
          <div className="gsh-left">
            <span className="gsh-eyebrow">FINANCIAL OVERVIEW</span>
            <h2 className="gsh-title">সংগঠনের মোট সারাংশ</h2>
          </div>
          <div className="gsh-right">
            <span className="gsh-pill">
              <span className="gsh-pill-dot" />
              লাইভ সিঙ্কড
            </span>
          </div>
        </div>

        <article className="global-card g-card-deposited">
          <div className="g-card-ornament" aria-hidden="true" />
          <div className="g-card-head">
            <div className="g-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2" />
                <path d="M22 13V9a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-2" />
                <path d="M17 14h.01" />
              </svg>
            </div>
            <div className="g-card-badge">💰 ইনকামিং</div>
          </div>
          <div className="g-card-label">সকল গ্রাহক — মোট জমা</div>
          <div className="g-card-amount">
            <span className="g-card-currency">৳</span>
            <span className={`g-card-number ${getAmountSizeClass(globalSummary.globalDeposited)}`}>
              {Number(globalSummary.globalDeposited || 0).toLocaleString('bn-BD')}
            </span>
          </div>
          <div className="g-card-foot">
            <span className="g-card-trend up">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <path d="M7 17 17 7" />
                <path d="M8 7h9v9" />
              </svg>
              পজিটিভ
            </span>
            <span className="g-card-divider" />
            <span className="g-card-sub">জমা টাকার পরিমাণ</span>
          </div>
        </article>

        <article className="global-card g-card-due">
          <div className="g-card-ornament" aria-hidden="true" />
          <div className="g-card-head">
            <div className="g-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            </div>
            <div className="g-card-badge">⚠️ পেন্ডিং</div>
          </div>
          <div className="g-card-label">সকল গ্রাহক — মোট পাওনা</div>
          <div className="g-card-amount">
            <span className="g-card-currency">৳</span>
            <span className={`g-card-number ${getAmountSizeClass(globalSummary.globalDue)}`}>
              {Number(globalSummary.globalDue || 0).toLocaleString('bn-BD')}
            </span>
          </div>
          <div className="g-card-foot">
            <span className="g-card-trend down">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <path d="M7 7 17 17" />
                <path d="M17 8v9H8" />
              </svg>
              আদায় বাকি
            </span>
            <span className="g-card-divider" />
            <span className="g-card-sub">বাদেয় টাকার পরিমাণ</span>
          </div>
        </article>

        <article className="global-card g-card-remaining">
          <div className="g-card-ornament" aria-hidden="true" />
          <div className="g-card-head">
            <div className="g-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="g-card-badge">⏳ হিসাবধারী</div>
          </div>
          <div className="g-card-label">সকল গ্রাহক — মোট অবশিষ্ট</div>
          <div className="g-card-amount">
            <span className="g-card-currency">৳</span>
            <span className={`g-card-number ${getAmountSizeClass(globalSummary.globalRemaining)}`}>
              {Number(globalSummary.globalRemaining || 0).toLocaleString('bn-BD')}
            </span>
          </div>
          <div className="g-card-foot">
            <span className="g-card-trend up">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <path d="M7 17 17 7" />
                <path d="M8 7h9v9" />
              </svg>
              ক্যাশ ইন
            </span>
            <span className="g-card-divider" />
            <span className="g-card-sub">আগামী রিসিভেবল</span>
          </div>
        </article>

        <article className="global-card g-card-balance">
          <div className="g-card-ornament" aria-hidden="true" />
          <div className="g-card-head">
            <div className="g-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18" />
                <path d="M8 7h12l-4 5 4 5H8" />
                <path d="M16 7H4l4 5-4 5h12" />
              </svg>
            </div>
            <div className="g-card-badge">⚖️ নেট পজিশন</div>
          </div>
          <div className="g-card-label">নেট ব্যালেন্স (জমা − পাওনা)</div>
          <div className="g-card-amount">
            <span className="g-card-currency">৳</span>
            <span className={`g-card-number ${getAmountSizeClass(
              (Number(globalSummary.globalDeposited || 0) - Number(globalSummary.globalDue || 0)) || 0
            )}`}>
              {Number(
                (Number(globalSummary.globalDeposited || 0) - Number(globalSummary.globalDue || 0)) || 0
              ).toLocaleString('bn-BD')}
            </span>
          </div>
          <div className="g-card-foot">
            <span className={`g-card-trend ${
              (Number(globalSummary.globalDeposited || 0) - Number(globalSummary.globalDue || 0)) >= 0
                ? 'up'
                : 'down'
            }`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                {(Number(globalSummary.globalDeposited || 0) - Number(globalSummary.globalDue || 0)) >= 0 ? (
                  <>
                    <path d="M7 17 17 7" />
                    <path d="M8 7h9v9" />
                  </>
                ) : (
                  <>
                    <path d="M7 7 17 17" />
                    <path d="M17 8v9H8" />
                  </>
                )}
              </svg>
              {(Number(globalSummary.globalDeposited || 0) - Number(globalSummary.globalDue || 0)) >= 0
                ? 'ফাভারেবল'
                : 'এডভার্স'}
            </span>
            <span className="g-card-divider" />
            <span className="g-card-sub">বাস্তব হিসাব অবস্থা</span>
          </div>
        </article>
      </section>

      <section className="stats-grid">
        <p className="stats-section-label">নির্বাচিত গ্রাহকের সারাংশ — {form.customer || 'কেউ নির্বাচন করা হয়নি'}</p>
        <div className="stat-box">
          <span>মোট জমা</span>
          <strong>৳ {Number(form.depositedBase || 0).toLocaleString('bn-BD')}</strong>
        </div>

        <div className="stat-box income-box">
          <span>মোট পাওনা</span>
          <strong>৳ {Number(form.dueBase || 0).toLocaleString('bn-BD')}</strong>
        </div>

        <div className="stat-box profit-box">
          <span>মোট অবশিষ্ট</span>
          <strong>৳ {Number(form.remainingBase || 0).toLocaleString('bn-BD')}</strong>
        </div>

        <div className="stat-box sale-box">
          <span>মোট বিক্রি</span>
          <strong>৳ {Number(form.totalAmountBase || 0).toLocaleString('bn-BD')}</strong>
        </div>
      </section>

      <section className="customer-list-panel">
        <div className="panel-header-row">
          <div className="panel-title-group">
            <h3>গ্রাহক তালিকা</h3>
            <span className="customer-count-chip">{customerOptions.length} জন</span>
          </div>

          <div className="panel-actions">
            <div className="customer-search-wrapper">
              <span className="search-icon" aria-hidden="true">🔍</span>
              <input
                type="text"
                className="customer-search-input"
                placeholder="খুঁজুন (নাম, মোবাইল বা ঠিকানা)..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              {customerSearch && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setCustomerSearch('')}
                  title="ক্লিয়ার করুন"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              className="add-customer-quick-btn"
              onClick={handleAddCustomer}
              title="নতুন কাস্টমার যোগ করুন"
            >
              <span className="plus-icon">＋</span>
              <span>নতুন গ্রাহক</span>
            </button>

            <button
              type="button"
              className="delete-customer-quick-btn"
              onClick={handleDeleteCustomer}
              disabled={!form.customer}
              title="নির্বাচিত গ্রাহক মুছে ফেলুন"
            >
              <span className="minus-icon">−</span>
              <span>গ্রাহক বাতিল</span>
            </button>
          </div>
        </div>

        <div className="selected-sheet-banner">
          <div className="selected-sheet-info">
            <span className="sheet-label">নির্বাচিত গ্রাহক শিট</span>
            <div className="selected-sheet-details">
              <strong className="selected-sheet-name">{form.customer || 'কোনো গ্রাহক নির্বাচন হয়নি'}</strong>
              {selectedCustomerObj && (selectedCustomerObj.mobile || selectedCustomerObj.address) && (
                <div className="selected-sheet-meta">
                  {selectedCustomerObj.mobile && (
                    <span className="banner-meta-chip mobile-chip">
                      <span className="chip-icon">📞</span>
                      <span className="chip-text">{selectedCustomerObj.mobile}</span>
                    </span>
                  )}
                  {selectedCustomerObj.address && (
                    <span className="banner-meta-chip address-chip">
                      <LocationPinIcon size={13} className="chip-icon-svg" />
                      <span className="chip-text">{selectedCustomerObj.address}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            className="open-sheet-btn"
            onClick={handleOpenSelectedSheet}
            disabled={!form.customer}
          >
            <span>ওপেন শিট</span>
            <span className="btn-arrow" aria-hidden="true">→</span>
          </button>
        </div>

        <div className="customer-grid">
          {filteredCustomerOptions.length === 0 ? (
            <div className="customer-empty-card">
              <span className="empty-icon">👥</span>
              <p>{customerSearch ? 'আপনার অনুসন্ধান অনুযায়ী কোনো গ্রাহক পাওয়া যায়নি' : 'কোনো গ্রাহক নেই। নতুন গ্রাহক যোগ করুন।'}</p>
            </div>
          ) : (
            filteredCustomerOptions.map((option) => {
              const isSelected = form.customer === option.name;
              const initialLetter = option.name.trim().charAt(0) || 'ক';
              return (
                <div
                  key={option.name}
                  className={`customer-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectCustomer(option.name)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleSelectCustomer(option.name);
                    }
                  }}
                >
                  <div className="customer-card-top">
                    <div className="customer-avatar-badge">{initialLetter}</div>
                    <div className="customer-card-main-info">
                      <span className="customer-card-name">{option.name}</span>
                      <span className="customer-card-address" title={option.address || ''}>
                        <LocationPinIcon size={13} className="address-pin-icon" />
                        <span>{option.address || 'ঠিকানা দেওয়া হয়নি'}</span>
                      </span>
                    </div>
                    {isSelected && <span className="selected-check-dot">✓</span>}
                  </div>

                  <div className="customer-card-details">
                    {option.mobile ? (
                      <a
                        href={`tel:${option.mobile}`}
                        className="customer-phone-call-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCustomer(option.name);
                        }}
                        title={`${option.name}-কে কল করুন: ${option.mobile}`}
                      >
                        <span className="detail-icon">📞</span>
                        <span className="phone-num-text">{option.mobile}</span>
                        <span className="call-now-tag">কল দিন 📲</span>
                      </a>
                    ) : (
                      <div className="customer-phone-call-btn no-mobile">
                        <span className="detail-icon">📞</span>
                        <span className="phone-num-text">নম্বর দেওয়া হয়নি</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="single-form-panel">
        <form onSubmit={handleSubmit} className="sales-form">
          <div className="inline-row">
            <label>
              তারিখ
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
              />
            </label>

            <label className="customer-select-field">
              গ্রাহকের নাম
              <select
                value={form.customer}
                onChange={(event) => handleSelectCustomer(event.target.value)}
                aria-label="গ্রাহকের নাম"
              >
                <option value="">-- নির্বাচন করুন --</option>
                {customerOptions.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name}{option.mobile ? ` (${option.mobile})` : ''}
                  </option>
                ))}
              </select>
              {selectedCustomerObj && (selectedCustomerObj.mobile || selectedCustomerObj.address) && (
                <div className="form-customer-info-bar">
                  {selectedCustomerObj.mobile && (
                    <span className="form-info-badge phone-badge">
                      <span className="badge-icon">📞</span>
                      <span className="badge-text">{selectedCustomerObj.mobile}</span>
                    </span>
                  )}
                  {selectedCustomerObj.address && (
                    <span className="form-info-badge address-badge">
                      <LocationPinIcon size={13} className="badge-icon-svg" />
                      <span className="badge-text">{selectedCustomerObj.address}</span>
                    </span>
                  )}
                </div>
              )}
            </label>
          </div>

          <div className="inline-row description-full-row">
            <label className="description-label-full">
              মালের বিবরণ
              <input
                type="text"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="যেমন: বালু, নুড়ি, ইট"
                className="description-input-full"
              />
            </label>
          </div>

          <div className="feet-mode-selector" role="radiogroup" aria-label="ফুট ক্যালকুলেশন মোড">
            <label className={`feet-mode-option ${feetMode === 'tons' ? 'active' : ''}`}>
              <input
                type="radio"
                name="feetMode"
                value="tons"
                checked={feetMode === 'tons'}
                onChange={() => handleFeetModeChange('tons')}
              />
              <span className="radio-dot" aria-hidden="true" />
              <span>টন × গুণ</span>
            </label>
            <label className={`feet-mode-option ${feetMode === 'measurement' ? 'active' : ''}`}>
              <input
                type="radio"
                name="feetMode"
                value="measurement"
                checked={feetMode === 'measurement'}
                onChange={() => handleFeetModeChange('measurement')}
              />
              <span className="radio-dot" aria-hidden="true" />
              <span>গাড়ির পরিমাপ</span>
            </label>
          </div>

          <div
            className="inline-row formula-cards-grid"
            style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}
          >
            <div className={`formula-card ${feetMode === 'tons' ? 'active' : ''}`}>
              <div className="formula-group">
                <label>
                  টন
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9০-৯]*"
                    value={form.tons}
                    onChange={(event) => handleNumberInput('tons', event.target.value)}
                    placeholder="টন"
                    aria-label="টন"
                  />
                </label>
                <span className="formula-symbol" aria-hidden="true">×</span>
                <label>
                  গুণ
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9০-৯]*"
                    value={form.feetPerTon}
                    onChange={(event) => handleNumberInput('feetPerTon', event.target.value)}
                    placeholder="গুণ"
                    aria-label="গুণ"
                  />
                </label>
              </div>
            </div>

            <div className={`formula-card ${feetMode === 'measurement' ? 'active' : ''}`}>
              <div className="formula-group measurement-formula">
                <label>
                  দৈর্ঘ্য
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9০-৯.]*"
                    value={form.length}
                    onChange={(event) => handleNumberInput('length', event.target.value)}
                    placeholder="দৈর্ঘ্য"
                    aria-label="গাড়ির দৈর্ঘ্য"
                  />
                </label>
                <span className="formula-symbol small" aria-hidden="true">×</span>
                <label>
                  প্রস্থ
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9০-৯.]*"
                    value={form.width}
                    onChange={(event) => handleNumberInput('width', event.target.value)}
                    placeholder="প্রস্থ"
                    aria-label="গাড়ির প্রস্থ"
                  />
                </label>
                <span className="formula-symbol small" aria-hidden="true">×</span>
                <label>
                  উচ্চতা
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9০-৯.]*"
                    value={form.height}
                    onChange={(event) => handleNumberInput('height', event.target.value)}
                    placeholder="উচ্চতা"
                    aria-label="গাড়ির উচ্চতা"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="inline-row full-width-row amount-line">
            <div className="formula-group amount-formula">
              <label>
                ফুট
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9০-৯]*"
                  value={form.feet}
                  readOnly
                  aria-label="গণনা করা ফুট"
                />
              </label>
              <span className="formula-symbol" aria-hidden="true">×</span>
              <label>
                দর
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9০-৯]*"
                  value={form.rate}
                  onChange={(event) => handleNumberInput('rate', event.target.value)}
                  placeholder="দর"
                  aria-label="দর"
                />
              </label>
              <span className="formula-symbol" aria-hidden="true">=</span>
              <label>
                টাকা
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9০-৯]*"
                  value={form.amount}
                  readOnly
                  aria-label="গণনা করা টাকা"
                  className="amount-input"
                />
              </label>
            </div>
          </div>

          <div className="truck-info-section">
            <div className="truck-info-header">
              <span className="truck-info-title">🚛 গাড়ি ও ড্রাইভার তথ্য</span>
              <span className="truck-info-note">( শুধু স্লিপে দেখাবে, শিটে যাবে না )</span>
            </div>

            <div className="inline-row">
              <label>
                গাড়ি নাম্বার
                <input
                  type="text"
                  value={form.vehicle}
                  onChange={(event) => setForm({ ...form, vehicle: event.target.value })}
                  placeholder="যেমন: রাজভোগ ১০"
                />
              </label>

              <label>
                ড্রাইভারের নাম
                <input
                  type="text"
                  value={form.driverName}
                  onChange={(event) => setForm({ ...form, driverName: event.target.value })}
                  placeholder="যেমন: রহিম উদ্দিন"
                />
              </label>

              <label>
                ড্রাইভারের মোবাইল
                <input
                  type="tel"
                  value={form.driverMobile}
                  onChange={(event) => setForm({ ...form, driverMobile: event.target.value })}
                  placeholder="যেমন: ০১৭XXXXXXXX"
                />
              </label>

              <label>
                গন্তব্য স্থান
                <input
                  type="text"
                  value={form.destination}
                  onChange={(event) => setForm({ ...form, destination: event.target.value })}
                  placeholder="যেমন: সিলেট সদর"
                />
              </label>
            </div>

            <div className="inline-row full-width-row amount-line">
              <div className="formula-group amount-formula">
                <label>
                  ফুট
                  <input
                    type="text"
                    value={form.feet}
                    readOnly
                    aria-label="ফুট (রেফারেন্স)"
                  />
                </label>
                <span className="formula-symbol" aria-hidden="true">×</span>
                <label>
                  প্রতি ফুট ভাড়া
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9০-৯]*"
                    value={form.truckRatePerFoot}
                    onChange={(event) => handleNumberInput('truckRatePerFoot', event.target.value)}
                    placeholder="প্রতি ফুট ভাড়া"
                    aria-label="প্রতি ফুট গাড়ি ভাড়া"
                  />
                </label>
                <span className="formula-symbol" aria-hidden="true">=</span>
                <label>
                  মোট গাড়ি ভাড়া
                  <input
                    type="text"
                    value={form.truckCharge}
                    readOnly
                    aria-label="মোট গাড়ি ভাড়া"
                    className="amount-input truck-charge-result"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="inline-row">
            <label>
              মোট জমা
              <input
                type="text"
                inputMode="numeric"
                value={form.depositedTotal}
                readOnly
                aria-label="মোট জমা"
              />
            </label>

            <label>
              নতুন জমা
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9০-৯]*"
                value={form.deposited}
                onChange={(event) => handleNumberInput('deposited', event.target.value)}
                placeholder="যেমন: ০ বা 0"
              />
            </label>

            <label>
              অবশিষ্ট
              <input
                type="text"
                inputMode="numeric"
                value={form.remaining}
                readOnly
                aria-label="অবশিষ্ট টাকা"
              />
            </label>

            <label>
              পাওনা
              <input
                type="text"
                inputMode="numeric"
                value={form.due}
                readOnly
                aria-label="পাওনা টাকা"
              />
            </label>
          </div>

          <div className="inline-row challan-only-row">
            <label>
              চালান নং (অটোমেটিক)
              <input
                type="text"
                value={form.challanNo}
                readOnly
                className="auto-challan-input"
                aria-label="অটোমেটিক চালান নম্বর"
              />
            </label>
          </div>

          {error ? <p className="error-text">{error}</p> : null}
          {status ? <p className="success-text">{status}</p> : null}

          {lastSlip ? (
            <button type="button" className="secondary-btn full-width-btn" onClick={handleDownloadSlip}>
              চালান ডাউনলোড করুন
            </button>
          ) : null}

          <button type="submit" className="primary-btn full-width-btn" disabled={isSubmitting}>
            {isSubmitting ? 'সেভ হচ্ছে...' : 'Google Sheet এ জমা দিন'}
          </button>
        </form>
      </section>

      {showAddModal ? (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>নতুন গ্রাহক যোগ করুন</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAddModal(false)}
                aria-label="বন্ধ করুন"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <label className="modal-label">
                গ্রাহকের নাম <span className="required-mark">*</span>
                <input
                  type="text"
                  value={newCustomerForm.name}
                  onChange={(e) =>
                    setNewCustomerForm({ ...newCustomerForm, name: e.target.value })
                  }
                  placeholder="গ্রাহকের নাম লিখুন"
                  autoFocus
                />
              </label>

              <label className="modal-label">
                মোবাইল নাম্বার
                <input
                  type="tel"
                  value={newCustomerForm.mobile}
                  onChange={(e) =>
                    setNewCustomerForm({ ...newCustomerForm, mobile: e.target.value })
                  }
                  placeholder="যেমন: ০১৭XXXXXXXX"
                />
              </label>

              <label className="modal-label">
                ঠিকানা
                <input
                  type="text"
                  value={newCustomerForm.address}
                  onChange={(e) =>
                    setNewCustomerForm({ ...newCustomerForm, address: e.target.value })
                  }
                  placeholder="গ্রাহকের ঠিকানা লিখুন"
                />
              </label>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn modal-cancel-btn"
                onClick={() => setShowAddModal(false)}
              >
                বাতিল
              </button>
              <button
                type="button"
                className="primary-btn modal-confirm-btn"
                onClick={handleConfirmAddCustomer}
                disabled={!newCustomerForm.name.trim()}
              >
                যোগ করুন
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
