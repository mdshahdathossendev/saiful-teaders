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
    const url = new URL(sheetUrl);
    url.searchParams.set('action', 'getCustomers');

    const response = await fetch(url.toString(), {
      cache: 'no-store',
      redirect: 'follow',
    });
    if (!response.ok) {
      return NextResponse.json({ ok: false, customers: [] });
    }

    const data = await response.json();
    return NextResponse.json({ ok: true, customers: data.customers || [] });
  } catch (error) {
    return NextResponse.json({ ok: false, customers: [] });
  }
}

export async function POST(request) {
  const sheetUrl = getGoogleSheetWebAppUrl();
  if (!sheetUrl) {
    return NextResponse.json(
      { ok: false, error: 'A valid Google Apps Script URL must be set in .env.' },
      { status: 500 }
    );
  }

  try {
    const payload = await request.json();
    const response = await fetch(sheetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const responseText = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: responseText || 'Google Sheet rejected the request.' },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, response: responseText });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Google Sheet-এ ডাটা পাঠানো সম্ভব হয়নি।' },
      { status: 502 }
    );
  }
}

export async function DELETE(request) {
  const sheetUrl = getGoogleSheetWebAppUrl();
  if (!sheetUrl) {
    return NextResponse.json(
      { ok: false, error: 'A valid Google Apps Script URL must be set in .env.' },
      { status: 500 }
    );
  }

  try {
    const name = request.nextUrl.searchParams.get('name')?.trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: 'Name is required' }, { status: 400 });
    }

    const payload = { action: 'deleteCustomer', name };
    const response = await fetch(sheetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const responseText = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: responseText || 'Google Sheet rejected the request.' },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, response: responseText });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Google Sheet-এ ডাটা পাঠানো সম্ভব হয়নি।' },
      { status: 502 }
    );
  }
}
