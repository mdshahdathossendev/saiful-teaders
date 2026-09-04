import { NextResponse } from 'next/server';

const DEFAULT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbxzDZw5dBghxj0YWWWwgOaW5fdpoZ1gn_TjqZMxBUatahTySkV5dzIr5I8Js8qon2Mh6g/exec';

export async function POST(request) {
  const envUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEB_APP_URL;
  const sheetUrl =
    envUrl && !envUrl.includes('PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')
      ? envUrl
      : DEFAULT_WEB_APP_URL;

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
        {
          ok: false,
          error:
            responseText ||
            `Google Sheet rejected the request (HTTP ${response.status}).`,
          statusCode: response.status,
        },
        { status: response.status }
      );
    }

    let parsed;
    try {
      parsed = responseText ? JSON.parse(responseText) : null;
    } catch (_) {
      parsed = null;
    }

    return NextResponse.json({
      ok: true,
      response: responseText,
      parsed,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          'Google Sheet-এ ডাটা পাঠানো সম্ভব হয়নি। নেটওয়ার্ক বা Web App URL চেক করুন।',
      },
      { status: 502 }
    );
  }
}
