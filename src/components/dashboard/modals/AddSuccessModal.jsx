export default function AddSuccessModal({ customerName, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="cust-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div
          className="cust-modal-icon-wrap"
          style={{ background: '#f0fdf4', boxShadow: '0 0 0 8px rgba(22,163,74,0.1)' }}
        >
          <svg viewBox="0 0 56 56" fill="none" width="40" height="40">
            <circle cx="28" cy="28" r="28" fill="#dcfce7" />
            <circle cx="28" cy="28" r="21" fill="#16a34a" />
            <polyline points="17,28 24,35 39,20" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="cust-modal-title" style={{ color: '#15803d' }}>গ্রাহক যোগ হয়েছে!</h3>
        <p className="cust-modal-sub">
          <strong>&ldquo;{customerName}&rdquo;</strong> সফলভাবে গ্রাহক তালিকায় যোগ হয়েছে এবং Google Sheet-এ একটি নতুন হিসাব শিট তৈরি হয়েছে।
        </p>
        <button
          type="button"
          className="cust-confirm-btn add-confirm-btn"
          style={{ width: '100%', marginTop: '0.5rem' }}
          onClick={onClose}
        >
          ঠিক আছে
        </button>
      </div>
    </div>
  );
}
