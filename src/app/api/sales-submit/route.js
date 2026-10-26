import { NextResponse } from 'next/server';
import { getGoogleSheetWebAppUrl } from '@/lib/googleSheetConfig';

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
