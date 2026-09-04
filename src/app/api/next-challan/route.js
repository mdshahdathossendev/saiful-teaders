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
    const nextChallanUrl = new URL(sheetUrl);
    nextChallanUrl.searchParams.set('action', 'getNextChallanNo');

    const response = await fetch(nextChallanUrl.toString(), {
      cache: 'no-store',
      redirect: 'follow',
    });
    if (!response.ok) {
      return NextResponse.json({ nextChallanNo: '5000' });
    }

    const data = await response.json();
    return NextResponse.json({
      nextChallanNo: data.nextChallanNo ? String(data.nextChallanNo) : '5000',
    });
  } catch (error) {
    return NextResponse.json({ nextChallanNo: '5000' });
  }
}
