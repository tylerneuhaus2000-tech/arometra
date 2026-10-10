import { NextResponse, type NextRequest } from 'next/server';
import { resolveQrCode } from '@/lib/catalog/repository';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const localPreviewCode = process.env.NODE_ENV === 'development'
    && process.env.AROMETRA_DATA_MODE === 'local-start-database'
    && /^AR-\d{4}$/.test(code);
  if (!/^[A-Za-z0-9_-]{22,128}$/.test(code) && !localPreviewCode) return response('Dieser QR-Link ist nicht verfügbar.', 404);

  const result = await resolveQrCode(code);
  if (result.status === 'active' && result.slug) {
    const target = new URL(`/p/${encodeURIComponent(result.slug)}`, request.url);
    return NextResponse.redirect(target, {
      status: 307,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
  if (result.status === 'disabled') return response('Dieser QR-Link wurde deaktiviert.', 410);
  if (result.status === 'error' || result.status === 'unavailable') {
    return response('Der Produktlink ist derzeit nicht erreichbar.', 503);
  }
  return response('Zu diesem QR-Link wurde kein freigegebenes Produkt gefunden.', 404);
}

function response(message: string, status: number) {
  return new NextResponse(
    `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>QR-Link — AROMETRA</title><body><main><h1>${message}</h1><p><a href="/entdecken">Zum Katalog</a></p></main></body></html>`,
    {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
