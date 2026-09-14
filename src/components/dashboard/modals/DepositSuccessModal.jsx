export default function DepositSuccessModal({ customerName, amount, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="deposit-success-panel" onClick={(e) => e.stopPropagation()}>
        <div className="deposit-success-ring">
          <svg viewBox="0 0 72 72" fill="none" className="deposit-success-svg">
            <circle cx="36" cy="36" r="36" fill="#dcfce7" />
            <circle cx="36" cy="36" r="27" fill="#16a34a" />
            <polyline points="22,36 31,45 50,26" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="deposit-success-title">জমা সফল হয়েছে!</h3>
        <div className="deposit-success-amount">৳ {Number(amount).toLocaleString('bn-BD')}</div>
        <p className="deposit-success-sub">
          <strong>{customerName}</strong>-এর হিসাবে জমা যোগ হয়েছে
        </p>
        <button type="button" className="deposit-success-ok" onClick={onClose}>ঠিক আছে</button>
      </div>
    </div>
  );
}
