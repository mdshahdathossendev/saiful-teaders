import { NextResponse } from 'next/server';

const DEFAULT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbxzDZw5dBghxj0YWWWwgOaW5fdpoZ1gn_TjqZMxBUatahTySkV5dzIr5I8Js8qon2Mh6g/exec';

function getSheetUrl() {
  const envUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEB_APP_URL;
  return envUrl && !envUrl.includes('PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')
    ? envUrl
    : DEFAULT_WEB_APP_URL;
}

export async function GET() {
  const sheetUrl = getSheetUrl();

  if (!sheetUrl) {
    return NextResponse.json({ totalCustomers: 0, totalAmount: 0, currentMonthTotal: 0 });
  }

  try {
    const summaryUrl = new URL(sheetUrl);
    summaryUrl.searchParams.set('action', 'summary');

    const response = await fetch(summaryUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      redirect: 'follow',
      cache: 'no-store',
    });

    const text = await response.text();
    const rawData = text ? JSON.parse(text) : {};
    const data = rawData && typeof rawData === 'object' ? rawData : {};

    if (!response.ok) {
      return NextResponse.json({ totalCustomers: 0, totalAmount: 0, currentMonthTotal: 0 });
    }

    const extractRows = (payload) => {
      if (!payload || typeof payload !== 'object') {
        return [];
      }

      if (Array.isArray(payload.rows)) return payload.rows;
      if (Array.isArray(payload.data)) return payload.data;
      if (Array.isArray(payload.sales)) return payload.sales;
      if (Array.isArray(payload.items)) return payload.items;
      return [];
    };

    const normalizeDateText = (value) => {
      const banglaDigits = {'০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'};
      const numbers = Object.entries(banglaDigits).reduce((acc, [key, val]) => {
        acc[key] = val;
        return acc;
      }, {});

      return String(value)
        .trim()
        .replace(/[০১২৩৪৫৬৭৮৯]/g, (digit) => numbers[digit] || digit)
        .replace(/\s+/g, '')
        .replace(/\./g, '/');
    };

    const parseDateValue = (value) => {
      if (value === null || value === undefined || value === '') {
        return null;
      }

      if (typeof value === 'number') {
        const fromExcel = new Date((value - 25569) * 86400 * 1000);
        return Number.isNaN(fromExcel.getTime()) ? null : fromExcel;
      }

      const dateString = normalizeDateText(value);
      if (!dateString) {
        return null;
      }

      const directDate = new Date(dateString);
      if (!Number.isNaN(directDate.getTime())) {
        return directDate;
      }

      const match = dateString.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
      if (match) {
        const [, first, second, year] = match;
        const firstNumber = Number(first);
        const secondNumber = Number(second);

        let day;
        let month;

        if (firstNumber > 12 && secondNumber <= 12) {
          day = firstNumber;
          month = secondNumber;
        } else if (secondNumber > 12 && firstNumber <= 12) {
          month = firstNumber;
          day = secondNumber;
        } else {
          month = firstNumber;
          day = secondNumber;
        }

        const rebuilt = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        return Number.isNaN(rebuilt.getTime()) ? null : rebuilt;
      }

      return null;
    };

    const findDateValueInRow = (row) => {
      if (!row || typeof row !== 'object') {
        return null;
      }

      for (const [key, value] of Object.entries(row)) {
        if (key && /date|created|datetime|salesdate|tanggal|তারিখ/i.test(key)) {
          const parsed = parseDateValue(value);
          if (parsed) {
            return parsed;
          }
        }
      }

      return null;
    };

    const findAmountValueInRow = (row) => {
      if (!row || typeof row !== 'object') {
        return 0;
      }

      const keys = ['amount', 'totalAmount', 'total', 'saleAmount', 'amounts', 'tk', 'টাকা'];
      for (const key of keys) {
        const value = row[key];
        if (value !== undefined && value !== null && value !== '') {
          const numericValue = Number(value);
          if (Number.isFinite(numericValue)) {
            return numericValue;
          }
        }
      }

      for (const [key, value] of Object.entries(row)) {
        if (key && /amount|total|price|tk|টাকা|value/i.test(key)) {
          const numericValue = Number(value);
          if (Number.isFinite(numericValue)) {
            return numericValue;
          }
        }
      }

      return 0;
    };

    const sumCurrentMonthRows = (rows = []) =>
      rows.reduce((sum, row) => {
        const dateValue = findDateValueInRow(row);
        const rowAmount = findAmountValueInRow(row);

        if (!dateValue || !Number.isFinite(rowAmount)) {
          return sum;
        }

        const now = new Date();
        const sameMonth =
          dateValue.getMonth() === now.getMonth() && dateValue.getFullYear() === now.getFullYear();

        return sameMonth ? sum + rowAmount : sum;
      }, 0);

    const totalCustomersFromScript = Number(data.totalCustomers ?? data.total_customers ?? 0);
    const totalAmountFromScript = Number(data.totalAmount ?? data.total_amount ?? 0);
    const currentMonthTotalFromScript = Number(
      data.currentMonthTotal ??
      data.currentMonthAmount ??
      data.current_month_total ??
      data.current_month_amount ??
      0
    );

    const rows = extractRows(data);
    const currentMonthAmountFromRows = sumCurrentMonthRows(rows);

    const finalCurrentMonthTotal =
      Number.isFinite(currentMonthTotalFromScript) && currentMonthTotalFromScript > 0
        ? currentMonthTotalFromScript
        : currentMonthAmountFromRows || 0;

    if (Number.isFinite(totalCustomersFromScript) && Number.isFinite(totalAmountFromScript)) {
      return NextResponse.json({
        totalCustomers: Math.max(0, totalCustomersFromScript),
        totalAmount: Math.max(0, totalAmountFromScript),
        currentMonthTotal: Math.max(0, finalCurrentMonthTotal),
      });
    }
    const customers = Array.isArray(data.customers) ? data.customers : [];
    const totalCustomerCandidates = [
      ...(Array.isArray(data.totalCustomers) ? data.totalCustomers : []),
      ...(Array.isArray(data.customers) ? data.customers : []),
      ...rows.map((row) => row.customer || row.sheetName || row.name || ''),
    ].filter((value) => typeof value === 'string' && value.trim() !== '');

    const uniqueCustomers = new Set(
      totalCustomerCandidates.map((value) => String(value).trim().toLowerCase())
    );

    const totalAmountFromRows = rows.reduce((sum, row) => {
      const value = Number(row.amount ?? row.totalAmount ?? row.total ?? 0);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);

    const finalTotalCustomers = Number.isFinite(totalCustomersFromScript)
      ? Math.max(0, totalCustomersFromScript)
      : customers.length || uniqueCustomers.size || 0;

    const finalTotalAmount = Number.isFinite(totalAmountFromScript)
      ? Math.max(0, totalAmountFromScript)
      : totalAmountFromRows || 0;

    const finalFallbackCurrentMonthTotal =
      finalCurrentMonthTotal > 0 ? finalCurrentMonthTotal : currentMonthAmountFromRows || 0;

    return NextResponse.json({
      totalCustomers: finalTotalCustomers,
      totalAmount: finalTotalAmount,
      currentMonthTotal: Math.max(0, finalFallbackCurrentMonthTotal),
    });
  } catch (error) {
    return NextResponse.json({ totalCustomers: 0, totalAmount: 0, currentMonthTotal: 0 });
  }
}
