import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { afterEach, describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const databases: PGlite[] = [];

async function freshDatabase(): Promise<PGlite> {
  const db = new PGlite();
  databases.push(db);
  const bootstrap = await readFile(path.join(root, 'test/db/bootstrap.sql'), 'utf8');
  const migration = await readFile(path.join(root, 'supabase/migrations/20261010130000_initial_catalog.sql'), 'utf8');
  const seed = await readFile(path.join(root, 'supabase/seed.sql'), 'utf8');
  await db.exec(bootstrap);
  await db.exec(migration);
  await db.exec(seed);
  return db;
}

async function addSyntheticPublishedProduct(db: PGlite) {
  // This transient test-only source and product are never inserted into app seeds or a shared database.
  const sourceResult = await db.query<{ id: string }>(
    "insert into public.sources (source_name, source_type) values ('TEST ONLY — synthetic source', 'operator_entry') returning id",
  );
  const sourceId = sourceResult.rows[0].id;
  await db.query(
    `insert into private.source_rights_reviews
      (source_id, data_rights_status, text_rights_status, image_rights_status, terms_checked_at, reviewed_at)
     values ($1, 'approved', 'unreviewed', 'unreviewed', now(), now())`,
    [sourceId],
  );

  const brandResult = await db.query<{ id: string }>(
    `insert into public.brands (slug, name, normalized_name)
     values ('test-only-brand', 'TEST ONLY — brand', 'test only brand') returning id`,
  );
  const brandId = brandResult.rows[0].id;
  await db.query(
    `insert into public.brand_field_provenance
      (brand_id, field_path, source_id, raw_value_hash, verification_status, verified_at)
     values ($1, 'name', $2, md5('TEST ONLY — brand'), 'approved', now())`,
    [brandId, sourceId],
  );
  await db.query("update public.brands set status = 'published', verified_at = now() where id = $1", [brandId]);

  const category = await db.query<{ id: string }>("select id from public.categories where slug = 'whisky'");
  const categoryId = category.rows[0].id;
  const productResult = await db.query<{ id: string }>(
    `insert into public.products (brand_id, primary_category_id, slug, name, normalized_name)
     values ($1, $2, 'test-only-product', 'TEST ONLY — product', 'test only product') returning id`,
    [brandId, categoryId],
  );
  const productId = productResult.rows[0].id;

  await db.query(
    `insert into public.product_field_provenance
      (product_id, field_path, source_id, raw_value_hash, verification_status, verified_at)
     values
      ($1, 'name', $3, md5('TEST ONLY — product'), 'approved', now()),
      ($1, 'brand_id', $3, md5($2::text), 'approved', now()),
      ($1, 'primary_category_id', $3, md5($4::text), 'approved', now())`,
    [productId, brandId, sourceId, categoryId],
  );
  await db.query("update public.products set product_status = 'published', editorial_reviewed_at = now() where id = $1", [productId]);
  return { brandId, categoryId, productId, sourceId };
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.close()));
});

