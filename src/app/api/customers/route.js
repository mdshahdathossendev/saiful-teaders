import { NextResponse } from 'next/server';

export async function GET() {
  const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEB_APP_URL;

  if (!sheetUrl || sheetUrl.includes('PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
    return NextResponse.json({ ok: false, customers: [] });
  }

  try {
    const url = new URL(sheetUrl);
    url.searchParams.set('action', 'getCustomers');

    const response = await fetch(url.toString(), { cache: 'no-store' });
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
  const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEB_APP_URL;

  if (!sheetUrl || sheetUrl.includes('PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
    return NextResponse.json({ error: 'Google Sheet URL is not configured.' }, { status: 500 });
  }

  try {
    const payload = await request.json();
    const response = await fetch(sheetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { error: responseText || 'Google Sheet rejected the request.' },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, response: responseText });
  } catch (error) {
    return NextResponse.json(
      { error: 'Google Sheet-এ ডাটা পাঠানো সম্ভব হয়নি।' },
      { status: 502 }
    );
  }
}

export async function DELETE(request) {
  const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEB_APP_URL;

  if (!sheetUrl || sheetUrl.includes('PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
    return NextResponse.json({ error: 'Google Sheet URL is not configured.' }, { status: 500 });
  }

  try {
    const name = request.nextUrl.searchParams.get('name')?.trim();
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const payload = { action: 'deleteCustomer', name };
    const response = await fetch(sheetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { error: responseText || 'Google Sheet rejected the request.' },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, response: responseText });
  } catch (error) {
    return NextResponse.json(
      { error: 'Google Sheet-এ ডাটা পাঠানো সম্ভব হয়নি।' },
      { status: 502 }
    );
  }
}
