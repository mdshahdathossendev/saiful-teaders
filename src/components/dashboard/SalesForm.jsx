import LocationPinIcon from './LocationPinIcon';

export default function SalesForm({
  form,
  setForm,
  feetMode,
  customerOptions,
  selectedCustomerObj,
  error,
  status,
  isSubmitting,
  onNumberInput,
  onFeetModeChange,
  onSelectCustomer,
  onSubmit,
}) {
  return (
    <section className="single-form-panel">
      <form onSubmit={onSubmit} className="sales-form">

        {/* ── Date + Customer ── */}
        <div className="inline-row">
          <label>
            তারিখ
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>

          <label className="customer-select-field">
            গ্রাহকের নাম
            <select
              value={form.customer}
              onChange={(e) => onSelectCustomer(e.target.value)}
              aria-label="গ্রাহকের নাম"
            >
              <option value="">-- নির্বাচন করুন --</option>
              {customerOptions.map((opt) => (
                <option key={opt.name} value={opt.name}>
                  {opt.name}{opt.mobile ? ` (${opt.mobile})` : ''}
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

        {/* ── Description ── */}
        <div className="inline-row description-full-row">
          <label className="description-label-full">
            মালের বিবরণ
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="যেমন: বালু, নুড়ি, ইট"
              className="description-input-full"
            />
          </label>
        </div>

        {/* ── Feet mode toggle ── */}
        <div className="feet-mode-selector" role="radiogroup" aria-label="ফুট ক্যালকুলেশন মোড">
          {[['tons', 'টন × গুণ'], ['measurement', 'গাড়ির পরিমাপ']].map(([val, label]) => (
            <label key={val} className={`feet-mode-option ${feetMode === val ? 'active' : ''}`}>
              <input
                type="radio"
                name="feetMode"
                value={val}
                checked={feetMode === val}
                onChange={() => onFeetModeChange(val)}
              />
              <span className="radio-dot" aria-hidden="true" />
              <span>{label}</span>
            </label>
          ))}
        </div>

        {/* ── Formula cards ── */}
        <div
          className="inline-row formula-cards-grid"
          style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}
        >
          {/* Tons card */}
          <div className={`formula-card ${feetMode === 'tons' ? 'active' : ''}`}>
            <div className="formula-group">
              <label>
                টন
                <input type="text" inputMode="numeric" value={form.tons}
                  onChange={(e) => onNumberInput('tons', e.target.value)} placeholder="টন" />
              </label>
              <span className="formula-symbol" aria-hidden="true">×</span>
              <label>
                গুণ
                <input type="text" inputMode="numeric" value={form.feetPerTon}
                  onChange={(e) => onNumberInput('feetPerTon', e.target.value)} placeholder="গুণ" />
              </label>
            </div>
          </div>

          {/* Measurement card */}
          <div className={`formula-card ${feetMode === 'measurement' ? 'active' : ''}`}>
            <div className="formula-group measurement-formula">
              <label>
                দৈর্ঘ্য
                <input type="text" inputMode="decimal" value={form.length}
                  onChange={(e) => onNumberInput('length', e.target.value)} placeholder="দৈর্ঘ্য" />
              </label>
              <span className="formula-symbol small" aria-hidden="true">×</span>
              <label>
                প্রস্থ
                <input type="text" inputMode="decimal" value={form.width}
                  onChange={(e) => onNumberInput('width', e.target.value)} placeholder="প্রস্থ" />
              </label>
              <span className="formula-symbol small" aria-hidden="true">×</span>
              <label>
                উচ্চতা
                <input type="text" inputMode="decimal" value={form.height}
                  onChange={(e) => onNumberInput('height', e.target.value)} placeholder="উচ্চতা" />
              </label>
            </div>
          </div>
        </div>

        {/* ── Feet × Rate = Amount ── */}
        <div className="inline-row full-width-row amount-line">
          <div className="formula-group amount-formula">
            <label>
              ফুট
              <input type="text" value={form.feet} readOnly aria-label="গণনা করা ফুট" />
            </label>
            <span className="formula-symbol" aria-hidden="true">×</span>
            <label>
              দর
              <input type="text" inputMode="numeric" value={form.rate}
                onChange={(e) => onNumberInput('rate', e.target.value)} placeholder="দর" />
            </label>
            <span className="formula-symbol" aria-hidden="true">=</span>
            <label>
              টাকা
              <input type="text" value={form.amount} readOnly className="amount-input" aria-label="টাকা" />
            </label>
          </div>
        </div>

        {/* ── Truck & Driver ── */}
        <div className="truck-info-section">
          <div className="truck-info-header">
            <span className="truck-info-title">🚛 গাড়ি ও ড্রাইভার তথ্য</span>
            <span className="truck-info-note">( শুধু স্লিপে দেখাবে, শিটে যাবে না )</span>
          </div>

          <div className="inline-row">
            {[
              ['vehicle',     'গাড়ি নাম্বার',        'text', 'যেমন: রাজভোগ ১০'],
              ['driverName',  'ড্রাইভারের নাম',      'text', 'যেমন: রহিম উদ্দিন'],
              ['driverMobile','ড্রাইভারের মোবাইল',   'tel',  'যেমন: ০১৭XXXXXXXX'],
              ['destination', 'গন্তব্য স্থান',        'text', 'যেমন: সিলেট সদর'],
            ].map(([field, labelText, type, placeholder]) => (
              <label key={field}>
                {labelText}
                <input
                  type={type}
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  placeholder={placeholder}
                />
              </label>
            ))}
          </div>

          <div className="inline-row full-width-row amount-line">
            <div className="formula-group amount-formula">
              <label>
                ফুট
                <input type="text" value={form.feet} readOnly />
              </label>
              <span className="formula-symbol" aria-hidden="true">×</span>
              <label>
                প্রতি ফুট ভাড়া
                <input type="text" inputMode="numeric" value={form.truckRatePerFoot}
                  onChange={(e) => onNumberInput('truckRatePerFoot', e.target.value)} placeholder="প্রতি ফুট ভাড়া" />
              </label>
              <span className="formula-symbol" aria-hidden="true">=</span>
              <label>
                মোট গাড়ি ভাড়া
                <input type="text" value={form.truckCharge} readOnly className="amount-input truck-charge-result" />
              </label>
            </div>
          </div>
        </div>

        {/* ── Balance row ── */}
        <div className="inline-row">
          <label>
            মোট জমা
            <input type="text" inputMode="numeric" value={form.depositedTotal} readOnly />
          </label>
          <label>
            নতুন জমা
            <input type="text" inputMode="numeric" value={form.deposited}
              onChange={(e) => onNumberInput('deposited', e.target.value)} placeholder="যেমন: ০ বা 0" />
          </label>
          <label>
            অবশিষ্ট
            <input type="text" inputMode="numeric" value={form.remaining} readOnly />
          </label>
          <label>
            পাওনা
            <input type="text" inputMode="numeric" value={form.due} readOnly />
          </label>
        </div>

        {/* ── Challan ── */}
        <div className="inline-row challan-only-row">
          <label>
            চালান নং (অটোমেটিক)
            <input type="text" value={form.challanNo} readOnly className="auto-challan-input" />
          </label>
        </div>

        {error  && <p className="error-text">{error}</p>}
        {status && <p className="success-text">{status}</p>}

        {/* ── Submit ── */}
        <button
          type="submit"
          className="primary-btn full-width-btn submit-sheet-btn"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <><span className="submit-spinner" aria-hidden="true" /><span>সেভ হচ্ছে...</span></>
          ) : (
            <><span className="submit-icon" aria-hidden="true">☁️</span><span>Google Sheet এ জমা দিন</span><span className="submit-arrow" aria-hidden="true">→</span></>
          )}
        </button>
      </form>
    </section>
  );
}
