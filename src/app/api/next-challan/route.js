import { NextResponse } from 'next/server';

export async function GET() {
  const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEB_APP_URL;

  if (!sheetUrl || sheetUrl.includes('PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
    return NextResponse.json({ nextChallanNo: '5000' });
  }

  try {
    const nextChallanUrl = new URL(sheetUrl);
    nextChallanUrl.searchParams.set('action', 'getNextChallanNo');

    const response = await fetch(nextChallanUrl.toString(), { cache: 'no-store' });
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
