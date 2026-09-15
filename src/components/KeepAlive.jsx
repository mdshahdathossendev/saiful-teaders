'use client';

import { useEffect } from 'react';

const INTERVAL_MS = 4 * 60 * 1000; // ৪ মিনিট পর পর ping

export default function KeepAlive() {
  useEffect(() => {
    const ping = () => fetch('/api/keep-alive').catch(() => {});

    // প্রথমবার লোড হলে পরপর ping
    ping();

    const id = setInterval(ping, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
