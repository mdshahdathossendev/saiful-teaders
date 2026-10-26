export const GOOGLE_SHEET_WEB_APP_URL =
  process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEB_APP_URL?.trim() || '';

export function getGoogleSheetWebAppUrl() {
  if (!GOOGLE_SHEET_WEB_APP_URL) return null;

  try {
    const url = new URL(GOOGLE_SHEET_WEB_APP_URL);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'script.google.com' ||
      !/^\/macros\/s\/[^/]+\/exec\/?$/.test(url.pathname)
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}
