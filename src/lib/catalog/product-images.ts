import type { ProductImage } from './model';

export type PublicProductImageRow = {
  id: string;
  product_id: string;
  storage_path: string | null;
  source_url: string | null;
  alt_text: string;
  attribution: string | null;
  sort_order: number;
  source: { source_name: string; canonical_url: string | null } | null;
};

function publicHttpsUrl(value: string | null): string | null {
  if (!value || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Rows arrive through product_images RLS, which only returns images whose
 * product, image review, image rights, and current source approval are public.
 */
export function mapPublicProductImage(row: PublicProductImageRow): ProductImage | null {
  const src = publicHttpsUrl(row.source_url);
  const sourcePageUrl = publicHttpsUrl(row.source?.canonical_url ?? null);
  if (!src || !row.alt_text.trim() || !row.source?.source_name.trim()) return null;

  return {
    id: row.id,
    src,
    altText: row.alt_text.trim(),
    sourceName: row.source.source_name.trim(),
    sourceUrl: src,
    sourcePageUrl,
    attribution: row.attribution,
    rightsStatus: 'approved',
    localOnly: false,
  };
}

export function mapPublicProductImages(rows: PublicProductImageRow[]): Map<string, ProductImage> {
  const images = new Map<string, ProductImage>();
  for (const row of rows) {
    if (images.has(row.product_id)) continue;
    const image = mapPublicProductImage(row);
    if (image) images.set(row.product_id, image);
  }
  return images;
}
