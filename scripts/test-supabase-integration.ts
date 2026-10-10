import { randomUUID } from 'node:crypto';
import { loadEnvConfig } from '@next/env';
import { hasSafeSupabasePublishableKey, readPublicSupabaseEnvironment } from '../src/lib/supabase/configuration';

loadEnvConfig(process.cwd(), true, { info: () => undefined, error: () => undefined }, true);

function fail(code: string): never {
  throw new Error(code);
}

function jwtIsAuthenticated(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { sub?: unknown; role?: unknown; exp?: unknown };
    return typeof claims.sub === 'string' && claims.role === 'authenticated'
      && typeof claims.exp === 'number' && claims.exp > Math.floor(Date.now() / 1000) + 30;
  } catch {
    return false;
  }
}

function getConfiguration(): {
  baseUrl: string;
  publishableKey: string;
  nonAdminToken: string | undefined;
  adminToken: string | undefined;
} {
  const { url, publishableKey: key } = readPublicSupabaseEnvironment(process.env);
  const {
    SUPABASE_INTEGRATION_NON_ADMIN_ACCESS_TOKEN: nonAdminToken,
    SUPABASE_INTEGRATION_ADMIN_ACCESS_TOKEN: adminToken,
  } = process.env;
  if (!url || !key || !hasSafeSupabasePublishableKey(key)) fail('BLOCKED: Supabase URL and safe publishable key are required.');
  if (process.env.AROMETRA_SUPABASE_TARGET !== 'development') fail('BLOCKED: set AROMETRA_SUPABASE_TARGET=development for the isolated Supabase test project.');
  const projectRef = process.env.AROMETRA_DEVELOPMENT_PROJECT_REF;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return fail('BLOCKED: SUPABASE_URL is invalid.');
  }
  if (!projectRef || !/^[a-z0-9]{20}$/.test(projectRef) || parsed.protocol !== 'https:' || parsed.hostname !== `${projectRef}.supabase.co`) {
    fail('BLOCKED: Supabase URL does not match the explicit development project reference.');
  }
  return {
    baseUrl: parsed.toString().replace(/\/$/, ''),
    publishableKey: key,
    nonAdminToken: jwtIsAuthenticated(nonAdminToken) ? nonAdminToken : undefined,
    adminToken: jwtIsAuthenticated(adminToken) ? adminToken : undefined,
  };
}

async function request(
  baseUrl: string,
  key: string,
  bearer: string | undefined,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      apikey: key,
      ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });
}

async function expectStatus(response: Response, statuses: number[], label: string): Promise<void> {
  if (!statuses.includes(response.status)) fail(`FAIL: ${label} returned HTTP ${response.status}; expected ${statuses.join('/')}.`);
}

