import { NextResponse } from 'next/server';

export async function GET() {
  const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEB_APP_URL;

  if (!sheetUrl || sheetUrl.includes('PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
    return NextResponse.json({ totalCustomers: 0, totalAmount: 0 });
  }

  try {
    const summaryUrl = new URL(sheetUrl);
    summaryUrl.searchParams.set('action', 'summary');

    const response = await fetch(summaryUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const text = await response.text();
    const rawData = text ? JSON.parse(text) : {};
    const data = rawData && typeof rawData === 'object' ? rawData : {};

    if (!response.ok) {
      return NextResponse.json({ totalCustomers: 0, totalAmount: 0 });
    }

    const totalCustomersFromScript = Number(data.totalCustomers ?? data.total_customers ?? 0);
    const totalAmountFromScript = Number(data.totalAmount ?? data.total_amount ?? 0);

    const currentMonthTotalFromScript = Number(
      data.currentMonthTotal ??
      data.currentMonthAmount ??
      data.current_month_total ??
      data.current_month_amount ??
      totalAmountFromScript ??
      0
    );

    if (Number.isFinite(totalCustomersFromScript) && Number.isFinite(totalAmountFromScript)) {
      return NextResponse.json({
        totalCustomers: Math.max(0, totalCustomersFromScript),
        totalAmount: Math.max(0, totalAmountFromScript),
        currentMonthTotal: Math.max(0, currentMonthTotalFromScript),
      });
    }

    const rows = Array.isArray(data.rows) ? data.rows : [];
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

    const finalCurrentMonthTotal = Number.isFinite(currentMonthTotalFromScript)
      ? Math.max(0, currentMonthTotalFromScript)
      : finalTotalAmount || 0;

    return NextResponse.json({
      totalCustomers: finalTotalCustomers,
      totalAmount: finalTotalAmount,
      currentMonthTotal: finalCurrentMonthTotal,
    });
  } catch (error) {
    return NextResponse.json({ totalCustomers: 0, totalAmount: 0 });
  }
}
