import { NextResponse } from 'next/server';

export async function GET() {
  const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEB_APP_URL;

  if (!sheetUrl || sheetUrl.includes('PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
    return NextResponse.json({ globalDeposited: 0, globalRemaining: 0, globalDue: 0 });
  }

  try {
    const summaryUrl = new URL(sheetUrl);
    summaryUrl.searchParams.set('action', 'summary');

    const response = await fetch(summaryUrl.toString(), { cache: 'no-store' });
    if (!response.ok) {
      return NextResponse.json({ globalDeposited: 0, globalRemaining: 0, globalDue: 0 });
    }

    const data = await response.json();
    return NextResponse.json({
      globalDeposited: Number(data.globalDeposited) || 0,
      globalRemaining: Number(data.globalRemaining) || 0,
      globalDue: Number(data.globalDue) || 0,
    });
  } catch (error) {
    return NextResponse.json({ globalDeposited: 0, globalRemaining: 0, globalDue: 0 });
  }
}