describe('PostgreSQL migration and access policies', () => {
  it('applies the migration and seeds taxonomy only', async () => {
    const db = await freshDatabase();
    const categories = await db.query<{ count: string }>('select count(*)::text as count from public.categories');
    const products = await db.query<{ count: string }>('select count(*)::text as count from public.products');
    expect(categories.rows[0].count).toBe('14');
    expect(products.rows[0].count).toBe('0');
  });

  it('blocks product publication without current approved provenance', async () => {
    const db = await freshDatabase();
    const category = await db.query<{ id: string }>("select id from public.categories where slug = 'whisky'");
    const brand = await db.query<{ id: string }>(
      `insert into public.brands (slug, name, normalized_name)
       values ('blocked-test-brand', 'TEST ONLY — blocked brand', 'test only blocked brand') returning id`,
    );
    await expect(db.query(
      `insert into public.products (brand_id, primary_category_id, slug, name, normalized_name, product_status, editorial_reviewed_at)
       values ($1, $2, 'blocked-test-product', 'TEST ONLY — blocked', 'test only blocked', 'published', now())`,
      [brand.rows[0].id, category.rows[0].id],
    )).rejects.toThrow(/provenance|evidence/i);
  });

  it('allows anonymous reads of reviewed published rows, not drafts or writes', async () => {
    const db = await freshDatabase();
    const published = await addSyntheticPublishedProduct(db);
    const draft = await db.query<{ id: string }>(
      `insert into public.products (brand_id, primary_category_id, slug, name, normalized_name)
       values ($1, $2, 'test-only-draft', 'TEST ONLY — draft', 'test only draft') returning id`,
      [published.brandId, published.categoryId],
    );
    const staleSource = await db.query<{ id: string }>(
      "insert into public.sources (source_name, source_type) values ('TEST ONLY — stale source', 'operator_entry') returning id",
    );
    await db.query(
      `insert into private.source_rights_reviews
        (source_id, data_rights_status, terms_checked_at, reviewed_at)
       values ($1, 'approved', now(), now())`,
      [staleSource.rows[0].id],
    );
    await db.query(
      `insert into public.product_field_provenance
        (product_id, field_path, source_id, raw_value_hash, verification_status, verified_at)
       values ($1, 'name', $2, md5('TEST ONLY — wrong name'), 'approved', now())`,
      [published.productId, staleSource.rows[0].id],
    );

    await db.exec('set role anon');
    const visible = await db.query<{ name: string }>('select name from public.products order by name');
    expect(visible.rows.map((row) => row.name)).toEqual(['TEST ONLY — product']);
    const sources = await db.query<{ field_path: string }>(
      'select field_path from public.product_public_sources where product_id = $1',
      [published.productId],
    );
    expect(sources.rows.filter((row) => row.field_path === 'name')).toHaveLength(1);
    const visibleNameProvenance = await db.query<{ source_id: string }>(
      "select source_id from public.product_field_provenance where product_id = $1 and field_path = 'name'",
      [published.productId],
    );
    expect(visibleNameProvenance.rows).toHaveLength(1);
    await expect(db.query('insert into public.products (brand_id, primary_category_id, slug, name, normalized_name) values ($1, $2, $3, $4, $5)', [published.brandId, published.categoryId, 'anon-write', 'TEST ONLY — denied', 'test only denied'])).rejects.toThrow();
    await expect(db.query('select * from private.source_rights_reviews')).rejects.toThrow();
    await db.exec('reset role');
    expect(draft.rows[0].id).not.toBe(published.productId);
  });

  it('fails closed when a published field changes but its reviewed hash does not', async () => {
    const db = await freshDatabase();
    const { productId } = await addSyntheticPublishedProduct(db);
    await expect(db.query("update public.products set name = 'TEST ONLY — edited' where id = $1", [productId])).rejects.toThrow(/provenance|evidence/i);
  });

  it('keeps tasting-text rights separate from product-data rights', async () => {
    const db = await freshDatabase();
    const { productId, sourceId } = await addSyntheticPublishedProduct(db);
    await expect(db.query(
      `insert into public.tasting_notes
        (product_id, author_type, overall_text, source_id, text_license_status, review_status)
       values ($1, 'editorial', 'TEST ONLY — note', $2, 'approved', 'approved')`,
      [productId, sourceId],
    )).rejects.toThrow(/text rights/i);
  });

  it('requires current evidence for variants and keeps raw QR codes private', async () => {
    const db = await freshDatabase();
    const { productId, sourceId } = await addSyntheticPublishedProduct(db);
    const variant = await db.query<{ id: string }>(
      `insert into public.product_variants (product_id, volume_ml)
       values ($1, 700) returning id`,
      [productId],
    );
    const variantId = variant.rows[0].id;
    await db.query(
      `insert into public.variant_field_provenance
        (variant_id, field_path, source_id, raw_value_hash, verification_status, verified_at)
       values ($1, 'volume_ml', $2, md5('700'), 'approved', now())`,
      [variantId, sourceId],
    );
    await db.query("update public.product_variants set status = 'published' where id = $1", [variantId]);
    await db.query(
      `insert into public.qr_links (public_code, product_id, variant_id)
       values ('testonlycode1234567890', $1, $2)`,
      [productId, variantId],
    );
    await db.query(
      `insert into public.qr_links (public_code, product_id, variant_id, status)
       values ('disabledtestcode123456', $1, $2, 'disabled')`,
      [productId, variantId],
    );

    await db.exec('set role anon');
    const resolved = await db.query<{ resolution_status: string; product_slug: string }>(
      "select * from public.resolve_qr_link('testonlycode1234567890')",
    );
    expect(resolved.rows).toEqual([{ resolution_status: 'active', product_slug: 'test-only-product' }]);
    const disabled = await db.query<{ resolution_status: string; product_slug: string | null }>(
      "select * from public.resolve_qr_link('disabledtestcode123456')",
    );
    expect(disabled.rows).toEqual([{ resolution_status: 'disabled', product_slug: null }]);
    await expect(db.query('select public_code from public.qr_links')).rejects.toThrow();
    const visibleVariants = await db.query<{ id: string }>('select id from public.product_variants');
    expect(visibleVariants.rows.map((row) => row.id)).toEqual([variantId]);
    await db.exec('reset role');

    await expect(db.query(
      "update public.product_variants set volume_ml = 500 where id = $1",
      [variantId],
    )).rejects.toThrow(/provenance|evidence/i);
    await expect(db.query(
      `insert into public.product_variants (product_id, volume_ml, status)
       values ($1, 500, 'published')`,
      [productId],
    )).rejects.toThrow(/provenance|evidence/i);
  });

  it('hides stale approved flavor values and tasting notes after edits', async () => {
    const db = await freshDatabase();
    const { productId, sourceId } = await addSyntheticPublishedProduct(db);
    const dimension = await db.query<{ id: string }>("select id from public.flavor_dimensions where code = 'smoky'");
    await db.query(
      `insert into public.product_flavor_values
        (product_id, dimension_id, value, source_id, method, verification_status, verified_at, raw_value_hash)
       values ($1, $2, 5, $3, 'expert', 'approved', now(), md5('5.00'))`,
      [productId, dimension.rows[0].id, sourceId],
    );
    await db.query("update private.source_rights_reviews set text_rights_status = 'approved' where source_id = $1", [sourceId]);
    await db.query(
      `insert into public.tasting_notes
        (product_id, author_type, overall_text, source_id, text_license_status, review_status, raw_content_hash)
       values ($1, 'editorial', 'TEST ONLY — note', $2, 'approved', 'approved', md5(concat_ws(E'\\n', '', 'editorial', '', '', '', 'TEST ONLY — note', $3::text, '', 'de')))`,
      [productId, sourceId, sourceId],
    );

    await db.exec('set role anon');
    expect((await db.query('select value from public.product_flavor_values')).rows).toHaveLength(1);
    expect((await db.query('select overall_text from public.tasting_notes')).rows).toHaveLength(1);
    await db.exec('reset role');

    await expect(db.query(
      'update public.product_flavor_values set value = 6 where product_id = $1',
      [productId],
    )).rejects.toThrow(/hash|rights/i);
    await expect(db.query(
      "update public.tasting_notes set overall_text = 'TEST ONLY — changed' where product_id = $1",
      [productId],
    )).rejects.toThrow(/hash|rights/i);

    await db.exec('alter table public.product_flavor_values disable trigger flavor_values_source_rights');
    await db.query('update public.product_flavor_values set value = 6 where product_id = $1', [productId]);
    await db.exec('alter table public.product_flavor_values enable trigger flavor_values_source_rights');
    await db.exec('alter table public.tasting_notes disable trigger tasting_notes_source_rights');
    await db.query("update public.tasting_notes set overall_text = 'TEST ONLY — changed' where product_id = $1", [productId]);
    await db.exec('alter table public.tasting_notes enable trigger tasting_notes_source_rights');

    await db.exec('set role anon');
    expect((await db.query('select value from public.product_flavor_values')).rows).toHaveLength(0);
    expect((await db.query('select overall_text from public.tasting_notes')).rows).toHaveLength(0);
  });
});
