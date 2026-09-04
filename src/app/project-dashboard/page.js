'use client';

import LoadingSpinner from '../../components/LoadingSpinner';
import { useRef, useState } from 'react';

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

const getInitialForm = () => ({
  date: new Date().toISOString().split('T')[0],
  business: '',
  customer: '',
  vehicle: '',
  description: '',
  feet: '0',
  rate: '',
  amount: '',
  depositedTotal: '0',
  depositedBase: '0',
  deposited: '0',
  remaining: '0',
  due: '0',
  remainingBase: '0',
  dueBase: '0',
  totalAmountBase: '0',
  tons: '0',
  feetPerTon: '0',
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
  const [customerOptions, setCustomerOptions] = useState([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [lastSlip, setLastSlip] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', mobile: '', address: '' });
  const customerSummaryRequest = useRef(0);

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

  const fetchCustomers = async () => {
    setIsFetchingData(true);
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.customers) {
          setCustomerOptions(data.customers);
          queueMicrotask(() => {
            setForm((prev) => {
              if (!prev.customer && data.customers.length > 0) {
                const firstCustomer = data.customers[0].name;
                queueMicrotask(() => fetchCustomerSummary(firstCustomer));
                return { ...prev, customer: firstCustomer };
              }
              return prev;
            });
          });
        }
      }
    } catch (e) {}
    setIsFetchingData(false);
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
      });
      return;
    }

    setError('ভুল ইউজারনেম বা পাসওয়ার্ড দিয়েছেন পুনরায় আবার চেষ্টা করুন');
  };

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

  const handleNumberInput = (fieldName, value) => {
    const sanitizedValue = String(value)
      .replace(/[^\d.০-৯]/g, '')
      .replace(/[০-৯]/g, (digit) => digit);

    setForm((previousForm) => {
      const nextForm = {
        ...previousForm,
        [fieldName]: sanitizedValue,
      };

      if (fieldName === 'tons' || fieldName === 'feetPerTon') {
        const tons = Number(toEnglishNumber(nextForm.tons)) || 0;
        const feetPerTon = Number(toEnglishNumber(nextForm.feetPerTon)) || 0;
        nextForm.feet = String(tons * feetPerTon);
      }

      if (fieldName === 'tons' || fieldName === 'feetPerTon' || fieldName === 'rate') {
        const feet = Number(toEnglishNumber(nextForm.feet)) || 0;
        const rate = Number(toEnglishNumber(nextForm.rate)) || 0;
        nextForm.amount = String(feet * rate);
      }

      if (fieldName === 'deposited' || fieldName === 'tons' || fieldName === 'feetPerTon' || fieldName === 'rate') {
        const deposited = Number(toEnglishNumber(nextForm.deposited)) || 0;
        const amount = Number(toEnglishNumber(nextForm.amount)) || 0;
        const remainingBase = Number(toEnglishNumber(nextForm.remainingBase)) || 0;
        const dueBase = Number(toEnglishNumber(nextForm.dueBase)) || 0;
        const netBalance = remainingBase - dueBase + deposited - amount;
        nextForm.remaining = String(Math.max(netBalance, 0));
        nextForm.due = String(Math.max(-netBalance, 0));
        if (fieldName === 'deposited') {
          const depositedBase = Number(toEnglishNumber(nextForm.depositedBase)) || 0;
          nextForm.depositedTotal = String(depositedBase + deposited);
        }
      }

      return nextForm;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const business = form.business.trim();
    const customer = form.customer.trim();
    const vehicle = form.vehicle.trim();
    const description = form.description.trim();
    const tons = Number(toEnglishNumber(form.tons)) || 0;
    const feetPerTon = Number(toEnglishNumber(form.feetPerTon)) || 0;
    const feet = tons * feetPerTon;
    const rate = Number(toEnglishNumber(form.rate)) || 0;
    const amount = feet * rate;
    const deposited = Number(toEnglishNumber(form.deposited)) || 0;
    const remainingBase = Number(toEnglishNumber(form.remainingBase)) || 0;
    const dueBase = Number(toEnglishNumber(form.dueBase)) || 0;
    const netBalance = remainingBase - dueBase + deposited - amount;
    const remaining = Math.max(netBalance, 0);
    const due = Math.max(-netBalance, 0);
    const challanNo = form.challanNo.trim();

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
      const payload = {
        date: form.date,
        business,
        sheetName: customer,
        customer,
        mobile,
        address,
        vehicle,
        description,
        feet,
        rate,
        amount,
        deposited,
        remaining,
        due,
        tons,
        feetPerTon,
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

      setLastSlip({ ...payload, challanNo: actualChallanNo });
      setStatus(`বিক্রয় হিসাব (চালান নং: ${actualChallanNo}) Google Sheet-এ সফলভাবে যোগ হয়েছে।`);
      setError('');
      setForm({
        ...getInitialForm(),
        customer,
        challanNo: String(nextChallanNum),
      });
      await fetchCustomerSummary(customer);
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

  const fetchCustomerSummary = async (customerName) => {
    setIsFetchingData(true);
    const requestId = customerSummaryRequest.current + 1;
    customerSummaryRequest.current = requestId;

    if (!customerName) {
      setIsFetchingData(false);
      return;
    }

    try {
      const response = await fetch(`/api/customer-summary?customer=${encodeURIComponent(customerName)}`);
      if (!response.ok) {
        setIsFetchingData(false);
        return;
      }

      const data = await response.json();
      if (customerSummaryRequest.current !== requestId) {
        setIsFetchingData(false);
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
        setIsFetchingData(false);
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
      setIsFetchingData(false);
    }
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

    fetchCustomerSummary(trimmedName);
  };

  const handleDeleteCustomer = async () => {
    const currentCustomer = form.customer.trim();
    if (!currentCustomer) return;

    const confirmed = window.confirm(`"${currentCustomer}" নামটি মুছে ফেলবেন?`);
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
    const tons = Number(lastSlip.tons || 0).toLocaleString('en-BD');
    const feetPerTon = Number(lastSlip.feetPerTon || 0).toLocaleString('en-BD');
    const feet = Number(lastSlip.feet || 0).toLocaleString('en-BD');
    const rate = '৳ ' + Number(lastSlip.rate || 0).toLocaleString('en-BD');
    const amount = '৳ ' + Number(lastSlip.amount || 0).toLocaleString('en-BD');
    const deposited = '৳ ' + Number(lastSlip.deposited || 0).toLocaleString('en-BD');
    const remaining = '৳ ' + Number(lastSlip.remaining || 0).toLocaleString('en-BD');
    const due = '৳ ' + Number(lastSlip.due || 0).toLocaleString('en-BD');
    const challanNo = lastSlip.challanNo || '—';
    const totalAmount = '৳ ' + Number(lastSlip.amount || 0).toLocaleString('en-BD');

    const buildSlip = (copyLabel) => `
      <div class="slip">
        <div class="slip-inner">
          <div class="business-header">
            <div class="header-top-row">
              <div class="mst-logo">MST</div>
              <div class="titles">
                <h1 class="bn-company">মেসার্স সাইফুল ট্রেডার্স এন্ড স্টোন ক্রাশার</h1>
                <h2 class="en-company">M/S SAIFUL TRADERS &amp; STONE CRUSHER</h2>
              </div>
              <div class="copy-tag">${copyLabel}</div>
            </div>
            <p class="tagline">সাদা এলসি, কালো এলসি, কয়লা সহ সর্বপ্রকার ভাঙ্গা পাথর ও বালুর নির্ভরযোগ্য প্রতিষ্ঠান</p>
            <div class="contact-pill">
              <span>প্রোঃ জাকির হোসেন মোয়াজী</span>
              <span class="divider"></span>
              <span>মোবা: 01711-662074, 01834-863675</span>
            </div>
          </div>

          <div class="office-bars">
            <div class="office-bar">হেড অফিস: তামাবিল, গোয়াইনঘাট, সিলেট।</div>
            <div class="office-bar">শাখা অফিস: সুতারকান্দি, সিলেট।</div>
          </div>

          <div class="divider-line"></div>

          <table class="data-table info-table">
            <tbody>
              <tr>
                <th>তারিখ</th>
                <td>${date}</td>
              </tr>
              <tr>
                <th>চালান নং</th>
                <td class="strong">${challanNo}</td>
              </tr>
              <tr>
                <th>গ্রাহকের নাম</th>
                <td class="strong">${customer}</td>
              </tr>
              <tr>
                <th>গাড়ি</th>
                <td>${vehicle}</td>
              </tr>
              ${mobile ? `
              <tr>
                <th>মোবাইল</th>
                <td>${mobile}</td>
              </tr>` : ''}
              ${address ? `
              <tr>
                <th>ঠিকানা</th>
                <td>${address}</td>
              </tr>` : ''}
            </tbody>
          </table>

          <div class="spacer-row"></div>

          <table class="data-table calc-table">
            <tbody>
              <tr>
                <th>টন</th>
                <td>${tons}</td>
                <th>ফুট</th>
                <td>${feet}</td>
              </tr>
              <tr>
                <th>গুণ</th>
                <td>${feetPerTon}</td>
                <th>দর (ফুট প্রতি)</th>
                <td>${rate}</td>
              </tr>
            </tbody>
          </table>

          <div class="spacer-row"></div>

          <table class="data-table payment-table">
            <tbody>
              <tr>
                <th>মোট টাকা</th>
                <td class="strong highlight">${amount}</td>
              </tr>
              <tr>
                <th>জমা</th>
                <td>${deposited}</td>
              </tr>
              <tr>
                <th>অবশিষ্ট</th>
                <td class="strong remain">${remaining}</td>
              </tr>
              <tr>
                <th>পাওনা</th>
                <td class="strong due">${due}</td>
              </tr>
              <tr>
                <th>বিবরণ</th>
                <td>${description}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer-block">
            <div class="sig-row">
              <div class="sig-col">
                <span class="sig-line"></span>
                <span class="sig-label">ড্রাইভারের স্বাক্ষর</span>
              </div>
              <div class="sig-col">
                <span class="sig-line"></span>
                <span class="sig-label">ক্রেতার স্বাক্ষর</span>
              </div>
              <div class="sig-col right">
                <span class="sig-line"></span>
                <span class="sig-label small">পক্ষে: মেসার্স সাইফুল ট্রেডার্স এন্ড স্টোন ক্রাশার</span>
              </div>
            </div>

            <div class="footer-banner">
              <span class="banner-left">সততা ব্যবসার মূলধন</span>
              <span class="banner-right">ধন্যবাদ আবার আসবেন</span>
            </div>
          </div>
        </div>
      </div>
    `;

    const slipHtml = `
      <html>
        <head>
          <title>Saiful Traders Sales Slip — চালান নং ${challanNo}</title>
          <style>
            * { box-sizing: border-box; }
            html, body {
              margin: 0;
              padding: 0;
              font-family: 'Hind Siliguri', 'Noto Sans Bengali', Arial, sans-serif;
              color: #111827;
              background: #eef2f7;
            }

            .page {
              width: 297mm;
              height: 210mm;
              padding: 5mm;
              margin: 10px auto;
              background: #fff;
              display: flex;
              flex-direction: row;
              gap: 5mm;
              box-shadow: 0 6px 24px rgba(0,0,0,0.08);
            }

            .slip {
              flex: 1;
              background: #ffffff;
              border: 1px solid #cdd5e1;
              border-radius: 6px;
              overflow: hidden;
              display: flex;
            }
            .slip-inner {
              width: 100%;
              padding: 10px 14px 10px;
              display: flex;
              flex-direction: column;
              gap: 6px;
            }

            .business-header {
              text-align: center;
              color: #1e3a8a;
              position: relative;
            }
            .header-top-row {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              margin-bottom: 2px;
            }
            .titles { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 1px; }
            .mst-logo {
              width: 42px;
              height: 42px;
              border: 2.5px solid #1e3a8a;
              border-radius: 50%;
              display: grid;
              place-items: center;
              font-family: 'Georgia', serif;
              font-weight: 700;
              font-size: 14px;
              letter-spacing: 0.5px;
              color: #1e3a8a;
              background: #fff;
              flex-shrink: 0;
              position: relative;
            }
            .mst-logo::after {
              content: '';
              position: absolute;
              bottom: 5px; left: 6px; right: 6px;
              height: 3px;
              border-top: 1.5px solid #1e3a8a;
              border-bottom: 1.5px solid #1e3a8a;
              opacity: 0.6;
            }
            .copy-tag {
              min-width: 70px;
              padding: 3px 8px;
              border: 1.5px solid #1e3a8a;
              border-radius: 999px;
              color: #1e3a8a;
              font-weight: 700;
              font-size: 10px;
              letter-spacing: 0.3px;
              background: #eff6ff;
              flex-shrink: 0;
              text-align: center;
            }
            .bn-company {
              font-size: 18px;
              font-weight: 800;
              line-height: 1.15;
              color: #1e3a8a;
              margin: 0;
            }
            .en-company {
              font-family: 'Georgia', serif;
              font-size: 15px;
              font-weight: 700;
              letter-spacing: 0.5px;
              color: #1e3a8a;
              margin: 0;
              line-height: 1.15;
            }
            .tagline {
              font-size: 10.5px;
              font-weight: 500;
              color: #1f2937;
              margin: 2px 0 4px;
              line-height: 1.35;
            }
            .contact-pill {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              flex-wrap: wrap;
              gap: 4px 10px;
              background: #1e3a8a;
              color: #ffffff;
              padding: 4px 14px;
              border-radius: 999px;
              font-weight: 700;
              font-size: 10.5px;
            }
            .contact-pill .divider {
              width: 1px; height: 12px; background: rgba(255,255,255,0.25);
            }

            .office-bars {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 6px;
            }
            .office-bar {
              background: #1e3a8a;
              color: #ffffff;
              padding: 5px 10px;
              font-weight: 600;
              font-size: 10.5px;
              border-radius: 4px;
              text-align: center;
              line-height: 1.25;
            }

            .divider-line {
              height: 2px;
              background: linear-gradient(90deg, transparent, #1e3a8a 20%, #1e3a8a 80%, transparent);
              opacity: 0.55;
            }

            .spacer-row {
              height: 8px;
            }

            .data-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              table-layout: fixed;
            }
            .data-table th, .data-table td {
              border: 1px solid #c9d3e3;
              padding: 7px 10px;
              vertical-align: middle;
              word-wrap: break-word;
              line-height: 1.45;
            }
            .data-table th {
              background: #eef4ff;
              color: #1e3a8a;
              font-weight: 700;
              text-align: left;
              width: 32%;
              padding-right: 10px;
            }
            .data-table td {
              color: #111827;
              width: 68%;
            }
            .data-table .strong { font-weight: 700; color: #111827; }
            .data-table .highlight { color: #1e3a8a; font-weight: 800; }
            .data-table .remain { color: #047857; }
            .data-table .due { color: #b91c1c; }

            /* ── Info / Calc / Payment tables: common look ── */
            .data-table.info-table,
            .data-table.calc-table,
            .data-table.payment-table {
              border: 1.5px solid #94a3b8;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
            }
            .data-table.info-table th,
            .data-table.calc-table th,
            .data-table.payment-table th {
              font-size: 11.5px;
              letter-spacing: 0.2px;
            }
            .data-table.info-table td,
            .data-table.calc-table td,
            .data-table.payment-table td {
              font-size: 12.5px;
              background: #ffffff;
            }
            /* zebra stripe (light alt) */
            .data-table.info-table tr:nth-child(even) td,
            .data-table.calc-table tr:nth-child(even) td,
            .data-table.payment-table tr:nth-child(even) td {
              background: #fafbff;
            }
            .data-table.info-table tr:nth-child(even) th,
            .data-table.calc-table tr:nth-child(even) th,
            .data-table.payment-table tr:nth-child(even) th {
              background: #e8efff;
            }

            /* ── Calc table: 4 equal columns (25% each) 2 rows — PLAIN style ── */
            .data-table.calc-table th,
            .data-table.calc-table td {
              width: 25%;
            }
            .data-table.calc-table th {
              background: #eef4ff;
              color: #1e3a8a;
              font-weight: 700;
              text-align: left;
              border: 1px solid #c9d3e3;
              padding: 7px 10px;
            }
            .data-table.calc-table td {
              color: #111827;
              background: #ffffff;
              border: 1px solid #c9d3e3;
              border-top: none;
              padding: 7px 10px;
            }
            .data-table.calc-table tr:nth-child(even) td {
              background: #fafbff;
            }
            .data-table.calc-table tr:nth-child(even) th {
              background: #e8efff;
            }

            .footer-block {
              margin-top: auto;
              display: flex;
              flex-direction: column;
              gap: 8px;
              padding-top: 2px;
            }

            .sig-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              gap: 12px;
              padding: 2px 0 0;
              width: 100%;
            }
            .sig-col {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 5px;
              flex: 1;
              min-width: 0;
            }
            .sig-col:first-child {
              align-items: flex-start;
            }
            .sig-col.right {
              align-items: flex-end;
            }
            .sig-line {
              width: 100%;
              border-top: 1.25px dashed #6b7280;
              height: 1px;
              flex-shrink: 0;
            }
            .sig-label {
              font-size: 10.5px;
              color: #374151;
              font-weight: 600;
              line-height: 1.35;
              text-align: center;
            }
            .sig-col:first-child .sig-label { text-align: left; }
            .sig-col.right .sig-label { text-align: right; }
            .sig-label.small {
              font-size: 9.5px;
              text-align: right;
              line-height: 1.25;
              max-width: none;
            }

            .footer-banner {
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: #1e3a8a;
              color: #ffffff;
              padding: 7px 18px;
              font-weight: 700;
              font-size: 12px;
              border-radius: 5px;
              gap: 12px;
              box-shadow: inset 0 1px 0 rgba(255,255,255,0.15);
            }
            .banner-left {
              flex: 1;
              text-align: left;
            }
            .banner-right {
              flex: 1;
              text-align: right;
              position: relative;
            }
            .banner-left::after {
              content: '';
              position: absolute;
              top: 0;
              bottom: 0;
              left: 50%;
              width: 1px;
              background: rgba(255,255,255,0.25);
              display: none;
            }

            @media screen {
              .slip + .slip {
                page-break-before: auto;
              }
            }
            @media print {
              @page {
                size: A4 landscape;
                margin: 0;
              }
              html, body {
                background: #fff;
                margin: 0;
                padding: 0;
              }
              .page {
                margin: 0;
                box-shadow: none;
                padding: 6mm;
                width: 297mm;
                height: 210mm;
                page-break-after: always;
              }
              .page:last-child {
                page-break-after: auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="page">
            ${buildSlip('অফিস কপি')}
            ${buildSlip('গ্রাহকের কপি')}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(slipHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
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
        </div>

        <div className="header-actions">
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

      <section className="stats-grid">
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

          <div className="inline-row">
            <label>
              গাড়ি
              <input
                type="text"
                value={form.vehicle}
                onChange={(event) => setForm({ ...form, vehicle: event.target.value })}
                placeholder="যেমন: রাজভোগ ১০"
              />
            </label>

            <label>
              বিবরণ
              <input
                type="text"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="যেমন: বালু, নুড়ি, ইট"
              />
            </label>
          </div>

          <div
            className="inline-row"
            style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}
          >
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

            <div className="formula-group">
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

          <div className="inline-row">
            <label>
              টাকা
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9০-৯]*"
                value={form.amount}
                readOnly
                aria-label="গণনা করা টাকা"
              />
            </label>

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
              PDF স্লিপ ডাউনলোড
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
