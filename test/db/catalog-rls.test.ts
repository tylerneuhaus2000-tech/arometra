import { readFile, readdir } from 'node:fs/promises';
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
  const migrationDirectory = path.join(root, 'supabase/migrations');
  const migrationNames = (await readdir(migrationDirectory)).filter((name) => name.endsWith('.sql')).sort();
  const seed = await readFile(path.join(root, 'supabase/seed.sql'), 'utf8');
  await db.exec(bootstrap);
  for (const name of migrationNames) await db.exec(await readFile(path.join(migrationDirectory, name), 'utf8'));
  await db.exec(seed);
  return db;
}

async function addSyntheticPublishedProduct(db: PGlite, categorySlug = 'whisky', slugSuffix = 'default') {
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

  const brandName = `TEST ONLY — brand ${slugSuffix}`;
  const brandResult = await db.query<{ id: string }>(
    `insert into public.brands (slug, name, normalized_name)
     values ($1, $2, $3) returning id`,
    [
      slugSuffix === 'default' ? 'test-only-brand' : `test-only-brand-${slugSuffix}`,
      brandName,
      `test only brand ${slugSuffix}`,
    ],
  );
  const brandId = brandResult.rows[0].id;
  await db.query(
    `insert into public.brand_field_provenance
      (brand_id, field_path, source_id, raw_value_hash, verification_status, verified_at)
     values ($1, 'name', $2, md5($3::text), 'approved', now())`,
    [brandId, sourceId, brandName],
  );
  await db.query("update public.brands set status = 'published', verified_at = now() where id = $1", [brandId]);

  const category = await db.query<{ id: string }>('select id from public.categories where slug = $1', [categorySlug]);
  const categoryId = category.rows[0].id;
  const productResult = await db.query<{ id: string }>(
    `insert into public.products (brand_id, primary_category_id, slug, name, normalized_name)
     values ($1, $2, $3, 'TEST ONLY — product', 'test only product') returning id`,
    [brandId, categoryId, slugSuffix === 'default' ? 'test-only-product' : `test-only-product-${slugSuffix}`],
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
    expect(categories.rows[0].count).toBe('47');
    expect(products.rows[0].count).toBe('0');
  });

  it('seeds category-specific aroma axes without any intensity values', async () => {
    const db = await freshDatabase();
    const counts = await db.query<{ dimensions: string; profile_axes: string; tag_rules: string; measurements: string }>(
      `select
        (select count(*)::text from public.sensory_dimensions) as dimensions,
        (select count(*)::text from public.category_sensory_dimensions) as profile_axes,
        (select count(*)::text from public.category_sensory_tag_rules) as tag_rules,
        (select count(*)::text from public.product_sensory_measurements) as measurements`,
    );
    expect(counts.rows[0]).toEqual({ dimensions: '80', profile_axes: '80', tag_rules: '213', measurements: '0' });

    const roots = await db.query<{ whisky: string; cognac: string; armagnac: string | null }>(
      `select
        (select slug from public.categories where id = private.resolve_sensory_profile_category((select id from public.categories where slug = 'whisky-scotch'))) as whisky,
        (select slug from public.categories where id = private.resolve_sensory_profile_category((select id from public.categories where slug = 'cognac'))) as cognac,
        (select slug from public.categories where id = private.resolve_sensory_profile_category((select id from public.categories where slug = 'armagnac'))) as armagnac`,
    );
    expect(roots.rows[0]).toEqual({ whisky: 'whisky', cognac: 'cognac', armagnac: null });

    const cognacAxes = await db.query<{ code: string }>(
      `select d.code from public.category_sensory_dimensions p
       join public.sensory_dimensions d on d.code = p.dimension_code
       join public.categories c on c.id = p.category_id
       where c.slug = 'cognac' order by p.display_order`,
    );
    expect(cognacAxes.rows).toHaveLength(8);
    expect(cognacAxes.rows.every((row) => !row.code.startsWith('wh_'))).toBe(true);
  });

  it('serves only approved category descriptors and measurements through the public profile RPC', async () => {
    const db = await freshDatabase();
    const { productId, sourceId } = await addSyntheticPublishedProduct(db, 'whisky-scotch', 'sensory');
    const category = await db.query<{ id: string }>("select id from public.categories where slug = 'whisky'");
    const categoryId = category.rows[0].id;
    await db.query(
      `insert into public.product_sensory_descriptors
        (product_id, category_id, dimension_code, tag_code, source_id, evidence_type, stage,
         verification_status, verified_at, raw_descriptor_hash)
       values ($1, $2, 'wh_smoke', 'rauchig', $3, 'manufacturer', 'nose', 'pending', null, null)`,
      [productId, categoryId, sourceId],
    );

    await db.exec('set role anon');
    await expect(db.query('select * from public.product_sensory_descriptors')).rejects.toThrow();
    let profile = await db.query<{ dimension_code: string; tag_code: string | null; intensity: string | null }>(
      'select dimension_code, tag_code, intensity from public.get_product_sensory_profile($1)',
      [productId],
    );
    expect(profile.rows).toHaveLength(8);
    expect(profile.rows.every((row) => row.intensity === null && row.tag_code === null)).toBe(true);
    await db.exec('reset role');

    await db.query(
      `update public.product_sensory_descriptors set
         verification_status = 'approved', verified_at = now(),
         raw_descriptor_hash = md5(concat_ws(E'\\n', category_id::text, dimension_code, tag_code, evidence_type::text, stage))
       where product_id = $1`,
      [productId],
    );
    await db.query(
      `insert into public.product_sensory_measurements
        (product_id, category_id, dimension_code, value, measurement_method, evidence_type,
         source_id, verification_status, verified_at, raw_measurement_hash)
       values ($1, $2, 'wh_smoke', 6, 'TEST ONLY — controlled scale check', 'expert', $3,
         'approved', now(), md5(concat_ws(E'\\n', $2::uuid::text, 'wh_smoke', 6.00::numeric(4,2)::text,
           'TEST ONLY — controlled scale check', 'expert')))`,
      [productId, categoryId, sourceId],
    );

    await db.exec('set role anon');
    profile = await db.query<{ dimension_code: string; tag_code: string | null; intensity: string | null }>(
      'select dimension_code, tag_code, intensity from public.get_product_sensory_profile($1)',
      [productId],
    );
    const smoke = profile.rows.find((row) => row.dimension_code === 'wh_smoke');
    expect(smoke).toEqual({ dimension_code: 'wh_smoke', tag_code: 'rauchig', intensity: '6.00' });
    expect(profile.rows.find((row) => row.dimension_code === 'wh_grain')?.intensity).toBeNull();
  });

  it('exposes verification dates through the public source view schema', async () => {
    const db = await freshDatabase();
    const result = await db.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'product_public_sources'",
    );
    expect(result.rows.map((row) => row.column_name)).toContain('verified_at');
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

  it('requires image rights and approved product evidence before exposing official packshots', async () => {
    const db = await freshDatabase();
    const { productId, sourceId } = await addSyntheticPublishedProduct(db, 'whisky', 'image-rights');
    const image = await db.query<{ id: string }>(
      `insert into public.product_images (product_id, source_url, source_id, alt_text)
       values ($1, 'https://images.example.test/test-only-packshot.png', $2, 'TEST ONLY — Produkt-Packshot')
       returning id`,
      [productId, sourceId],
    );

    await db.exec('set role anon');
    expect((await db.query('select id,source_url from public.product_images')).rows).toHaveLength(0);
    await db.exec('reset role');

    await db.query(
      `update private.source_rights_reviews
       set image_rights_status = 'approved', terms_checked_at = now(), reviewed_at = now()
       where source_id = $1`,
      [sourceId],
    );
    await db.query(
      `update public.product_images
       set image_license_status = 'approved', review_status = 'approved',
           raw_image_hash = md5(concat_ws(E'\\n', coalesce(storage_path, ''), coalesce(source_url, ''),
             source_id::text, alt_text, coalesce(attribution, ''), coalesce(photographer, '')))
       where id = $1`,
      [image.rows[0].id],
    );

    await db.exec('set role anon');
    const visible = await db.query<{ id: string; source_url: string }>('select id,source_url from public.product_images');
    expect(visible.rows).toEqual([{ id: image.rows[0].id, source_url: 'https://images.example.test/test-only-packshot.png' }]);
    await db.exec('reset role');

    await expect(db.query(
      `insert into public.product_images (product_id, source_url, source_id, alt_text)
       values ($1, 'http://images.example.test/test-only-packshot.png', $2, 'TEST ONLY — unsecure packshot')`,
      [productId, sourceId],
    )).rejects.toThrow();
  });

  it('restricts image publication to reviewers and requires a separate image-rights decision', async () => {
    const db = await freshDatabase();
    const { productId } = await addSyntheticPublishedProduct(db, 'whisky', 'image-review');
    const imageSource = await db.query<{ id: string }>(
      `insert into public.sources (source_name, source_type, canonical_url)
       values ('TEST ONLY — packshot source', 'operator_entry', 'https://example.test/test-only-image-source')
       returning id`,
    );
    const sourceId = imageSource.rows[0].id;
    await db.query(
      `insert into private.source_rights_reviews
        (source_id, data_rights_status, text_rights_status, image_rights_status)
       values ($1, 'unreviewed', 'unreviewed', 'unreviewed')`, [sourceId],
    );
    const image = await db.query<{ id: string }>(
      `insert into public.product_images (product_id, source_url, source_id, alt_text)
       values ($1, 'https://cdn.example.test/test-only-packshot.png', $2, 'TEST ONLY — Flaschenansicht')
       returning id`, [productId, sourceId],
    );

    await db.exec('set role anon');
    expect((await db.query('select id from public.product_images')).rows).toHaveLength(0);
    await expect(db.query('select * from private.product_image_review_events')).rejects.toThrow();
    await expect(db.query(
      "select public.review_product_image($1, '{\"status\":\"approved\"}'::jsonb)", [image.rows[0].id],
    )).rejects.toThrow();
    await db.exec('reset role');

    const analystId = '77777777-7777-4777-8777-777777777777';
    const reviewerId = '88888888-8888-4888-8888-888888888888';
    await db.query('insert into auth.users (id) values ($1), ($2)', [analystId, reviewerId]);
    await db.query("insert into public.admin_members (user_id, role) values ($1, 'analyst'), ($2, 'reviewer')", [analystId, reviewerId]);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [analystId]);
    await db.exec('set role authenticated');
    await expect(db.query(
      "select public.review_product_image($1, '{\"status\":\"approved\"}'::jsonb)", [image.rows[0].id],
    )).rejects.toThrow(/active owner or reviewer/i);
    await expect(db.query('select * from private.product_image_review_events')).rejects.toThrow();
    await db.exec('reset role');

    const termsUrl = 'https://example.test/image-terms';
    const checkedAt = (await db.query<{ checked_at: string }>("select (now() - interval '1 minute')::text as checked_at")).rows[0].checked_at;
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [reviewerId]);
    await db.exec('set role authenticated');
    await expect(db.query(
      "select public.review_product_image($1, '{\"status\":\"approved\"}'::jsonb)", [image.rows[0].id],
    )).rejects.toThrow(/image-source rights approval/i);
    await db.query('select public.review_import_source_rights($1, $2::jsonb)', [sourceId, JSON.stringify({
      imageRightsStatus: 'approved',
      licenseId: 'TEST ONLY — permission recorded for this isolated test',
      termsUrl,
      termsCheckedAt: checkedAt,
    })]);
    await db.query('select public.review_product_image($1, $2::jsonb)', [image.rows[0].id, JSON.stringify({ status: 'approved', note: 'TEST ONLY — verified permission' })]);

    await db.exec('reset role');
    await db.exec('set role anon');
    const visible = await db.query<{ source_url: string }>('select source_url from public.product_images');
    expect(visible.rows).toEqual([{ source_url: 'https://cdn.example.test/test-only-packshot.png' }]);
    await db.exec('reset role');
    expect((await db.query<{ count: number }>('select count(*)::int as count from private.product_image_review_events')).rows[0].count).toBe(1);
  });

  it('stores and exposes mouthfeel only with its own current text-rights hash', async () => {
    const db = await freshDatabase();
    const { productId, sourceId } = await addSyntheticPublishedProduct(db, 'gin', 'mouthfeel');
    await db.query(
      `update private.source_rights_reviews
       set text_rights_status = 'approved', terms_checked_at = now(), reviewed_at = now()
       where source_id = $1`,
      [sourceId],
    );
    const note = await db.query<{ id: string }>(
      `insert into public.tasting_notes
        (product_id, author_type, palate_text, mouthfeel_text, source_id, text_license_status, review_status, raw_content_hash)
       values ($1, 'editorial', 'TEST ONLY — Geschmack', 'TEST ONLY — Mundgefühl', $2, 'approved', 'approved',
         md5(concat_ws(E'\\n', '', 'editorial', '', 'TEST ONLY — Geschmack', 'TEST ONLY — Mundgefühl', '', '', ($2::uuid)::text, '', 'de')))
       returning id`,
      [productId, sourceId],
    );

    await db.exec('set role anon');
    const visible = await db.query<{ mouthfeel_text: string }>('select mouthfeel_text from public.tasting_notes');
    expect(visible.rows).toEqual([{ mouthfeel_text: 'TEST ONLY — Mundgefühl' }]);
    await db.exec('reset role');

    await expect(db.query(
      `update public.tasting_notes set mouthfeel_text = 'TEST ONLY — geändert' where id = $1`,
      [note.rows[0].id],
    )).rejects.toThrow(/hash|rights/i);
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

  it('bounds direct search RPC calls and treats wildcard characters literally', async () => {
    const db = await freshDatabase();
    await addSyntheticPublishedProduct(db);
    await db.exec('set role anon');

    const tooLargePage = await db.query(
      `select * from public.search_catalog(null, null, null, null, null, null, 2147483647, 48)`,
    );
    const percentSearch = await db.query(
      `select * from public.search_catalog('%', '%', null, null, null, null, 1, 12)`,
    );
    const underscoreSearch = await db.query(
      `select * from public.search_catalog('_', '_', null, null, null, null, 1, 12)`,
    );
    expect(tooLargePage.rows).toHaveLength(0);
    expect(percentSearch.rows).toHaveLength(0);
    expect(underscoreSearch.rows).toHaveLength(0);
    await db.exec('reset role');
  });

  it('lets a parent category include its active subcategories in public search', async () => {
    const db = await freshDatabase();
    await addSyntheticPublishedProduct(db, 'whisky-scotch', 'scotch-child');
    await addSyntheticPublishedProduct(db, 'rum-aged', 'rum-child');
    await db.exec('set role anon');

    const parentSearch = await db.query<{ slug: string }>(
      "select slug from public.search_catalog(null, null, 'whisky', null, null, null, 1, 12)",
    );
    const childSearch = await db.query<{ slug: string }>(
      "select slug from public.search_catalog(null, null, 'whisky-scotch', null, null, null, 1, 12)",
    );
    expect(parentSearch.rows.map((row) => row.slug)).toEqual(['test-only-product-scotch-child']);
    expect(childSearch.rows.map((row) => row.slug)).toEqual(['test-only-product-scotch-child']);
    await db.exec('reset role');
  });

  it('hides products and QR targets when their category is inactive', async () => {
    const db = await freshDatabase();
    const { productId, categoryId } = await addSyntheticPublishedProduct(db);
    await db.query(
      `insert into public.qr_links (public_code, product_id)
       values ('inactivecategorytestcode0001', $1)`,
      [productId],
    );
    await db.query('update public.categories set active = false where id = $1', [categoryId]);
    await db.exec('set role anon');

    expect((await db.query('select id from public.products')).rows).toHaveLength(0);
    const qr = await db.query<{ resolution_status: string; product_slug: string | null }>(
      `select * from public.resolve_qr_link('inactivecategorytestcode0001')`,
    );
    expect(qr.rows).toEqual([{ resolution_status: 'unavailable', product_slug: null }]);
    await db.exec('reset role');
  });

  it('keeps community reviews consented, moderated, and limited to approved public columns', async () => {
    const db = await freshDatabase();
    const { productId } = await addSyntheticPublishedProduct(db);
    const reviewerId = '66666666-6666-4666-8666-666666666666';
    await db.query('insert into auth.users (id) values ($1)', [reviewerId]);
    await db.query("insert into public.admin_members (user_id, role) values ($1, 'reviewer')", [reviewerId]);
    const review = await db.query<{ id: string }>(
      `insert into public.community_reviews
        (product_id, reviewer_user_id, display_name, rating, nose_text, publication_consent_version, publication_consented_at)
       values ($1, $2, 'TEST ONLY reviewer', 4, 'TEST ONLY note', 'test-consent-v1', now())
       returning id`, [productId, reviewerId],
    );

    await db.exec('set role anon');
    const pending = await db.query('select id, rating, nose_text, origin from public.community_reviews');
    expect(pending.rows).toHaveLength(0);
    await expect(db.query('select reviewer_user_id from public.community_reviews')).rejects.toThrow();
    await expect(db.query(
      `insert into public.community_reviews
        (product_id, reviewer_user_id, rating, publication_consent_version, publication_consented_at)
       values ($1, $2, 5, 'test-consent-v1', now())`, [productId, reviewerId],
    )).rejects.toThrow();
    await db.exec('reset role');

    await db.query(
      `update public.community_reviews set moderation_status = 'approved', moderated_by = $1, moderated_at = now() where id = $2`,
      [reviewerId, review.rows[0].id],
    );
    await db.exec('set role anon');
    const published = await db.query<{ rating: number; nose_text: string; origin: string }>(
      'select rating, nose_text, origin from public.community_reviews',
    );
    expect(published.rows).toEqual([{ rating: 4, nose_text: 'TEST ONLY note', origin: 'self_reported' }]);
    await db.exec('reset role');
  });

  it('keeps import data private and denies mutating RPCs to anonymous and non-admin users', async () => {
    const db = await freshDatabase();
    await db.exec('set role anon');
    await expect(db.query('select * from private.import_jobs')).rejects.toThrow();
    await expect(db.query('select * from private.import_records')).rejects.toThrow();
    await expect(db.query("select public.register_import_sources('[]'::jsonb)")).rejects.toThrow();
    await expect(db.query("select public.stage_catalog_import('{}'::jsonb)")).rejects.toThrow();
    await expect(db.query('select public.upsert_catalog_import_job(gen_random_uuid(), 1)')).rejects.toThrow();
    await db.exec('reset role');

    const editorId = '11111111-1111-4111-8111-111111111111';
    await db.query('insert into auth.users (id) values ($1)', [editorId]);
    await db.query("insert into public.admin_members (user_id, role) values ($1, 'analyst')", [editorId]);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [editorId]);
    await db.exec('set role authenticated');
    await expect(db.query("select public.review_import_source_rights(gen_random_uuid(), '{}'::jsonb)")).rejects.toThrow(/owner or reviewer/i);
    await expect(db.query('select public.upsert_catalog_import_job(gen_random_uuid(), 1)')).rejects.toThrow(/owner or editor/i);
    await expect(db.query("select * from private.import_jobs")).rejects.toThrow();
    await db.exec('reset role');
  });

  it('stages after separate data-rights approval and upserts only unpublished pending-provenance drafts', async () => {
    const db = await freshDatabase();
    const editorId = '22222222-2222-4222-8222-222222222222';
    await db.query('insert into auth.users (id) values ($1)', [editorId]);
    await db.query("insert into public.admin_members (user_id, role) values ($1, 'editor')", [editorId]);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [editorId]);
    await db.exec('set role authenticated');

    const source = {
      name: 'TEST ONLY — source',
      type: 'operator_entry',
      url: 'https://example.test/source/record-1',
      termsUrl: 'https://example.test/terms',
      licenseId: 'TEST ONLY — review required',
      attribution: 'TEST ONLY',
    };
    const registered = await db.query<{ source_id: string }>(
      'select source_id from public.register_import_sources($1::jsonb)',
      [JSON.stringify([source])],
    );
    const sourceId = registered.rows[0].source_id;
    const batch = {
      inputDigest: 'a'.repeat(64),
      normalizerVersion: 'arometra-import-v1',
      records: [{
        rowNumber: 1,
        recordKey: 'b'.repeat(64),
        quality: 'incomplete',
        retrievedAt: '2026-10-10T10:00:00Z',
        source,
        sourceRecordId: 'fixture-record-001',
        normalizedRecord: {
          brand: { name: 'TEST ONLY — brand', normalizedName: 'test only brand', countryCode: null },
          product: { name: 'TEST ONLY — product', normalizedName: 'test only product', categorySlug: 'whisky', family: null, originCountryCode: null, originRegion: null, ageYears: null, abvPercent: null },
          variant: { gtin: null, volumeMl: 700, marketCountryCode: 'GB', abvPercentOverride: null, editionLabel: null, variantCode: null },
          flavors: [],
          tastingNotes: null,
        },
        issues: [{ code: 'INCOMPLETE_PROFILE', severity: 'warning' }],
      }, {
        rowNumber: 2,
        recordKey: 'c'.repeat(64),
        quality: 'incomplete',
        retrievedAt: '2026-10-10T10:00:00Z',
        source,
        sourceRecordId: 'fixture-record-002',
        normalizedRecord: {
          brand: { name: 'TEST ONLY — brand', normalizedName: 'test only brand', countryCode: null },
          product: { name: 'TEST ONLY — product', normalizedName: 'test only product', categorySlug: 'whisky', family: null, originCountryCode: null, originRegion: null, ageYears: null, abvPercent: null },
          variant: { gtin: null, volumeMl: 1000, marketCountryCode: 'GB', abvPercentOverride: null, editionLabel: null, variantCode: null },
          flavors: [],
          tastingNotes: null,
        },
        issues: [{ code: 'INCOMPLETE_PROFILE', severity: 'warning' }],
      }],
    };
    const firstImportedRecord = batch.records[0] as unknown as {
      normalizedRecord: { product: Record<string, unknown>; tastingNotes: unknown };
    };
    firstImportedRecord.normalizedRecord.product.image = {
      url: 'https://cdn.example.test/test-only-packshot.png',
      altText: 'TEST ONLY — Flaschenansicht',
      attribution: null,
      source: structuredClone(source),
    };
    firstImportedRecord.normalizedRecord.tastingNotes = {
      authorType: 'manufacturer',
      authorLabel: null,
      nose: 'TEST ONLY — Geruch',
      palate: null,
      mouthfeel: 'TEST ONLY — Mundgefühl',
      finish: null,
      overall: null,
      language: 'de',
      tastedAt: null,
    };

    await expect(db.query('select public.stage_catalog_import($1::jsonb)', [JSON.stringify(batch)])).rejects.toThrow(/data rights are not approved/i);
    const checkedAt = (await db.query<{ checked_at: string }>("select (now() - interval '1 minute')::text as checked_at")).rows[0].checked_at;
    const reviewerId = '55555555-5555-4555-8555-555555555555';
    await db.exec('reset role');
    await db.query('insert into auth.users (id) values ($1)', [reviewerId]);
    await db.query("insert into public.admin_members (user_id, role) values ($1, 'reviewer')", [reviewerId]);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [reviewerId]);
    await db.exec('set role authenticated');
    await db.query(
      `select public.review_import_source_rights($1, $2::jsonb)`,
      [sourceId, JSON.stringify({ dataRightsStatus: 'approved', textRightsStatus: 'approved', licenseId: 'TEST ONLY permission', termsUrl: source.termsUrl, termsCheckedAt: checkedAt, notes: 'TEST ONLY reviewer assertion' })],
    );
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [editorId]);
    await db.exec('set role authenticated');

    await expect(db.query('select public.stage_catalog_import($1::jsonb)', [JSON.stringify(batch)]))
      .rejects.toThrow(/snapshot differs from registered and reviewed source metadata/i);
    batch.records.forEach((record) => { record.source.licenseId = 'TEST ONLY permission'; });
    const imageCandidateValue = firstImportedRecord.normalizedRecord.product.image as { source: { licenseId: string } };
    imageCandidateValue.source.licenseId = 'TEST ONLY permission';
    const first = await db.query<{ result: { jobId: string; idempotentReplay: boolean } }>(
      'select public.stage_catalog_import($1::jsonb) as result',
      [JSON.stringify(batch)],
    );
    const second = await db.query<{ result: { jobId: string; idempotentReplay: boolean } }>(
      'select public.stage_catalog_import($1::jsonb) as result',
      [JSON.stringify(batch)],
    );
    expect(first.rows[0].result.idempotentReplay).toBe(false);
    expect(second.rows[0].result.idempotentReplay).toBe(true);
    expect(second.rows[0].result.jobId).toBe(first.rows[0].result.jobId);

    await db.exec('reset role');
    const registeredMetadata = await db.query<{ source_name: string; source_type: string; canonical_url: string; attribution_text: string | null; terms_url: string | null; license_id: string | null }>(
      `select s.source_name, s.source_type::text, s.canonical_url, s.attribution_text, r.terms_url, r.license_id
       from public.sources s join private.source_rights_reviews r on r.source_id = s.id where s.id = $1`, [sourceId],
    );
    expect(registeredMetadata.rows[0]).toMatchObject({
      source_name: source.name, source_type: source.type, canonical_url: source.url,
      attribution_text: source.attribution, terms_url: source.termsUrl, license_id: 'TEST ONLY permission',
    });
    const storedImageSource = await db.query<{ source_snapshot: unknown }>(
      `select normalized_record #> '{product,image,source}' as source_snapshot from private.import_records where source_id = $1 order by row_number limit 1`, [sourceId],
    );
    expect(storedImageSource.rows[0].source_snapshot).toEqual({ ...source, licenseId: 'TEST ONLY permission' });
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [editorId]);
    await db.exec('set role authenticated');

    const applied = await db.query<{ result: { processedCount: number; outcomes: Array<{ status: string; productId: string; variantId: string }> } }>(
      'select public.upsert_catalog_import_job($1, 5000) as result', [first.rows[0].result.jobId],
    );
    const replay = await db.query<{ result: { outcomes: Array<{ status: string; productId: string; variantId: string }> } }>(
      'select public.upsert_catalog_import_job($1, 5000) as result', [first.rows[0].result.jobId],
    );
    expect(applied.rows[0].result.processedCount).toBe(2);
    expect(applied.rows[0].result.outcomes.map((item) => item.status)).toEqual(['upserted', 'upserted']);
    expect(replay.rows[0].result.outcomes.map((item) => item.status)).toEqual(['already_applied', 'already_applied']);
    expect(replay.rows[0].result.outcomes[0].productId).toBe(applied.rows[0].result.outcomes[0].productId);
    expect(replay.rows[0].result.outcomes[1].productId).toBe(applied.rows[0].result.outcomes[0].productId);
    expect(new Set(applied.rows[0].result.outcomes.map((item) => item.variantId)).size).toBe(2);

    await db.exec('reset role');
    await db.exec('set role anon');
    expect((await db.query<{ count: number }>('select count(*)::int as count from public.products')).rows[0].count).toBe(0);
    expect((await db.query<{ count: number }>('select count(*)::int as count from public.product_variants')).rows[0].count).toBe(0);
    await db.exec('reset role');

    expect((await db.query<{ count: number }>('select count(*)::int as count from private.import_jobs')).rows[0].count).toBe(1);
    expect((await db.query<{ count: number }>('select count(*)::int as count from private.import_records')).rows[0].count).toBe(2);
    expect((await db.query<{ count: number }>('select count(*)::int as count from private.import_record_heads')).rows[0].count).toBe(2);
    expect((await db.query<{ count: number }>("select count(*)::int as count from public.products where product_status = 'draft' and editorial_reviewed_at is null")).rows[0].count).toBe(1);
    expect((await db.query<{ count: number }>("select count(*)::int as count from public.product_field_provenance where verification_status = 'pending' and verified_at is null")).rows[0].count).toBe(3);
    expect((await db.query<{ count: number }>("select count(*)::int as count from public.brands where status = 'draft' and verified_at is null")).rows[0].count).toBe(1);
    expect((await db.query<{ volume_ml: number }>('select volume_ml from public.product_variants order by volume_ml')).rows.map((row) => row.volume_ml)).toEqual([700, 1000]);
    expect((await db.query<{ count: number }>("select count(*)::int as count from public.variant_field_provenance where field_path = 'volume_ml' and verification_status = 'pending'")).rows[0].count).toBe(2);
    const importedImage = await db.query<{ image_license_status: string; review_status: string; raw_image_hash: string | null }>(
      'select image_license_status,review_status,raw_image_hash from public.product_images',
    );
    expect(importedImage.rows).toEqual([{ image_license_status: 'unreviewed', review_status: 'pending', raw_image_hash: null }]);
    expect((await db.query<{ mouthfeel_text: string; mouthfeel_hash: string | null }>(
      'select mouthfeel_text,mouthfeel_hash from public.tasting_notes',
    )).rows).toEqual([{ mouthfeel_text: 'TEST ONLY — Mundgefühl', mouthfeel_hash: expect.stringMatching(/^[a-f0-9]{32}$/) }]);
    expect((await db.query<{ image_rights_status: string }>(
      'select image_rights_status from private.source_rights_reviews where source_id = $1', [sourceId],
    )).rows[0].image_rights_status).toBe('unreviewed');
  });

  it('requires separate tasting-text rights and prevents editors from approving source rights', async () => {
    const db = await freshDatabase();
    const editorId = '33333333-3333-4333-8333-333333333333';
    await db.query('insert into auth.users (id) values ($1)', [editorId]);
    await db.query("insert into public.admin_members (user_id, role) values ($1, 'editor')", [editorId]);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [editorId]);
    await db.exec('set role authenticated');
    const source = { name: 'TEST ONLY — text source', type: 'operator_entry', url: 'https://example.test/source/text', termsUrl: 'https://example.test/terms', licenseId: 'TEST ONLY', attribution: null };
    const registration = await db.query<{ source_id: string }>(
      'select source_id from public.register_import_sources($1::jsonb)', [JSON.stringify([source])],
    );
    const sourceId = registration.rows[0].source_id;
    const checkedAt = (await db.query<{ checked_at: string }>("select (now() - interval '1 minute')::text as checked_at")).rows[0].checked_at;
    await expect(db.query('select public.review_import_source_rights($1, $2::jsonb)', [sourceId, JSON.stringify({ dataRightsStatus: 'approved', licenseId: 'TEST ONLY', termsUrl: source.termsUrl, termsCheckedAt: checkedAt })])).rejects.toThrow(/owner or reviewer/i);

    const reviewerId = '44444444-4444-4444-8444-444444444444';
    await db.exec('reset role');
    await db.query('insert into auth.users (id) values ($1)', [reviewerId]);
    await db.query("insert into public.admin_members (user_id, role) values ($1, 'reviewer')", [reviewerId]);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [reviewerId]);
    await db.exec('set role authenticated');
    await db.query('select public.review_import_source_rights($1, $2::jsonb)', [sourceId, JSON.stringify({ dataRightsStatus: 'approved', licenseId: 'TEST ONLY', termsUrl: source.termsUrl, termsCheckedAt: checkedAt })]);
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [editorId]);
    await db.exec('set role authenticated');

    const batch = {
      inputDigest: 'c'.repeat(64), normalizerVersion: 'arometra-import-v1', records: [{
        rowNumber: 1, recordKey: 'd'.repeat(64), quality: 'complete', retrievedAt: '2026-10-10T10:00:00Z', source,
        sourceRecordId: 'fixture-text-1',
        normalizedRecord: {
          brand: { name: 'TEST ONLY — brand', normalizedName: 'test only brand', countryCode: null },
          product: { name: 'TEST ONLY — product', normalizedName: 'test only product', categorySlug: 'whisky', family: null, originCountryCode: 'GB', originRegion: null, ageYears: null, abvPercent: 40 },
          variant: { gtin: null, volumeMl: 700, marketCountryCode: 'GB', abvPercentOverride: null, editionLabel: null, variantCode: null },
          flavors: [], tastingNotes: { authorType: 'manufacturer', authorLabel: null, nose: 'TEST ONLY text', palate: null, finish: null, overall: null, language: 'en', tastedAt: null },
        }, issues: [],
      }],
    };
    await expect(db.query('select public.stage_catalog_import($1::jsonb)', [JSON.stringify(batch)])).rejects.toThrow(/separately approved text rights/i);
    await db.exec('reset role');
    const rights = await db.query<{ text_rights_status: string }>('select text_rights_status from private.source_rights_reviews where source_id = $1', [sourceId]);
    expect(rights.rows[0].text_rights_status).toBe('unreviewed');
  });
});
