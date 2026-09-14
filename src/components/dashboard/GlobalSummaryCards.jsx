import { getAmountSizeClass } from '@/lib/dashboardUtils';

function TrendArrow({ up }) {
  return up ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
      <path d="M7 17 17 7" /><path d="M8 7h9v9" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
      <path d="M7 7 17 17" /><path d="M17 8v9H8" />
    </svg>
  );
}

function GlobalCard({ variant, icon, badge, label, value, trendUp, trendLabel, subLabel }) {
  const num = Number(value || 0);
  return (
    <article className={`global-card g-card-${variant}`}>
      <div className="g-card-ornament" aria-hidden="true" />
      <div className="g-card-head">
        <div className="g-card-icon">{icon}</div>
        <div className="g-card-badge">{badge}</div>
      </div>
      <div className="g-card-label">{label}</div>
      <div className="g-card-amount">
        <span className="g-card-currency">৳</span>
        <span className={`g-card-number ${getAmountSizeClass(num)}`}>
          {num.toLocaleString('bn-BD')}
        </span>
      </div>
      <div className="g-card-foot">
        <span className={`g-card-trend ${trendUp ? 'up' : 'down'}`}>
          <TrendArrow up={trendUp} />
          {trendLabel}
        </span>
        <span className="g-card-divider" />
        <span className="g-card-sub">{subLabel}</span>
      </div>
    </article>
  );
}

export default function GlobalSummaryCards({ globalSummary }) {
  const { globalDeposited = 0, globalRemaining = 0, globalDue = 0 } = globalSummary;
  const netBalance = Number(globalDeposited) - Number(globalDue);

  return (
    <section className="stats-grid stats-grid-global">
      <div className="global-summary-header">
        <div className="gsh-left">
          <span className="gsh-eyebrow">FINANCIAL OVERVIEW</span>
          <h2 className="gsh-title">ব্যবসায়িক হিসাব</h2>
        </div>
        <div className="gsh-right">
          <span className="gsh-pill">
            <span className="gsh-pill-dot" />
            লাইভ সিঙ্কড
          </span>
        </div>
      </div>

      <GlobalCard
        variant="deposited"
        badge="💰 ইনকামিং"
        label="সকল গ্রাহক — মোট জমা"
        value={globalDeposited}
        trendUp
        trendLabel="পজিটিভ"
        subLabel="জমা টাকার পরিমাণ"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2" />
            <path d="M22 13V9a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-2" />
            <path d="M17 14h.01" />
          </svg>
        }
      />

      <GlobalCard
        variant="due"
        badge="⚠️ পেন্ডিং"
        label="সকল গ্রাহক — মোট পাওনা"
        value={globalDue}
        trendUp={false}
        trendLabel="আদায় বাকি"
        subLabel="বাদেয় টাকার পরিমাণ"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4" /><path d="M12 17h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          </svg>
        }
      />

      <GlobalCard
        variant="remaining"
        badge="⏳ হিসাবধারী"
        label="সকল গ্রাহক — মোট অবশিষ্ট"
        value={globalRemaining}
        trendUp
        trendLabel="ক্যাশ ইন"
        subLabel="আগামী রিসিভেবল"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        }
      />

      <GlobalCard
        variant="balance"
        badge="⚖️ নেট পজিশন"
        label="নেট ব্যালেন্স (জমা − পাওনা)"
        value={netBalance}
        trendUp={netBalance >= 0}
        trendLabel={netBalance >= 0 ? 'ফাভারেবল' : 'এডভার্স'}
        subLabel="বাস্তব হিসাব অবস্থা"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v18" /><path d="M8 7h12l-4 5 4 5H8" /><path d="M16 7H4l4 5-4 5h12" />
          </svg>
        }
      />
    </section>
  );
}
