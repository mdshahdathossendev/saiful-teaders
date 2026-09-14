import Image from 'next/image';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function LoginPanel({ username, setUsername, password, setPassword, error, isFetchingData, onLogin }) {
  return (
    <div className="dashboard-shell">
      <div className="login-panel">
        <div className="login-logo-wrap">
          <Image
            src="/icon.png"
            alt="সাইফুল ট্রেডার্স লোগো"
            width={88}
            height={88}
            className="login-logo-img"
            priority
          />
        </div>
        <h1>মেসার্স সাইফুল ট্রেডার্স</h1>
        <p className="login-subtitle">প্রোঃ জাকির হোসেন মিয়াজী</p>

        <form onSubmit={onLogin} className="login-form">
          <label>
            ইউজারনেম
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ইউজার এর নাম"
            />
          </label>
          <label>
            পাসওয়ার্ড
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="আপনার পাসওয়াড দিন"
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="primary-btn full-width-btn login-submit-btn">
            লগইন করুন
          </button>
        </form>
      </div>

      {isFetchingData && (
        <div className="spinner-overlay">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
}
