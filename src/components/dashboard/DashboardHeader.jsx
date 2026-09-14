export default function DashboardHeader({
  pollingEnabled,
  setPollingEnabled,
  lastSyncedAt,
  isLoadingGlobalSummary,
  onRefresh,
  onLogout,
}) {
  return (
    <header className="dashboard-header">
      <div>
        <p className="login-tag">Saiful Traders</p>
        <h2>বিক্রয় হিসাব ড্যাশবোর্ড</h2>
        <p className="sync-status-line">
          <span
            className={`sync-dot ${pollingEnabled ? 'sync-active' : 'sync-paused'}`}
            aria-hidden="true"
          />
          {pollingEnabled ? 'অটো সিঙ্ক চালু আছে' : 'অটো সিঙ্ক বন্ধ'}
          {lastSyncedAt && (
            <>
              <span className="sync-sep">•</span>
              <span>শেষ সিঙ্ক: {lastSyncedAt.toLocaleTimeString('bn-BD')}</span>
            </>
          )}
          {isLoadingGlobalSummary && (
            <>
              <span className="sync-sep">•</span>
              <span className="sync-spinner-text">আপডেট হচ্ছে…</span>
            </>
          )}
        </p>
      </div>

      <div className="header-actions">
        <button
          type="button"
          onClick={onRefresh}
          className="secondary-btn small-btn action-btn"
          title="এখনই রিফ্রেশ করুন"
        >
          <span aria-hidden="true">⟳</span>
          <span>এখন রিফ্রেশ</span>
        </button>

        <button
          type="button"
          onClick={() => setPollingEnabled((v) => !v)}
          className={`small-btn action-btn ${pollingEnabled ? 'primary-btn' : 'secondary-btn'}`}
          title="অটো সিঙ্ক চালু/বন্ধ"
        >
          <span aria-hidden="true">{pollingEnabled ? '🔵' : '⚪'}</span>
          <span>{pollingEnabled ? 'অটো সিঙ্ক ON' : 'অটো সিঙ্ক OFF'}</span>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="primary-btn small-btn action-btn"
          title="লগআউট"
        >
          <span aria-hidden="true">⎋</span>
          <span>লগআউট</span>
        </button>
      </div>
    </header>
  );
}
