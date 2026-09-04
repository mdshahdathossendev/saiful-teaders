'use client';

import Link from 'next/link';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useRef, useState, useEffect } from 'react';

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'admin123';
const GOOGLE_SHEET_WEB_APP_URL =
  process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEB_APP_URL ||
  'PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';

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
          setForm((prev) => {
            if (!prev.customer && data.customers.length > 0) {
              const firstCustomer = data.customers[0].name;
              fetchCustomerSummary(firstCustomer);
              return { ...prev, customer: firstCustomer };
            }
            return prev;
          });
        }
      }
    } catch (e) {}
    setIsFetchingData(false);
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchNextChallanNo();
      fetchCustomers();
    }
  }, [isLoggedIn]);

  const handleLogin = (event) => {
    event.preventDefault();

    if (username.trim() === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
      setIsLoggedIn(true);
      setError('');
      setStatus('');
      return;
    }

    setError('ভুল ইউজারনেম বা পাসওয়ার্ড। ডিফল্ট: admin / admin123');
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
      setStatus(
        'Google Sheet Web App URL কনফিগার করুন। .env.local-এ NEXT_PUBLIC_GOOGLE_SHEET_WEB_APP_URL সেট করুন।'
      );
      setError('');
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

      if (!response.ok) {
        throw new Error('Google Sheet submission failed');
      }

      const submitResult = await response.json();
      
      let actualChallanNo = challanNo;
      if (submitResult.response) {
        try {
          const parsedGAS = JSON.parse(submitResult.response);
          if (parsedGAS.challanNo) {
            actualChallanNo = String(parsedGAS.challanNo);
          }
        } catch (e) {}
      }

      const currentChallanNum = parseInt(actualChallanNo, 10) || DEFAULT_INITIAL_CHALLAN;
      const nextChallanNum = currentChallanNum + 1;

      setLastSlip({ ...payload, challanNo: actualChallanNo });
      setStatus(`বিক্রয় হিসাব (চালান নং: ${actualChallanNo}) Google Sheet-এ সফলভাবে যোগ হয়েছে।`);
      setForm({
        ...getInitialForm(),
        customer,
        challanNo: String(nextChallanNum),
      });
      await fetchCustomerSummary(customer);
    } catch (submitError) {
      setStatus('Google Sheet-এ ডাটা পাঠানো সম্ভব হয়নি। URL ঠিক আছে কিনা দেখুন।');
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

    const printWindow = window.open('', '_blank', 'width=900,height=700');

    if (!printWindow) {
      return;
    }

    const slipHtml = `
      <html>
        <head>
          <title>Saiful Traders Sales Slip</title>
          <style>
            * {
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 28px;
              background: #f3f4f6;
              color: #111827;
            }
            .slip {
              max-width: 820px;
              margin: 0 auto;
              background: #ffffff;
              border: 1px solid #d1d5db;
              border-radius: 18px;
              box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
              padding: 28px 26px 22px;
            }
            .title {
              font-size: 14px;
              font-weight: 700;
              text-align: center;
              margin: 0 0 6px;
              color: #6b7280;
              letter-spacing: 1px;
              text-transform: uppercase;
            }
            .customer-banner {
              text-align: center;
              background: linear-gradient(135deg, #1e3a8a, #1d4ed8);
              color: #ffffff;
              border-radius: 14px;
              padding: 16px 20px;
              margin-bottom: 20px;
            }
            .customer-big-name {
              font-size: 26px;
              font-weight: 800;
              line-height: 1.2;
              margin-bottom: 6px;
            }
            .customer-sub-meta {
              font-size: 13px;
              font-weight: 600;
              color: #e2e8f0;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 16px;
              flex-wrap: wrap;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(220px, 1fr));
              gap: 14px 18px;
            }
            .field {
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              background: #f9fafb;
              padding: 10px 12px;
              min-height: 68px;
            }
            .field.full {
              grid-column: 1 / -1;
            }
            .label {
              display: block;
              font-size: 11px;
              font-weight: 700;
              color: #374151;
              text-transform: uppercase;
              letter-spacing: 0.6px;
              margin-bottom: 6px;
            }
            .value {
              display: block;
              font-size: 17px;
              font-weight: 600;
              color: #111827;
              line-height: 1.45;
              word-break: break-word;
            }
            .total-box {
              margin-top: 18px;
              border: 1px solid #dbeafe;
              background: linear-gradient(135deg, #eff6ff, #f8fafc);
              border-radius: 12px;
              padding: 14px 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-weight: 700;
              color: #1f2937;
            }
            .total-box strong {
              font-size: 26px;
              color: #1d4ed8;
            }
          </style>
        </head>
        <body>
          <div class="slip">
            <div class="title">Saiful Traders — Sales Slip</div>

            <div class="customer-banner">
              <div class="customer-big-name">${lastSlip.customer}</div>
              ${(lastSlip.mobile || lastSlip.address) ? `
                <div class="customer-sub-meta">
                  ${lastSlip.mobile ? `<span>📞 মোবাইল: ${lastSlip.mobile}</span>` : ''}
                  ${lastSlip.address ? `<span>📍 ঠিকানা: ${lastSlip.address}</span>` : ''}
                </div>
              ` : ''}
            </div>

            <div class="grid">
              <div class="field">
                <span class="label">তারিখ</span>
                <span class="value">${lastSlip.date}</span>
              </div>

              <div class="field">
                <span class="label">গ্রাহকের নাম</span>
                <span class="value">${lastSlip.customer}</span>
              </div>

              <div class="field">
                <span class="label">গাড়ি</span>
                <span class="value">${lastSlip.vehicle || '—'}</span>
              </div>
              <div class="field">
                <span class="label">ফুট</span>
                <span class="value">${Number(lastSlip.feet || 0)}</span>
              </div>

              <div class="field">
                <span class="label">দর</span>
                <span class="value">৳ ${Number(lastSlip.rate || 0).toLocaleString('en-BD')}</span>
              </div>

              <div class="field">
                <span class="label">জমা</span>
                <span class="value">৳ ${Number(lastSlip.deposited || 0).toLocaleString('en-BD')}</span>
              </div>

              <div class="field">
                <span class="label">অবশিষ্ট</span>
                <span class="value">৳ ${Number(lastSlip.remaining || 0).toLocaleString('en-BD')}</span>
              </div>

              <div class="field">
                <span class="label">পাওনা</span>
                <span class="value">৳ ${Number(lastSlip.due || 0).toLocaleString('en-BD')}</span>
              </div>

              <div class="field">
                <span class="label">টন</span>
                <span class="value">${Number(lastSlip.tons || 0).toLocaleString('en-BD')}</span>
              </div>

              <div class="field">
                <span class="label">টাকা</span>
                <span class="value">৳ ${Number(lastSlip.amount || 0).toLocaleString('en-BD')}</span>
              </div>

              <div class="field full">
                <span class="label">বিবরণ</span>
                <span class="value">${lastSlip.description || '—'}</span>
              </div>

              <div class="field">
                <span class="label">চালান নং</span>
                <span class="value">${lastSlip.challanNo || '—'}</span>
              </div>

            </div>

            <div class="total-box">
              <span>মোট মূল্য</span>
              <strong>৳ ${Number(lastSlip.amount || 0).toLocaleString('en-BD')}</strong>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(slipHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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
          <button type="button" onClick={handleAddCustomer} className="secondary-btn small-btn action-btn" title="কাস্টমার যোগ করুন">
            <span aria-hidden="true">＋</span>
            <span>কাস্টমার যোগ করুন</span>
          </button>
          <button type="button" onClick={handleDeleteCustomer} className="secondary-btn small-btn action-btn" title="কাস্টমার ডিলেট করুন">
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

          {status ? <p className={error ? 'error-text' : 'success-text'}>{status}</p> : null}

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
