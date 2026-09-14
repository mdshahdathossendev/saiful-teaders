export default function DepositModal({
  customerName,
  depositAmount,
  setDepositAmount,
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
          <h3>💰 জমা দিন</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="বন্ধ করুন">✕</button>
        </div>

        <div className="modal-body">
          <p style={{ margin: '0 0 0.5rem', fontWeight: 600, color: '#374151' }}>
            গ্রাহক: <strong>{customerName || '—'}</strong>
          </p>
          <label className="modal-label">
            জমার পরিমাণ (টাকা) <span className="required-mark">*</span>
            <input
              type="text"
              inputMode="numeric"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value.replace(/[^\d.০-৯]/g, ''))}
              placeholder="যেমন: ৫০০০"
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
            className="deposit-confirm-btn"
            disabled={isSubmitting || !depositAmount || !customerName}
            onClick={onConfirm}
          >
            {isSubmitting ? <><span className="submit-spinner" /> জমা হচ্ছে...</> : 'জমা দিন'}
          </button>
        </div>
      </div>
    </div>
  );
}
