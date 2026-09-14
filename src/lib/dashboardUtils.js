// ─── Pure utility functions for the dashboard ───────────────────────────────

export const DEFAULT_USERNAME = '01711662074';
export const DEFAULT_PASSWORD = '662074';
export const DEFAULT_INITIAL_CHALLAN = 5000;

export const GOOGLE_SHEET_WEB_APP_URL =
  process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEB_APP_URL ||
  'https://script.google.com/macros/s/AKfycbxzDZw5dBghxj0YWWWwgOaW5fdpoZ1gn_TjqZMxBUatahTySkV5dzIr5I8Js8qon2Mh6g/exec';

/** দশমিক হলে ২ ঘর, নইলে পূর্ণসংখ্যা */
export const fmtCalc = (n) => {
  if (!isFinite(n) || n === 0) return '0';
  return String(parseFloat(n.toFixed(2)));
};

/** গাড়ির পরিমাপ: .5 এর নিচে = floor, .5 বা উপরে = ceil */
export const roundMeasurement = (n) => {
  if (!isFinite(n) || n === 0) return '0';
  return String(Math.round(n));
};

/** বাংলা অঙ্ক → ইংরেজি অঙ্ক */
export const toEnglishNumber = (value) => {
  const map = { '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9' };
  return String(value ?? '').replace(/[০-৯]/g, (d) => map[d] || d);
};

/**
 * নতুন sale-এর পর remaining ও due হিসাব।
 * ১. নতুন amount আগে remainingBase থেকে বাদ যাবে।
 * ২. অবশিষ্ট কম হলে বাকিটা dueBase-এ যোগ হবে।
 * ৩. নতুন deposited দিয়ে balance update।
 */
export const recalcBalance = (remainingBase, dueBase, amount, deposited) => {
  const afterSale = remainingBase - amount;
  let rem = Math.max(afterSale, 0);
  let due = dueBase + Math.max(-afterSale, 0);

  const afterDeposit = rem + deposited - due;
  if (afterDeposit >= 0) {
    rem = afterDeposit;
    due = 0;
  } else {
    rem = 0;
    due = -afterDeposit;
  }
  return { remaining: rem, due };
};

/** Amount display size class for global summary cards */
export const getAmountSizeClass = (rawValue) => {
  const len = String(Number(rawValue || 0).toLocaleString('bn-BD')).length;
  if (len >= 14) return 'size-14';
  if (len >= 12) return 'size-12';
  if (len >= 10) return 'size-10';
  if (len >= 8)  return 'size-8';
  return '';
};

export const getInitialForm = () => ({
  date: new Date().toISOString().split('T')[0],
  business: '',
  customer: '',
  vehicle: '',
  description: '',
  driverName: '',
  driverMobile: '',
  destination: '',
  length: '',
  width: '',
  height: '',
  feet: '0',
  rate: '',
  amount: '',
  truckRatePerFoot: '',
  truckCharge: '0',
  depositedTotal: '0',
  depositedBase: '0',
  deposited: '0',
  remaining: '0',
  due: '0',
  remainingBase: '0',
  dueBase: '0',
  totalAmountBase: '0',
  tons: '',
  feetPerTon: '',
  challanNo: 'লোড হচ্ছে...',
});
