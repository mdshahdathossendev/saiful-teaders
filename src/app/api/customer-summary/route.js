import { NextResponse } from 'next/server';

export async function GET(request) {
  const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEB_APP_URL;
  const customer = request.nextUrl.searchParams.get('customer')?.trim();

  if (!sheetUrl || !customer || sheetUrl.includes('PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
    return NextResponse.json({ deposited: 0, remaining: 0, due: 0 });
  }

  try {
    const summaryUrl = new URL(sheetUrl);
    summaryUrl.searchParams.set('action', 'customerSummary');
    summaryUrl.searchParams.set('sheetName', customer);

    const response = await fetch(summaryUrl.toString(), { cache: 'no-store' });
    if (!response.ok) {
      return NextResponse.json({ deposited: 0, remaining: 0, due: 0 });
    }

    const data = await response.json();
    return NextResponse.json({
      deposited: Number(data.deposited) || 0,
      remaining: Number(data.remaining) || 0,
      due: Number(data.due) || 0,
      totalAmount: Number(data.totalAmount) || 0,
    });
  } catch (error) {
    return NextResponse.json({ deposited: 0, remaining: 0, due: 0 });
  }
}
