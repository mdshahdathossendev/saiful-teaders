'use client';

const MAX_HISTORY = 10;
const PREFIX = 'ac_';

/** localStorage থেকে একটা ফিল্ডের history পড়া */
export function getHistory(fieldKey) {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(PREFIX + fieldKey) || '[]');
  } catch {
    return [];
  }
}

/** নতুন মান history-তে যোগ করা (duplicate বাদ, সর্বোচ্চ MAX_HISTORY টা) */
export function saveToHistory(fieldKey, value) {
  if (typeof window === 'undefined') return;
  const val = String(value || '').trim();
  if (!val) return;
  try {
    const existing = getHistory(fieldKey).filter(
      (v) => v.toLowerCase() !== val.toLowerCase()
    );
    const updated = [val, ...existing].slice(0, MAX_HISTORY);
    localStorage.setItem(PREFIX + fieldKey, JSON.stringify(updated));
  } catch {
    /* silent */
  }
}

/** একসাথে একাধিক ফিল্ডের history সেভ করা */
export function saveMultipleToHistory(entries) {
  entries.forEach(({ key, value }) => saveToHistory(key, value));
}
