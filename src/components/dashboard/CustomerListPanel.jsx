import LocationPinIcon from './LocationPinIcon';

export default function CustomerListPanel({
  form,
  customerOptions,
  filteredCustomerOptions,
  selectedCustomerObj,
  customerSearch,
  setCustomerSearch,
  onSelectCustomer,
  onOpenSheet,
  onAddCustomer,
  onDeleteCustomer,
  onOpenDepositModal,
  onOpenPreviousDueModal,
}) {
  return (
    <section className="customer-list-panel">
      {/* ── Header row ── */}
      <div className="panel-header-row">
        <div className="panel-title-group">
          <h3>গ্রাহক তালিকা</h3>
          <span className="customer-count-chip">{customerOptions.length} জন</span>
        </div>

        <div className="panel-actions">
          {/* Search */}
          <div className="customer-search-wrapper">
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="customer-search-input"
              placeholder="খুঁজুন (নাম, মোবাইল বা ঠিকানা)..."
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

          <button type="button" className="add-customer-quick-btn" onClick={onAddCustomer} title="নতুন গ্রাহক">
            <span className="plus-icon">＋</span>
            <span>নতুন গ্রাহক</span>
          </button>

          <button
            type="button"
            className="delete-customer-quick-btn"
            onClick={onDeleteCustomer}
            disabled={!form.customer}
            title="নির্বাচিত গ্রাহক মুছুন"
          >
            <span className="minus-icon">−</span>
            <span>গ্রাহক বাতিল</span>
          </button>

          <button
            type="button"
            className="deposit-only-btn"
            onClick={onOpenDepositModal}
            disabled={!form.customer}
            title="শুধু জমা দিন"
          >
            <span aria-hidden="true">💰</span>
            <span>জমা দিন</span>
          </button>

          <button
            type="button"
            className="previous-due-btn"
            onClick={onOpenPreviousDueModal}
            disabled={!form.customer}
            title="আগের পাওয়ানা যোগ করুন"
          >
            <span aria-hidden="true">📋</span>
            <span>পাওয়া এড</span>
          </button>
        </div>
      </div>

      {/* ── Selected sheet banner ── */}
      <div className="selected-sheet-banner">
        <div className="selected-sheet-info">
          <span className="sheet-label">নির্বাচিত গ্রাহক শিট</span>
          <div className="selected-sheet-details">
            <strong className="selected-sheet-name">
              {form.customer || 'কোনো গ্রাহক নির্বাচন হয়নি'}
            </strong>
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
          onClick={onOpenSheet}
          disabled={!form.customer}
        >
          <span>ওপেন শিট</span>
          <span className="btn-arrow" aria-hidden="true">→</span>
        </button>
      </div>

      {/* ── Customer grid ── */}
      <div className="customer-grid">
        {filteredCustomerOptions.length === 0 ? (
          <div className="customer-empty-card">
            <span className="empty-icon">👥</span>
            <p>
              {customerSearch
                ? 'আপনার অনুসন্ধান অনুযায়ী কোনো গ্রাহক পাওয়া যায়নি'
                : 'কোনো গ্রাহক নেই। নতুন গ্রাহক যোগ করুন।'}
            </p>
          </div>
        ) : (
          filteredCustomerOptions.map((opt) => {
            const isSelected = form.customer === opt.name;
            const initial = opt.name.trim().charAt(0) || 'ক';
            return (
              <div
                key={opt.name}
                className={`customer-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectCustomer(opt.name)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectCustomer(opt.name); }}
              >
                <div className="customer-card-top">
                  <div className="customer-avatar-badge">{initial}</div>
                  <div className="customer-card-main-info">
                    <span className="customer-card-name">{opt.name}</span>
                    <span className="customer-card-address" title={opt.address || ''}>
                      <LocationPinIcon size={13} className="address-pin-icon" />
                      <span>{opt.address || 'ঠিকানা দেওয়া হয়নি'}</span>
                    </span>
                  </div>
                  {isSelected && <span className="selected-check-dot">✓</span>}
                </div>

                <div className="customer-card-details">
                  {opt.mobile ? (
                    <a
                      href={`tel:${opt.mobile}`}
                      className="customer-phone-call-btn"
                      onClick={(e) => { e.stopPropagation(); onSelectCustomer(opt.name); }}
                      title={`${opt.name}-কে কল করুন: ${opt.mobile}`}
                    >
                      <span className="detail-icon">📞</span>
                      <span className="phone-num-text">{opt.mobile}</span>
                      <span className="call-now-tag">কল দিন 📲</span>
                    </a>
                  ) : (
                    <div className="customer-phone-call-btn no-mobile">
                      <span className="detail-icon">📞</span>
                      <span className="phone-num-text">নম্বর দেওয়া হয়নি</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
