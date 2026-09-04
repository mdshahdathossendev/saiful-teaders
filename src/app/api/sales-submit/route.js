import { NextResponse } from 'next/server';

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
