import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildImportReport,
  buildStagePayload,
  createInputDigest,
  isValidGtin,
  normalizeIdentity,
  parseCatalogImport,
  type CatalogImportRecord,
} from '@/lib/import/catalog-import';

const fixturePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/catalog-import.json');

describe('catalog import validation and normalization', () => {
  it('reads explicit test-only JSON and produces an incomplete candidate without inventing missing facts', async () => {
    const input = await readFile(fixturePath, 'utf8');
    const records = parseCatalogImport(input, '.json');
    const report = buildImportReport(records);

    expect(report.totalRows).toBe(1);
    expect(report.counts).toEqual({ complete: 0, incomplete: 1, invalid: 0, duplicate: 0, conflict: 0 });
    expect(report.rows[0].rowNumber).toBe(1);
    expect(report.rows[0].record?.product.abvPercent).toBeNull();
    expect(report.rows[0].record?.variant.gtin).toBeNull();
    expect(report.rows[0].issues.some((issue) => issue.code === 'INCOMPLETE_PROFILE')).toBe(true);
  });

  it('supports quoted CSV fields, a UTF-8 BOM, CRLF, and accurate data row numbers', () => {
    const csv = '\uFEFFsource_name,source_type,source_url,retrieved_at,brand_name,product_name,category_slug,variant_gtin,variant_volume_ml\r\n'
      + '"TEST ONLY, source",operator_entry,https://example.test/record,2026-10-10T10:00:00Z,"TEST ONLY — brand","TEST ONLY — product",whisky,,\r\n';
    const records = parseCatalogImport(csv, '.csv');
    const report = buildImportReport(records, 2);

    expect((records[0] as { source: { name: string } }).source.name).toBe('TEST ONLY, source');
    expect(report.rows[0].rowNumber).toBe(2);
    expect(report.counts.invalid).toBe(0);
  });

  it('rejects ambiguous CSV thousands separators and source URLs with query parameters', () => {
    const csv = 'source_name,source_type,source_url,retrieved_at,brand_name,product_name,category_slug,age_years\n'
      + 'TEST ONLY,operator_entry,https://example.test/source,2026-10-10T10:00:00Z,TEST ONLY brand,TEST ONLY product,whisky,"1,5"\n'
      + 'TEST ONLY,operator_entry,https://example.test/source,2026-10-10T10:00:00Z,TEST ONLY brand,TEST ONLY product,whisky,"1,000"\n'
      + 'TEST ONLY,operator_entry,https://example.test/source?page=2,2026-10-10T10:00:00Z,TEST ONLY brand,TEST ONLY product,whisky,1\n';
    const rows = parseCatalogImport(csv, '.csv');
    const report = buildImportReport(rows, 2);

    expect(report.rows[0].record?.product.ageYears).toBe(1.5);
    expect(report.rows[1].quality).toBe('invalid');
    expect(report.rows[2].quality).toBe('invalid');
  });

  it('does not discard CSV tasting text when the source author type is missing', () => {
    const csv = 'source_name,source_type,source_url,retrieved_at,brand_name,product_name,category_slug,tasting_nose\n'
      + 'TEST ONLY,operator_entry,https://example.test/source,2026-10-10T10:00:00Z,TEST ONLY brand,TEST ONLY product,whisky,"TEST ONLY note"\n';
    const report = buildImportReport(parseCatalogImport(csv, '.csv'), 2);
    expect(report.counts.invalid).toBe(1);
    expect(report.rows[0].issues.some((issue) => issue.message.includes('tastingNotes.authorType'))).toBe(true);
  });

  it('rejects duplicate CSV headers and unsupported file types', () => {
    expect(() => parseCatalogImport('source_name,source_name\nA,B', '.csv')).toThrow('CSV_HEADER_MISSING_OR_DUPLICATE');
    expect(() => parseCatalogImport('[]', '.xml')).toThrow('UNSUPPORTED_IMPORT_FORMAT');
  });

  it('reads JSON record envelopes and JSON Lines', () => {
    const envelope = '{"records":[{"source":"TEST ONLY"}]}';
    const jsonl = '{"source":"TEST ONLY 1"}\n{"source":"TEST ONLY 2"}\n';
    expect(parseCatalogImport(envelope, '.json')).toHaveLength(1);
    expect(parseCatalogImport(jsonl, '.jsonl')).toHaveLength(2);
    expect(() => parseCatalogImport('{bad}', '.jsonl')).toThrow('JSONL_INVALID_LINE:1');
  });

  it('keeps JSON Lines source row numbers when blank lines are present', () => {
    const input = '{"unknown":"TEST ONLY"}\n\n{"unknown":"TEST ONLY"}\n';
    const report = buildImportReport(parseCatalogImport(input, '.jsonl'));
    expect(report.rows.map((row) => row.rowNumber)).toEqual([1, 3]);
  });

  it('normalizes apostrophes and diacritics for identity matching without changing display values', () => {
    expect(normalizeIdentity('  TÉSTERS’  Highland   Cream ')).toBe('testers highland cream');
  });

  it('checks GTIN check digits and rejects malformed or incorrect values', () => {
    // Verified manufacturer GTIN used only as a checksum vector; it is not imported or seeded.
    // Source: https://products.suntory.co.jp/d/5010093501815/
    expect(isValidGtin('5010093501815')).toBe(true);
    expect(isValidGtin('12-34')).toBe(false);
  });

  it('detects idempotent duplicates, preserves distinct bottle variants, and flags source conflicts', async () => {
    const fixture = JSON.parse(await readFile(fixturePath, 'utf8')) as CatalogImportRecord[];
    const same = structuredClone(fixture[0]);
    const secondVariant = structuredClone(fixture[0]);
    secondVariant.variant.volumeMl = 700;
    const conflict = structuredClone(fixture[0]);
    conflict.product.name = 'TEST ONLY — conflicting product';

    const report = buildImportReport([fixture[0], same, secondVariant, conflict]);
    expect(report.counts.duplicate).toBe(1);
    expect(report.counts.incomplete).toBe(1);
    expect(report.counts.conflict).toBe(2);
    expect(report.rows[1].duplicateOf).toBe(1);
    expect(report.rows[0].recordKey).not.toBe(report.rows[2].recordKey);
    expect(report.rows[0].recordKey).toBe(report.rows[3].recordKey);
  });

  it('blocks malformed GTINs and unreviewed community data before staging', async () => {
    const fixture = JSON.parse(await readFile(fixturePath, 'utf8')) as CatalogImportRecord[];
    const invalidGtin = structuredClone(fixture[0]);
    invalidGtin.variant.gtin = '0000000000001';
    const community = structuredClone(fixture[0]);
    community.flavors = [{ code: 'smoky', value: 4, method: 'community_aggregated' }];
    const report = buildImportReport([invalidGtin, community]);

    expect(report.counts.invalid).toBe(2);
    expect(report.rows[0].issues.map((issue) => issue.code)).toContain('INVALID_GTIN_CHECK_DIGIT');
    expect(report.rows[1].issues.map((issue) => issue.code)).toContain('COMMUNITY_REVIEW_PIPELINE_REQUIRED');
    expect(() => buildStagePayload(report, createInputDigest('test-only'))).toThrow('STAGE_BLOCKED_BY_VALIDATION_ERRORS');
  });

  it('does not include duplicate batch rows in the staged payload', async () => {
    const fixture = JSON.parse(await readFile(fixturePath, 'utf8')) as unknown[];
    const report = buildImportReport([fixture[0], fixture[0]]);
    const payload = buildStagePayload(report, createInputDigest('test-only'));

    expect((payload.records as unknown[])).toHaveLength(1);
    expect(payload.inputDigest).toMatch(/^[a-f0-9]{64}$/);
  });
});
