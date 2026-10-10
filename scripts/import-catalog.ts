import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import {
  buildImportReport,
  buildStagePayload,
  createInputDigest,
  MAX_IMPORT_BYTES,
  parseCatalogImport,
  type CatalogImportRecord,
  type ImportReport,
} from '../src/lib/import/catalog-import';
import { hasSafeSupabasePublishableKey } from '../src/lib/supabase/configuration';

const envLog = { info: () => undefined, error: () => undefined };
loadEnvConfig(process.cwd(), true, envLog, true);

type JsonRecord = Record<string, unknown>;

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function flag(args: string[], name: string): boolean {
  return args.includes(name);
}

function printSafeReport(report: ImportReport): void {
  process.stdout.write(`${JSON.stringify({
    normalizerVersion: report.normalizerVersion,
    dryRun: report.dryRun,
    totalRows: report.totalRows,
    counts: report.counts,
    rows: report.rows.map(({ rowNumber, quality, duplicateOf, issues }) => ({ rowNumber, quality, duplicateOf, issues })),
  }, null, 2)}\n`);
}

function parseAccessToken(token: string): boolean {
  const segments = token.split('.');
  if (segments.length !== 3) return false;
  try {
    const claims = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8')) as {
      sub?: unknown;
      role?: unknown;
      exp?: unknown;
    };
    return typeof claims.sub === 'string'
      && claims.sub.length > 0
      && claims.role === 'authenticated'
      && typeof claims.exp === 'number'
      && claims.exp > Math.floor(Date.now() / 1000) + 30;
  } catch {
    return false;
  }
}

function getImportConnection(): { endpoint: string; key: string; accessToken: string } {
  const urlValue = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  const accessToken = process.env.SUPABASE_IMPORT_ACCESS_TOKEN;
  const target = process.env.AROMETRA_SUPABASE_TARGET;
  if (!urlValue || !key || !accessToken || !hasSafeSupabasePublishableKey(key) || !parseAccessToken(accessToken)) {
    throw new Error('IMPORT_AUTH_CONFIGURATION_INVALID');
  }

  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    throw new Error('SUPABASE_URL_INVALID');
  }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('SUPABASE_URL_INVALID');

  if (target === 'development') {
    const projectRef = process.env.AROMETRA_DEVELOPMENT_PROJECT_REF;
    if (!projectRef || !/^[a-z0-9]{20}$/.test(projectRef) || url.protocol !== 'https:' || url.hostname !== `${projectRef}.supabase.co`) {
      throw new Error('DEVELOPMENT_PROJECT_ALLOWLIST_MISMATCH');
    }
  } else if (target === 'local') {
    const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (!isLoopback || url.protocol !== 'http:') throw new Error('LOCAL_TARGET_MUST_USE_LOOPBACK_HTTP');
  } else {
    throw new Error('IMPORT_TARGET_MUST_BE_EXPLICITLY_LOCAL_OR_DEVELOPMENT');
  }

  return {
    endpoint: `${url.toString().replace(/\/$/, '')}/rest/v1/rpc`,
    key,
    accessToken,
  };
}

