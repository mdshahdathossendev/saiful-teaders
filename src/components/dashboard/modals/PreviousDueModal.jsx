export default function PreviousDueModal({
  customerName,
  previousDueAmount,
  setPreviousDueAmount,
  error,
  status,
  isSubmitting,
  onConfirm,
  onClose,
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📋 পাওয়া এড</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="বন্ধ করুন">✕</button>
        </div>

        <div className="modal-body">
          <p style={{ margin: '0 0 0.5rem', fontWeight: 600, color: '#374151' }}>
            গ্রাহক: <strong>{customerName || '—'}</strong>
          </p>
          <label className="modal-label">
            আগের পাওয়ানা টাকা (টাকা) <span className="required-mark">*</span>
            <input
              type="text"
              inputMode="numeric"
              value={previousDueAmount}
              onChange={(e) => setPreviousDueAmount(e.target.value.replace(/[^\d.০-৯]/g, ''))}
              placeholder="যেমন: ১০০০০"
              autoFocus
            />
          </label>
          {error  && <p className="error-text">{error}</p>}
          {status && <p className="success-text">{status}</p>}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="secondary-btn modal-cancel-btn"
            onClick={onClose}
          >
            বাতিল
          </button>
          <button
            type="button"
            className="previous-due-confirm-btn"
            disabled={isSubmitting || !previousDueAmount || !customerName}
            onClick={onConfirm}
          >
            {isSubmitting ? <><span className="submit-spinner" /> যোগ হচ্ছে...</> : 'পাওয়া এড করুন'}
          </button>
        </div>
      </div>
    </div>
  );
}
