import { getRuntimeConfig } from '@/lib/runtime-config';
import { readLocalStartProductImage } from '@/lib/catalog/local-start-database';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 });

  const config = getRuntimeConfig();
  if (config.mode !== 'local-start-database') return new Response(null, { status: 404 });

  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return new Response(null, { status: 404 });

  try {
    const image = await readLocalStartProductImage(config.catalogPath, slug);
    if (!image) return new Response(null, { status: 404 });
    const body = new ArrayBuffer(image.bytes.byteLength);
    new Uint8Array(body).set(image.bytes);
    return new Response(body, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': image.contentType,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
