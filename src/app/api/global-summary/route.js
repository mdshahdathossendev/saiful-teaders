import { NextResponse } from 'next/server';
import { getGoogleSheetWebAppUrl } from '@/lib/googleSheetConfig';

export async function GET() {
  const sheetUrl = getGoogleSheetWebAppUrl();
  if (!sheetUrl) {
    return NextResponse.json(
      { ok: false, error: 'A valid Google Apps Script URL must be set in .env.' },
      { status: 500 }
    );
  }

  try {
    const summaryUrl = new URL(sheetUrl);
    summaryUrl.searchParams.set('action', 'summary');

    const response = await fetch(summaryUrl.toString(), {
      cache: 'no-store',
      redirect: 'follow',
    });
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
