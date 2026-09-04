import React from 'react';

/**
 * Simple loading spinner component.
 * It renders a centered circular spinner with a subtle fade‑in effect.
 * The component is deliberately lightweight – only CSS is required.
 */
const LoadingSpinner = () => {
  return (
    <div className="spinner-overlay">
      <div className="spinner" />
      <style jsx>{`
        .spinner-overlay {
          position: fixed;
          inset: 0;
          background: rgba(255, 255, 255, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .spinner {
          width: 48px;
          height: 48px;
          border: 5px solid #e5e7eb; /* light gray */
          border-top-color: #3b82f6; /* blue-500 */
          border-radius: 50%;
          animation: spin 0.9s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
