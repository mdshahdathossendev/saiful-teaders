export default function AddCustomerModal({ newCustomerForm, setNewCustomerForm, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="cust-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cust-modal-icon-wrap add-icon-wrap">
          <span className="cust-modal-icon">👤</span>
        </div>
        <h3 className="cust-modal-title">নতুন গ্রাহক যোগ করুন</h3>
        <p className="cust-modal-sub">গ্রাহকের তথ্য দিয়ে একটি নতুন হিসাব শিট তৈরি হবে</p>

        <div className="cust-modal-form">
          <label className="modal-label">
            গ্রাহকের নাম <span className="required-mark">*</span>
            <input
              type="text"
              value={newCustomerForm.name}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
              placeholder="গ্রাহকের নাম লিখুন"
              autoFocus
            />
          </label>
          <label className="modal-label">
            মোবাইল নাম্বার
            <input
              type="tel"
              value={newCustomerForm.mobile}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, mobile: e.target.value })}
              placeholder="যেমন: ০১৭XXXXXXXX"
            />
          </label>
          <label className="modal-label">
            ঠিকানা
            <input
              type="text"
              value={newCustomerForm.address}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
              placeholder="গ্রাহকের ঠিকানা লিখুন"
            />
          </label>
        </div>

        <div className="cust-modal-actions">
          <button type="button" className="cust-cancel-btn" onClick={onClose}>বাতিল</button>
          <button
            type="button"
            className="cust-confirm-btn add-confirm-btn"
            onClick={onConfirm}
            disabled={!newCustomerForm.name.trim()}
          >
            <span>＋</span> যোগ করুন
          </button>
        </div>
      </div>
    </div>
  );
}
