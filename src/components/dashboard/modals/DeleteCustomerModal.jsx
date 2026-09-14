export default function DeleteCustomerModal({ customerName, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="cust-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cust-modal-icon-wrap delete-icon-wrap">
          <span className="cust-modal-icon">🗑️</span>
        </div>
        <h3 className="cust-modal-title delete-title">গ্রাহক মুছে ফেলবেন?</h3>
        <p className="cust-modal-sub">
          <strong>&ldquo;{customerName}&rdquo;</strong> নামের গ্রাহকের সম্পূর্ণ হিসাব শিট ও সকল চালান স্থায়ীভাবে মুছে যাবে।
        </p>
        <div className="delete-warning-box">⚠️ এই কাজটি আর ফিরিয়ে আনা যাবে না</div>
        <div className="cust-modal-actions">
          <button type="button" className="cust-cancel-btn" onClick={onClose}>না, রাখুন</button>
          <button type="button" className="cust-confirm-btn delete-confirm-btn" onClick={onConfirm}>হ্যাঁ, মুছুন</button>
        </div>
      </div>
    </div>
  );
}
