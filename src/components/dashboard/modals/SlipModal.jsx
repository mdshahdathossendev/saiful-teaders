export default function SlipModal({ challanNo, onDownload, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="slip-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="slip-modal-icon">
          <svg viewBox="0 0 56 56" fill="none" className="slip-modal-check-svg">
            <circle cx="28" cy="28" r="28" fill="#dcfce7" />
            <circle cx="28" cy="28" r="21" fill="#16a34a" />
            <polyline points="17,28 24,35 39,20" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="slip-modal-title">ডাটা সফলভাবে যোগ হয়েছে!</h3>
        <p className="slip-modal-sub">চালান নং: <strong>{challanNo}</strong></p>

        <button type="button" className="challan-download-btn" onClick={onDownload}>
          <span className="download-icon">📄</span>
          <span>চালান ডাউনলোড করুন</span>
          <span className="download-arrow">↓</span>
        </button>

        <button type="button" className="slip-modal-skip" onClick={onClose}>এখন নয়</button>
      </div>
    </div>
  );
}
