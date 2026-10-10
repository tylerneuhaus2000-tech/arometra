import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isLocalUiPreviewEnabled } from '@/lib/ui-preview/fixtures';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedAssets = new Set(['bottle-amber.jpg', 'bottle-green.jpg', 'bottle-frosted.jpg']);

export async function GET(request: Request, { params }: { params: Promise<{ asset: string }> }) {
  if (!isLocalUiPreviewEnabled(request.headers.get('host'))) return new Response(null, { status: 404 });
  const { asset } = await params;
  if (!allowedAssets.has(asset)) return new Response(null, { status: 404 });

  try {
    const file = await readFile(join(process.cwd(), 'test', 'fixtures', 'ui-preview', asset));
    return new Response(new Uint8Array(file), {
      headers: {
        'content-type': 'image/jpeg',
        'cache-control': 'no-store, max-age=0',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