async function run(): Promise<void> {
  const config = getConfiguration();
  const checks: string[] = [];
  const anonymousBearer = config.publishableKey.split('.').length === 3 ? config.publishableKey : undefined;

  const authSettings = await request(config.baseUrl, config.publishableKey, anonymousBearer, '/auth/v1/settings');
  await expectStatus(authSettings, [200], 'Supabase Auth settings endpoint');
  checks.push('Supabase Auth endpoint is reachable: 200; no user session inferred');

  for (const [table, fields] of [
    ['categories', 'id'],
    ['sensory_dimensions', 'code'],
    ['sensory_tags', 'code'],
    ['category_sensory_dimensions', 'category_id,dimension_code'],
    ['category_sensory_tag_rules', 'category_id,tag_code,dimension_code'],
    ['products', 'id'],
    ['brands', 'id'],
    ['product_variants', 'id'],
    ['product_flavor_values', 'product_id'],
    ['tasting_notes', 'id,mouthfeel_text'],
    ['product_images', 'id,source_url'],
    ['community_reviews', 'id'],
  ] as const) {
    const response = await request(config.baseUrl, config.publishableKey, anonymousBearer, `/rest/v1/${table}?select=${fields}&limit=1`);
    await expectStatus(response, [200], `anonymous ${table} public read`);
    checks.push(`anonymous ${table} read: 200`);
  }

  const publicImageJoin = await request(config.baseUrl, config.publishableKey, anonymousBearer,
    '/rest/v1/product_images?select=id,product_id,storage_path,source_url,alt_text,attribution,sort_order,source:sources!inner(source_name,canonical_url)&limit=1');
  await expectStatus(publicImageJoin, [200], 'anonymous approved product-image source join');
  checks.push('anonymous approved product-image source metadata join: 200');

  const searchTerm = `arometra-integration-no-match-${randomUUID()}`;
  const liveSearch = await request(config.baseUrl, config.publishableKey, anonymousBearer,
    '/rest/v1/rpc/search_catalog', {
      method: 'POST',
      body: JSON.stringify({
        search_term: searchTerm,
        normalized_term: searchTerm,
        category_slug: null,
        flavor_code: null,
        origin_country_code: null,
        brand_slug: null,
        page_number: 1,
        page_size: 12,
      }),
    });
  await expectStatus(liveSearch, [200], 'anonymous catalog search RPC');
  const liveSearchRows = await liveSearch.json() as unknown[];
  if (liveSearchRows.length !== 0) fail('FAIL: unique live search probe unexpectedly returned catalog rows.');
  checks.push('anonymous catalog search RPC: 200; unique no-match query returned 0 rows');

  const realSearch = await request(config.baseUrl, config.publishableKey, anonymousBearer,
    '/rest/v1/rpc/search_catalog', {
      method: 'POST',
      body: JSON.stringify({
        search_term: 'Teacher',
        normalized_term: 'teacher',
        category_slug: null,
        flavor_code: null,
        origin_country_code: null,
        brand_slug: null,
        page_number: 1,
        page_size: 12,
      }),
    });
  await expectStatus(realSearch, [200], 'anonymous real product catalog search');
  const realSearchRows = await realSearch.json() as Array<{ id?: unknown; slug?: unknown; name?: unknown }>;
  const teacher = realSearchRows.find((row) => typeof row.name === 'string' && row.name.includes('Teacher'));
  if (!teacher || typeof teacher.id !== 'string' || typeof teacher.slug !== 'string') {
    fail('FAIL: public search did not return the reviewed Teacher product.');
  }
  checks.push('anonymous catalog search returns the reviewed Teacher product');

  const realProduct = await request(config.baseUrl, config.publishableKey, anonymousBearer,
    `/rest/v1/products?select=id,slug,name,brand:brands!inner(name,slug),primary_category_id,category:categories!products_primary_category_id_fkey!inner(name_de,slug)&id=eq.${teacher.id}&limit=1`);
  await expectStatus(realProduct, [200], 'anonymous reviewed product detail and category joins');
  const realProductRows = await realProduct.json() as unknown[];
  if (realProductRows.length !== 1) fail('FAIL: reviewed product detail was not publicly readable.');
  checks.push('anonymous reviewed product detail with category and brand joins returns one row');

  const realTags = await request(config.baseUrl, config.publishableKey, anonymousBearer,
    '/rest/v1/rpc/get_public_sensory_tags', {
      method: 'POST', body: JSON.stringify({ target_product_ids: [teacher.id] }),
    });
  await expectStatus(realTags, [200], 'anonymous reviewed product aroma tags');
  const realTagsRows = await realTags.json() as Array<{ tag_code?: unknown }>;
  if (realTagsRows.length < 1) fail('FAIL: reviewed product has no public category-approved aroma tags.');
  checks.push(`anonymous reviewed product aroma tags returned: ${realTagsRows.length}`);

  const productDetailProbe = await request(config.baseUrl, config.publishableKey, anonymousBearer,
    '/rest/v1/products?select=id,slug,name,brand:brands!inner(name,slug),primary_category_id,category:categories!products_primary_category_id_fkey!inner(name_de,slug)&slug=eq.arometra-integration-no-match&limit=1');
  await expectStatus(productDetailProbe, [200], 'anonymous product-detail category relationship');
  const productDetailRows = await productDetailProbe.json() as unknown[];
  if (productDetailRows.length !== 0) fail('FAIL: product-detail no-match probe unexpectedly returned catalog rows.');
  checks.push('anonymous product-detail relationship query: 200; unknown slug returned 0 rows');

  const unknownQr = await request(config.baseUrl, config.publishableKey, anonymousBearer,
    '/rest/v1/rpc/resolve_qr_link', {
      method: 'POST', body: JSON.stringify({ lookup_code: randomUUID().replaceAll('-', '') }),
    });
  await expectStatus(unknownQr, [200], 'anonymous QR resolver RPC');
  const unknownQrRows = await unknownQr.json() as unknown[];
  if (unknownQrRows.length !== 0) fail('FAIL: a random QR code unexpectedly resolved to a product.');
  checks.push('anonymous QR resolver RPC: 200; random unknown code returned 0 rows');

  const sensoryAxes = await request(config.baseUrl, config.publishableKey, anonymousBearer,
    '/rest/v1/category_sensory_dimensions?select=dimension_code&limit=1000');
  await expectStatus(sensoryAxes, [200], 'anonymous category sensory profile read');
  const sensoryAxesData = await sensoryAxes.json() as unknown[];
  if (sensoryAxesData.length !== 80) fail(`FAIL: expected 80 public category sensory axes; received ${sensoryAxesData.length}.`);
  checks.push('anonymous category sensory profiles returned 80 configured axes');

  for (const table of ['product_sensory_descriptors', 'product_sensory_measurements']) {
    const response = await request(config.baseUrl, config.publishableKey, anonymousBearer, `/rest/v1/${table}?select=*&limit=1`);
    await expectStatus(response, [401, 403], `anonymous ${table} raw read denial`);
    checks.push(`anonymous ${table} raw read denied: ${response.status}`);
  }

  const unknownProductId = randomUUID();
  const sensoryProfile = await request(config.baseUrl, config.publishableKey, anonymousBearer,
    '/rest/v1/rpc/get_product_sensory_profile', {
      method: 'POST', body: JSON.stringify({ target_product_id: unknownProductId }),
    });
  await expectStatus(sensoryProfile, [200], 'anonymous public sensory profile RPC');
  const sensoryProfileData = await sensoryProfile.json() as unknown[];
  if (sensoryProfileData.length !== 0) fail('FAIL: sensory profile RPC exposed data for an unknown or unpublished product.');
  checks.push('anonymous sensory profile RPC returns no rows for unknown/unpublished products');

  const sensoryTags = await request(config.baseUrl, config.publishableKey, anonymousBearer,
    '/rest/v1/rpc/get_public_sensory_tags', {
      method: 'POST', body: JSON.stringify({ target_product_ids: [unknownProductId] }),
    });
  await expectStatus(sensoryTags, [200], 'anonymous public recommendation tags RPC');
  const sensoryTagData = await sensoryTags.json() as unknown[];
  if (sensoryTagData.length !== 0) fail('FAIL: recommendation tag RPC exposed data for an unknown or unpublished product.');
  checks.push('anonymous recommendation tags RPC returns no rows for unknown/unpublished products');

  const publicAdminRead = await request(config.baseUrl, config.publishableKey, anonymousBearer, '/rest/v1/admin_members?select=*&limit=1');
  await expectStatus(publicAdminRead, [401, 403], 'anonymous admin table read');
  checks.push(`anonymous admin_members read denied: ${publicAdminRead.status}`);

  const anonymousImageReview = await request(config.baseUrl, config.publishableKey, anonymousBearer,
    '/rest/v1/rpc/review_product_image', {
      method: 'POST', body: JSON.stringify({ p_image_id: randomUUID(), p_decision: { status: 'approved' } }),
    });
  await expectStatus(anonymousImageReview, [401, 403], 'anonymous product-image review RPC');
  checks.push(`anonymous product-image review RPC denied: ${anonymousImageReview.status}`);

  for (const [name, body] of [
    ['attest_import_source_data_rights', { p_source_id: randomUUID(), p_checked_at: new Date().toISOString(), p_note: 'Integration denial probe only.' }],
    ['filter_import_job_category_tags', { p_job_id: randomUUID() }],
    ['review_and_publish_catalog_import_job_v2', { p_job_id: randomUUID(), p_note: 'Integration denial probe only.' }],
  ] as const) {
    const response = await request(config.baseUrl, config.publishableKey, anonymousBearer, `/rest/v1/rpc/${name}`, {
      method: 'POST', body: JSON.stringify(body),
    });
    await expectStatus(response, [401, 403], `anonymous ${name} denial`);
    checks.push(`anonymous ${name} denied: ${response.status}`);
  }

  const { nonAdminToken, adminToken } = config;
  if (!nonAdminToken || !adminToken) {
    process.stdout.write(`${JSON.stringify({
      status: 'partial',
      target: 'development',
      checks,
      authenticatedChecks: 'blocked: separate non-expired non-admin and owner/editor JWTs are required',
    }, null, 2)}\n`);
    process.exitCode = 2;
    return;
  }

  for (const [label, token] of [['non-admin', nonAdminToken], ['owner/editor', adminToken]] as const) {
    const response = await request(config.baseUrl, config.publishableKey, token, '/auth/v1/user');
    await expectStatus(response, [200], `${label} Auth session`);
    checks.push(`${label} Auth session validated: 200`);
  }

  const nonAdminPublicRead = await request(config.baseUrl, config.publishableKey, nonAdminToken, '/rest/v1/products?select=id&limit=1');
  await expectStatus(nonAdminPublicRead, [200], 'authenticated non-admin public product read');
  checks.push('authenticated non-admin product read: 200');

  const nonAdminAdminRead = await request(config.baseUrl, config.publishableKey, nonAdminToken, '/rest/v1/admin_members?select=*&limit=1');
  await expectStatus(nonAdminAdminRead, [401, 403], 'authenticated non-admin admin table read');
  checks.push(`authenticated non-admin admin_members read denied: ${nonAdminAdminRead.status}`);

  const nonAdminSensoryRead = await request(config.baseUrl, config.publishableKey, nonAdminToken,
    '/rest/v1/product_sensory_descriptors?select=*&limit=1');
  await expectStatus(nonAdminSensoryRead, [401, 403], 'authenticated non-admin sensory staging read denial');
  checks.push(`authenticated non-admin raw sensory descriptor read denied: ${nonAdminSensoryRead.status}`);

  const publicStageRpc = await request(config.baseUrl, config.publishableKey, anonymousBearer, '/rest/v1/rpc/stage_catalog_import', {
    method: 'POST', body: JSON.stringify({ p_batch: {} }),
  });
  await expectStatus(publicStageRpc, [401, 403], 'anonymous import staging RPC');
  checks.push(`anonymous staging RPC denied: ${publicStageRpc.status}`);

  const privateSchema = await request(config.baseUrl, config.publishableKey, anonymousBearer, '/rest/v1/import_jobs?select=*&limit=1', {
    headers: { 'accept-profile': 'private' },
  });
  await expectStatus(privateSchema, [400, 401, 403, 404, 406], 'anonymous private import schema access');
  checks.push(`private import schema not exposed: ${privateSchema.status}`);

  const nonAdminStageRpc = await request(config.baseUrl, config.publishableKey, nonAdminToken, '/rest/v1/rpc/stage_catalog_import', {
    method: 'POST', body: JSON.stringify({ p_batch: {} }),
  });
  await expectStatus(nonAdminStageRpc, [401, 403], 'authenticated non-admin import staging RPC');
  checks.push(`authenticated non-admin staging RPC denied: ${nonAdminStageRpc.status}`);

  for (const [name, body] of [
    ['register_import_sources', { p_sources: [] }],
    ['review_import_source_rights', { p_source_id: '00000000-0000-4000-8000-000000000000', p_decision: {} }],
    ['review_product_image', { p_image_id: '00000000-0000-4000-8000-000000000000', p_decision: { status: 'approved' } }],
    ['attest_import_source_data_rights', { p_source_id: '00000000-0000-4000-8000-000000000000', p_checked_at: new Date().toISOString(), p_note: 'Integration denial probe only.' }],
    ['filter_import_job_category_tags', { p_job_id: '00000000-0000-4000-8000-000000000000' }],
    ['review_and_publish_catalog_import_job_v2', { p_job_id: '00000000-0000-4000-8000-000000000000', p_note: 'Integration denial probe only.' }],
    ['upsert_catalog_import_job', { p_job_id: '00000000-0000-4000-8000-000000000000', p_limit: 1 }],
  ] as const) {
    const response = await request(config.baseUrl, config.publishableKey, nonAdminToken, `/rest/v1/rpc/${name}`, {
      method: 'POST', body: JSON.stringify(body),
    });
    await expectStatus(response, [401, 403], `authenticated non-admin ${name}`);
    checks.push(`authenticated non-admin ${name} denied: ${response.status}`);
  }

  const adminProbe = await request(config.baseUrl, config.publishableKey, adminToken, '/rest/v1/rpc/upsert_catalog_import_job', {
    method: 'POST', body: JSON.stringify({ p_job_id: randomUUID(), p_limit: 1 }),
  });
  await expectStatus(adminProbe, [400], 'owner/editor upsert permission probe');
  let adminError: { code?: unknown; message?: unknown };
  try {
    adminError = await adminProbe.json() as { code?: unknown; message?: unknown };
  } catch {
    return fail('FAIL: owner/editor upsert probe did not return a structured unknown-job error.');
  }
  if (adminError.code !== '22023' || adminError.message !== 'Unknown import job') {
    fail('FAIL: owner/editor permission was not confirmed by the expected read-only unknown-job response.');
  }
  checks.push('owner/editor upsert permission confirmed; random unknown-job probe made no write');

  for (const [name, body, expectedMessage] of [
    ['attest_import_source_data_rights', { p_source_id: randomUUID(), p_checked_at: new Date().toISOString(), p_note: 'Integration permission probe only.' }, 'Unknown import source'],
    ['filter_import_job_category_tags', { p_job_id: randomUUID() }, 'Unknown import job'],
    ['review_and_publish_catalog_import_job_v2', { p_job_id: randomUUID(), p_note: 'Integration permission probe only.' }, 'Unknown import job'],
  ] as const) {
    const response = await request(config.baseUrl, config.publishableKey, adminToken, `/rest/v1/rpc/${name}`, {
      method: 'POST', body: JSON.stringify(body),
    });
    await expectStatus(response, [400], `owner/editor ${name} permission probe`);
    let error: { code?: unknown; message?: unknown };
    try {
      error = await response.json() as { code?: unknown; message?: unknown };
    } catch {
      return fail(`FAIL: owner/editor ${name} probe did not return a structured validation error.`);
    }
    if (error.code !== '22023' || error.message !== expectedMessage) {
      fail(`FAIL: owner/editor ${name} was not confirmed by the read-only validation response.`);
    }
    checks.push(`owner/editor ${name} permission confirmed; unknown identifier probe made no write`);
  }

  process.stdout.write(`${JSON.stringify({ status: 'passed', target: 'development', checks }, null, 2)}\n`);
}

run().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'FAIL: Supabase integration check failed.'}\n`);
  process.exitCode = 1;
});