async function callRpc(name: string, args: JsonRecord): Promise<unknown> {
  const connection = getImportConnection();
  let response: Response;
  try {
    response = await fetch(`${connection.endpoint}/${name}`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        apikey: connection.key,
        authorization: `Bearer ${connection.accessToken}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error('SUPABASE_RPC_NETWORK_ERROR');
  }
  if (!response.ok) throw new Error(`SUPABASE_RPC_REJECTED_${response.status}`);
  try {
    return await response.json() as unknown;
  } catch {
    throw new Error('SUPABASE_RPC_RESPONSE_INVALID');
  }
}

async function readInput(filePath: string): Promise<{ raw: string; values: unknown[]; report: ImportReport; extension: string }> {
  const resolvedPath = path.resolve(filePath);
  const fileStat = await stat(resolvedPath);
  if (fileStat.size > MAX_IMPORT_BYTES) throw new Error('IMPORT_FILE_TOO_LARGE');
  const raw = await readFile(resolvedPath, 'utf8');
  const extension = path.extname(resolvedPath).toLowerCase();
  const values = parseCatalogImport(raw, extension);
  const report = buildImportReport(values, extension === '.csv' ? 2 : 1);
  return { raw, values, report, extension };
}

function uniqueSources(records: CatalogImportRecord[]): JsonRecord[] {
  const sources = new Map<string, JsonRecord>();
  for (const record of records) {
    sources.set(record.source.url, {
      name: record.source.name,
      type: record.source.type,
      url: record.source.url,
      termsUrl: record.source.termsUrl ?? null,
      licenseId: record.source.licenseId ?? null,
      attribution: record.source.attribution ?? null,
    });
  }
  return [...sources.values()];
}

function validRecords(report: ImportReport): CatalogImportRecord[] {
  return report.rows.flatMap((row) => row.record && row.quality !== 'invalid' && row.quality !== 'conflict' ? [row.record] : []);
}

function printHelp(): void {
  process.stdout.write(`${[
    'AROMETRA catalog import',
    '  npm run import:dry-run -- --file <file.csv|file.json|file.jsonl>',
    '  npm run import:register-sources -- --file <file.csv|file.json|file.jsonl>',
    '  npm run import:stage -- --file <file.csv|file.json|file.jsonl>',
    '  npm run import:upsert -- --job-id <uuid> [--limit 1..5000]  # creates unpublished drafts',
    '  npm run import:review-rights -- --source-id <uuid> [--data approved|unreviewed|blocked] [--text ...] [--image ...]',
    '    Review also accepts --license-id, --terms-url, --terms-checked-at, and --notes.',
    '  Mutating commands require AROMETRA_SUPABASE_TARGET=local or development, a publishable key,',
    '  an authenticated Supabase user JWT, and an active database admin role.',
  ].join('\n')}\n`);
}

async function dryRun(filePath: string): Promise<number> {
  const { report } = await readInput(filePath);
  printSafeReport(report);
  return report.counts.invalid || report.counts.conflict ? 2 : 0;
}

async function registerSources(filePath: string): Promise<number> {
  const { report } = await readInput(filePath);
  printSafeReport(report);
  if (report.counts.invalid || report.counts.conflict) throw new Error('SOURCE_REGISTRATION_BLOCKED_BY_VALIDATION_ERRORS');
  const sources = uniqueSources(validRecords(report));
  if (sources.length === 0) throw new Error('NO_VALID_SOURCE_METADATA');
  const result = await callRpc('register_import_sources', { p_sources: sources });
  process.stdout.write(`${JSON.stringify({ registeredSourceCount: sources.length, result }, null, 2)}\n`);
  return 0;
}

async function stage(filePath: string): Promise<number> {
  const { raw, report } = await readInput(filePath);
  printSafeReport(report);
  if (report.counts.invalid || report.counts.conflict) throw new Error('STAGING_BLOCKED_BY_VALIDATION_ERRORS');
  const batch = buildStagePayload(report, createInputDigest(raw));
  const records = batch.records as JsonRecord[];
  if (records.length === 0) throw new Error('NO_STAGEABLE_ROWS');

  const results: unknown[] = [];
  for (let offset = 0, chunk = 0; offset < records.length; offset += 500, chunk += 1) {
    const digest = createHash('sha256').update(`${batch.inputDigest}:${chunk}`).digest('hex');
    const result = await callRpc('stage_catalog_import', {
      p_batch: { ...batch, inputDigest: digest, records: records.slice(offset, offset + 500) },
    });
    results.push(result);
  }
  process.stdout.write(`${JSON.stringify({ stagedBatchCount: results.length, results }, null, 2)}\n`);
  return 0;
}

async function reviewRights(args: string[]): Promise<number> {
  const sourceId = option(args, '--source-id');
  if (!sourceId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sourceId)) throw new Error('SOURCE_ID_REQUIRED');
  const decision: JsonRecord = {};
  for (const [flagName, property] of [['--data', 'dataRightsStatus'], ['--text', 'textRightsStatus'], ['--image', 'imageRightsStatus']] as const) {
    const value = option(args, flagName);
    if (value !== undefined) {
      if (!['approved', 'unreviewed', 'blocked'].includes(value)) throw new Error(`INVALID_${flagName.slice(2).toUpperCase()}_RIGHTS_STATUS`);
      decision[property] = value;
    }
  }
  for (const [flagName, property] of [['--license-id', 'licenseId'], ['--terms-url', 'termsUrl'], ['--terms-checked-at', 'termsCheckedAt'], ['--notes', 'notes']] as const) {
    const value = option(args, flagName);
    if (value !== undefined) decision[property] = value;
  }
  if (Object.keys(decision).length === 0) throw new Error('RIGHTS_DECISION_REQUIRED');
  const result = await callRpc('review_import_source_rights', { p_source_id: sourceId, p_decision: decision });
  process.stdout.write(`${JSON.stringify({ result }, null, 2)}\n`);
  return 0;
}

async function upsertJob(args: string[]): Promise<number> {
  const jobId = option(args, '--job-id');
  if (!jobId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jobId)) {
    throw new Error('IMPORT_JOB_ID_REQUIRED');
  }
  const limitInput = option(args, '--limit');
  const limit = limitInput === undefined ? 5_000 : Number(limitInput);
  if (!Number.isInteger(limit) || limit < 1 || limit > 5_000) throw new Error('IMPORT_UPSERT_LIMIT_INVALID');
  const result = await callRpc('upsert_catalog_import_job', { p_job_id: jobId, p_limit: limit });
  process.stdout.write(`${JSON.stringify({ result }, null, 2)}\n`);
  return 0;
}

async function main(): Promise<number> {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === 'help' || flag(args, '--help')) {
    printHelp();
    return 0;
  }
  if (command === 'dry-run' || command === 'register-sources' || command === 'stage') {
    const filePath = option(args, '--file');
    if (!filePath) throw new Error('INPUT_FILE_REQUIRED');
    if (command === 'dry-run') return dryRun(filePath);
    if (command === 'register-sources') return registerSources(filePath);
    return stage(filePath);
  }
  if (command === 'review-rights') return reviewRights(args);
  if (command === 'upsert') return upsertJob(args);
  throw new Error('UNKNOWN_IMPORT_COMMAND');
}

main().then((exitCode) => {
  process.exitCode = exitCode;
}).catch((error: unknown) => {
  const code = error instanceof Error ? error.message : 'IMPORT_FAILED';
  process.stderr.write(`Import abgebrochen: ${code}\n`);
  process.exitCode = 1;
});
