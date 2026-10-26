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
