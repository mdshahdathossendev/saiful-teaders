import { NextResponse } from 'next/server';
import { getGoogleSheetWebAppUrl } from '@/lib/googleSheetConfig';

export async function GET(request) {
  const sheetUrl = getGoogleSheetWebAppUrl();
  const customer = request.nextUrl.searchParams.get('customer')?.trim();

  if (!sheetUrl) {
    return NextResponse.json(
      { error: 'A valid Google Apps Script URL must be set in .env.' },
      { status: 500 }
    );
  }

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
