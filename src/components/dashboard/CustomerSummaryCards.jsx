export default function CustomerSummaryCards({ form }) {
  const fmt = (v) => Number(v || 0).toLocaleString('bn-BD');

  return (
    <section className="stats-grid">
      <p className="stats-section-label">
        নির্বাচিত গ্রাহকের সারাংশ — {form.customer || 'কেউ নির্বাচন করা হয়নি'}
      </p>
      <div className="stat-box">
        <span>মোট জমা</span>
        <strong>৳ {fmt(form.depositedBase)}</strong>
      </div>
      <div className="stat-box income-box">
        <span>মোট পাওনা</span>
        <strong>৳ {fmt(form.dueBase)}</strong>
      </div>
      <div className="stat-box profit-box">
        <span>মোট অবশিষ্ট</span>
        <strong>৳ {fmt(form.remainingBase)}</strong>
      </div>
      <div className="stat-box sale-box">
        <span>মোট বিক্রি</span>
        <strong>৳ {fmt(form.totalAmountBase)}</strong>
      </div>
    </section>
  );
}
