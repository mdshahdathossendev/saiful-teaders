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
