import { describe, expect, it } from 'vitest';
import { mapPublicProductImage, mapPublicProductImages, type PublicProductImageRow } from '@/lib/catalog/product-images';

const row: PublicProductImageRow = {
  id: 'TEST ONLY — image-id',
  product_id: 'TEST ONLY — product-id',
  storage_path: null,
  source_url: 'https://images.example.test/official-packshot.png?width=900',
  alt_text: 'TEST ONLY — Frontansicht der Flasche',
  attribution: 'TEST ONLY — Bildnachweis der Quelle',
  sort_order: 1,
  source: {
    source_name: 'TEST ONLY — Herstellerquelle',
    canonical_url: 'https://brand.example.test/product',
  },
};

describe('public Supabase product images', () => {
  it('maps approved RLS-visible HTTPS packshots with their source', () => {
    expect(mapPublicProductImage(row)).toEqual({
      id: row.id,
      src: row.source_url,
      altText: row.alt_text,
      sourceName: 'TEST ONLY — Herstellerquelle',
      sourceUrl: row.source_url,
      sourcePageUrl: row.source?.canonical_url,
      attribution: row.attribution,
      rightsStatus: 'approved',
      localOnly: false,
    });
  });

  it.each([
    'http://images.example.test/packshot.png',
    'javascript:alert(1)',
    'https://user:password@images.example.test/packshot.png',
  ])('rejects an unsafe image URL: %s', (sourceUrl) => {
    expect(mapPublicProductImage({ ...row, source_url: sourceUrl })).toBeNull();
  });

  it('skips invalid rows and picks the first safe image per product', () => {
    const next = { ...row, id: 'TEST ONLY — second-image', source_url: 'https://images.example.test/second.png', sort_order: 2 };
    const mapped = mapPublicProductImages([
      { ...row, source_url: null },
      row,
      next,
      { ...next, product_id: 'TEST ONLY — other-product' },
    ]);

    expect(mapped.get(row.product_id)?.id).toBe(row.id);
    expect(mapped.get('TEST ONLY — other-product')?.id).toBe(next.id);
  });
});
