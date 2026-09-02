'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

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

const DEFAULT_CUSTOMER_OPTIONS = [];

const CUSTOMER_STORAGE_KEY = 'saiful-traders-customers';

const normalizeCustomerOptions = (options = []) => {
  if (!Array.isArray(options)) {
    return [];
  }

  return Array.from(
    new Set(
      options
        .map((option) => String(option).trim())
        .filter(Boolean)
    )
  );
};

const getStoredCustomerOptions = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_CUSTOMER_OPTIONS;
  }

  try {
    const stored = window.localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_CUSTOMER_OPTIONS;
    }

    const parsed = JSON.parse(stored);
    return normalizeCustomerOptions(parsed);
  } catch (error) {
    return DEFAULT_CUSTOMER_OPTIONS;
  }
};

const persistCustomerOptions = (options) => {
  const normalized = normalizeCustomerOptions(options);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(normalized));
  }

  return normalized;
};

const getInitialForm = () => ({
  date: new Date().toISOString().split('T')[0],
  business: '',
  customer: getStoredCustomerOptions()[0] || '',
  vehicle: '',
  description: '',
  feet: '',
  rate: '',
  amount: '',
  remaining: '',
  challanNo: '',
  note: '',
});

export default function ProjectDashboardPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(() => getInitialForm());
  const [customerOptions, setCustomerOptions] = useState(() => getStoredCustomerOptions());
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    totalAmount: 0,
    currentMonthTotal: 0,
  });
  const [lastSlip, setLastSlip] = useState(null);

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/sales-summary');
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setSummary({
        totalCustomers: Number(data.totalCustomers) || 0,
        totalAmount: Number(data.totalAmount) || 0,
        currentMonthTotal: Number(data.currentMonthTotal ?? data.totalAmount) || 0,
      });
    } catch (error) {
      setSummary({ totalCustomers: 0, totalAmount: 0, currentMonthTotal: 0 });
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    let isMounted = true;

    const loadSummary = async () => {
      try {
        const response = await fetch('/api/sales-summary');
        if (!response.ok || !isMounted) {
          return;
        }

        const data = await response.json();
        if (!isMounted) {
          return;
        }

        setSummary({
          totalCustomers: Number(data.totalCustomers) || 0,
          totalAmount: Number(data.totalAmount) || 0,
          currentMonthTotal: Number(data.currentMonthTotal ?? data.totalAmount) || 0,
        });
      } catch (error) {
        if (isMounted) {
          setSummary({ totalCustomers: 0, totalAmount: 0, currentMonthTotal: 0 });
        }
      }
    };

    loadSummary();

    return () => {
      isMounted = false;
    };
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

  const digitsToBangla = (value) => {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(value).replace(/\d/g, (digit) => banglaDigits[Number(digit)] ?? digit);
  };

  const handleNumberInput = (fieldName, value) => {
    const sanitizedValue = value.replace(/[^\d.]/g, '');
    setForm((previousForm) => ({
      ...previousForm,
      [fieldName]: sanitizedValue,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const business = form.business.trim();
    const customer = form.customer.trim();
    const vehicle = form.vehicle.trim();
    const description = form.description.trim();
    const feet = Number(form.feet) || 0;
    const rate = Number(form.rate) || 0;
    const amount = Number(form.amount) || 0;
    const remaining = Number(form.remaining) || 0;
    const challanNo = form.challanNo.trim();

    if (!customer || !vehicle || !description || !amount) {
      setStatus('গ্রাহক, গাড়ি, বিবরণ ও টাকার তথ্য লিখুন।');
      setError('');
      return;
    }

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

    try {
      const payload = {
        date: form.date,
        business,
        sheetName: customer,
        customer,
        vehicle,
        description,
        feet,
        rate,
        amount,
        remaining,
        challanNo,
        note: form.note.trim() || 'কোন নোট নেই',
        createdAt: new Date().toISOString(),
      };

      await fetch(GOOGLE_SHEET_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload),
      });

      setLastSlip(payload);
      await fetchSummary();
      setStatus('বিক্রয় হিসাব Google Sheet-এ সফলভাবে যোগ হয়েছে।');
      setForm(getInitialForm());
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

  const handleSelectCustomer = (customerName) => {
    const nextCustomer = customerName?.trim?.() || '';
    setForm((previousForm) => ({ ...previousForm, customer: nextCustomer }));
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
    const customerName = window.prompt('নতুন গ্রাহকের নাম লিখুন:', '');
    if (!customerName) {
      return;
    }

    const trimmedName = customerName.trim();
    if (!trimmedName) {
      return;
    }

    setCustomerOptions((previousOptions) => {
      const alreadyExists = previousOptions.some(
        (option) => option.toLowerCase() === trimmedName.toLowerCase()
      );

      const nextOptions = alreadyExists ? [...previousOptions] : [...previousOptions, trimmedName];
      const savedOptions = persistCustomerOptions(nextOptions);

      setForm((previousForm) => ({
        ...previousForm,
        customer: trimmedName,
      }));

      return savedOptions;
    });
  };

  const handleDeleteCustomer = () => {
    const currentCustomer = form.customer.trim();
    if (!currentCustomer) {
      return;
    }

    const confirmed = window.confirm(`"${currentCustomer}" নামটি মুছে ফেলবেন?`);
    if (!confirmed) {
      return;
    }

    setCustomerOptions((previousOptions) => {
      const nextOptions = previousOptions.filter(
        (option) => option.toLowerCase() !== currentCustomer.toLowerCase()
      );

      const savedOptions = persistCustomerOptions(nextOptions);

      if (savedOptions.length > 0) {
        setForm((previousForm) => ({ ...previousForm, customer: savedOptions[0] }));
      } else {
        setForm((previousForm) => ({ ...previousForm, customer: '' }));
      }

      return savedOptions;
    });
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
              font-size: 30px;
              font-weight: 800;
              text-align: center;
              margin: 0 0 18px;
              color: #111827;
              letter-spacing: 0.4px;
            }
            .subtitle {
              text-align: center;
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 22px;
              letter-spacing: 0.8px;
              text-transform: uppercase;
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
            <div class="title">Saiful Traders</div>
            <div class="subtitle">Sales Slip</div>

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
                <span class="label">টাকা</span>
                <span class="value">৳ ${Number(lastSlip.amount || 0).toLocaleString('en-BD')}</span>
              </div>

              <div class="field">
                <span class="label">অবশিষ্ট</span>
                <span class="value">৳ ${Number(lastSlip.remaining || 0).toLocaleString('en-BD')}</span>
              </div>

              <div class="field full">
                <span class="label">বিবরণ</span>
                <span class="value">${lastSlip.description || '—'}</span>
              </div>

              <div class="field">
                <span class="label">চালান নং</span>
                <span class="value">${lastSlip.challanNo || '—'}</span>
              </div>

              <div class="field">
                <span class="label">নোট</span>
                <span class="value">${lastSlip.note || 'কোন নোট নেই'}</span>
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
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
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
          <span>মোট গ্রাহক</span>
          <strong>{summary.totalCustomers}</strong>
        </div>

        <div className="stat-box income-box">
          <span>চলতি মাসের বিক্রয়</span>
          <strong>৳ {summary.currentMonthTotal.toLocaleString('bn-BD')}</strong>
        </div>

        <div className="stat-box profit-box">
          <span>মোট বিক্রয়</span>
          <strong>৳ {summary.totalAmount.toLocaleString('bn-BD')}</strong>
        </div>
      </section>

      <section className="customer-list-panel">
        <div className="panel-header-row">
          <h3>গ্রাহক তালিকা</h3>
          <span>{customerOptions.length} জন</span>
        </div>

        <div className="selected-sheet-banner">
          <div className="selected-sheet-info">
            <span className="sheet-label">সিলেক্টেড শিট</span>
            <strong>{form.customer || 'কোনো গ্রাহক নির্বাচন হয়নি'}</strong>
          </div>

          <button
            type="button"
            className="open-sheet-btn"
            onClick={handleOpenSelectedSheet}
            disabled={!form.customer}
          >
            ওপেন শিট
          </button>
        </div>

        <div className="customer-list">
          {customerOptions.length === 0 ? (
            <p className="empty-state">কোনো গ্রাহক নেই। নতুন গ্রাহক যোগ করুন।</p>
          ) : (
            customerOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`customer-list-item ${form.customer === option ? 'selected' : ''}`}
                onClick={() => handleSelectCustomer(option)}
              >
                {option}
              </button>
            ))
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
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
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

          <div className="inline-row">
            <label>
              ফুট
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={digitsToBangla(form.feet)}
                onChange={(event) => handleNumberInput('feet', event.target.value)}
                placeholder="যেমন: ১০"
              />
            </label>

            <label>
              দর
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={digitsToBangla(form.rate)}
                onChange={(event) => handleNumberInput('rate', event.target.value)}
                placeholder="যেমন: ৫০০"
              />
            </label>
          </div>

          <div className="inline-row">
            <label>
              টাকা
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={digitsToBangla(form.amount)}
                onChange={(event) => handleNumberInput('amount', event.target.value)}
                placeholder="যেমন: ৫০০০"
              />
            </label>

            <label>
              অবশিষ্ট
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={digitsToBangla(form.remaining)}
                onChange={(event) => handleNumberInput('remaining', event.target.value)}
                placeholder="যেমন: ০"
              />
            </label>
          </div>

          <div className="inline-row">
            <label>
              চালান নং
              <input
                type="text"
                value={form.challanNo}
                onChange={(event) => setForm({ ...form, challanNo: event.target.value })}
                placeholder="চালান নম্বর লিখুন"
              />
            </label>

            <label>
              নোট
              <textarea
                rows="2"
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
                placeholder="বিস্তারিত লিখুন"
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
    </div>
  );
}
