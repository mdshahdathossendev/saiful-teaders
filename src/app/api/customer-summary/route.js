import { NextResponse } from 'next/server';

const DEFAULT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbxzDZw5dBghxj0YWWWwgOaW5fdpoZ1gn_TjqZMxBUatahTySkV5dzIr5I8Js8qon2Mh6g/exec';

function getSheetUrl() {
  const envUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEB_APP_URL;
  return envUrl && !envUrl.includes('PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')
    ? envUrl
    : DEFAULT_WEB_APP_URL;
}

export async function GET(request) {
  const sheetUrl = getSheetUrl();
  const customer = request.nextUrl.searchParams.get('customer')?.trim();

  if (!customer) {
    return NextResponse.json({ deposited: 0, remaining: 0, due: 0 });
  }

  try {
    const summaryUrl = new URL(sheetUrl);
    summaryUrl.searchParams.set('action', 'customerSummary');
    summaryUrl.searchParams.set('sheetName', customer);

    const response = await fetch(summaryUrl.toString(), {
      cache: 'no-store',
      redirect: 'follow',
    });
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
