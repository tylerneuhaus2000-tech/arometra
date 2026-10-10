import { randomUUID } from 'node:crypto';
import { loadEnvConfig } from '@next/env';
import { hasSafeSupabasePublishableKey } from '../src/lib/supabase/configuration';

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

function getConfiguration(): { baseUrl: string; publishableKey: string; nonAdminToken: string; adminToken: string } {
  const {
    SUPABASE_URL: url,
    SUPABASE_PUBLISHABLE_KEY: key,
    SUPABASE_INTEGRATION_NON_ADMIN_ACCESS_TOKEN: nonAdminToken,
    SUPABASE_INTEGRATION_ADMIN_ACCESS_TOKEN: adminToken,
  } = process.env;
  if (!url || !key || !nonAdminToken || !adminToken || !hasSafeSupabasePublishableKey(key)
    || !jwtIsAuthenticated(nonAdminToken) || !jwtIsAuthenticated(adminToken)) {
    fail('BLOCKED: Supabase URL, safe publishable key, and separate short-lived authenticated non-admin and owner/editor test JWTs are required.');
  }
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
  return { baseUrl: parsed.toString().replace(/\/$/, ''), publishableKey: key, nonAdminToken, adminToken };
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

  for (const [label, token] of [['non-admin', config.nonAdminToken], ['owner/editor', config.adminToken]] as const) {
    const response = await request(config.baseUrl, config.publishableKey, token, '/auth/v1/user');
    await expectStatus(response, [200], `${label} Auth session`);
    checks.push(`${label} Auth session validated: 200`);
  }

  for (const table of ['categories', 'products', 'brands', 'product_variants', 'product_flavor_values', 'tasting_notes', 'community_reviews']) {
    const response = await request(config.baseUrl, config.publishableKey, anonymousBearer, `/rest/v1/${table}?select=id&limit=1`);
    await expectStatus(response, [200], `anonymous ${table} public read`);
    checks.push(`anonymous ${table} read: 200`);
  }

  const publicAdminRead = await request(config.baseUrl, config.publishableKey, anonymousBearer, '/rest/v1/admin_members?select=*&limit=1');
  await expectStatus(publicAdminRead, [401, 403], 'anonymous admin table read');
  checks.push(`anonymous admin_members read denied: ${publicAdminRead.status}`);

  const nonAdminPublicRead = await request(config.baseUrl, config.publishableKey, config.nonAdminToken, '/rest/v1/products?select=id&limit=1');
  await expectStatus(nonAdminPublicRead, [200], 'authenticated non-admin public product read');
  checks.push('authenticated non-admin product read: 200');

  const nonAdminAdminRead = await request(config.baseUrl, config.publishableKey, config.nonAdminToken, '/rest/v1/admin_members?select=*&limit=1');
  await expectStatus(nonAdminAdminRead, [401, 403], 'authenticated non-admin admin table read');
  checks.push(`authenticated non-admin admin_members read denied: ${nonAdminAdminRead.status}`);

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

  const nonAdminStageRpc = await request(config.baseUrl, config.publishableKey, config.nonAdminToken, '/rest/v1/rpc/stage_catalog_import', {
    method: 'POST', body: JSON.stringify({ p_batch: {} }),
  });
  await expectStatus(nonAdminStageRpc, [401, 403], 'authenticated non-admin import staging RPC');
  checks.push(`authenticated non-admin staging RPC denied: ${nonAdminStageRpc.status}`);

  for (const [name, body] of [
    ['register_import_sources', { p_sources: [] }],
    ['review_import_source_rights', { p_source_id: '00000000-0000-4000-8000-000000000000', p_decision: {} }],
    ['upsert_catalog_import_job', { p_job_id: '00000000-0000-4000-8000-000000000000', p_limit: 1 }],
  ] as const) {
    const response = await request(config.baseUrl, config.publishableKey, config.nonAdminToken, `/rest/v1/rpc/${name}`, {
      method: 'POST', body: JSON.stringify(body),
    });
    await expectStatus(response, [401, 403], `authenticated non-admin ${name}`);
    checks.push(`authenticated non-admin ${name} denied: ${response.status}`);
  }

  const adminProbe = await request(config.baseUrl, config.publishableKey, config.adminToken, '/rest/v1/rpc/upsert_catalog_import_job', {
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

  process.stdout.write(`${JSON.stringify({ status: 'passed', target: 'development', checks }, null, 2)}\n`);
}

run().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'FAIL: Supabase integration check failed.'}\n`);
  process.exitCode = 1;
});
