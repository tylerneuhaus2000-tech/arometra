import { createHash } from 'node:crypto';
import { z } from 'zod';

export const IMPORT_NORMALIZER_VERSION = 'arometra-import-v1';
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5_000;

const httpsUrl = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password;
}, 'HTTPS_URL_REQUIRED').transform((value) => new URL(value).toString());
const sourceUrl = httpsUrl.refine((value) => {
  const url = new URL(value);
  return !url.search && !url.hash;
}, 'SOURCE_URL_MUST_NOT_CONTAIN_QUERY_OR_FRAGMENT');
const shortText = (max: number) => z.string().trim().min(1).max(max);
const nullableText = (max: number) => z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? null : value,
  z.string().trim().max(max).nullable().optional(),
);
const numericValue = z.number().finite();

const sourceSchema = z.object({
  name: shortText(200),
  type: z.enum(['official_manufacturer', 'licensed_database', 'open_dataset', 'editorial', 'authorized_review', 'operator_entry']),
  url: sourceUrl,
  termsUrl: sourceUrl.nullable().optional(),
  licenseId: nullableText(200),
  attribution: nullableText(1000),
});

const productImageSchema = z.object({
  url: httpsUrl.refine((value) => !new URL(value).hash, 'IMAGE_URL_FRAGMENT_NOT_ALLOWED'),
  altText: shortText(500),
  attribution: nullableText(1000),
  source: sourceSchema,
}).strict();

const productSchema = z.object({
  name: shortText(240),
  categorySlug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  family: nullableText(120),
  originCountryCode: nullableText(2),
  originRegion: nullableText(160),
  ageYears: numericValue.nonnegative().nullable().optional(),
  abvPercent: numericValue.min(0).max(100).nullable().optional(),
  image: productImageSchema.optional(),
});

const variantSchema = z.object({
  gtin: nullableText(32),
  volumeMl: numericValue.int().positive().max(10_000).nullable().optional(),
  marketCountryCode: nullableText(2),
  abvPercentOverride: numericValue.min(0).max(100).nullable().optional(),
  editionLabel: nullableText(200),
  variantCode: nullableText(120),
});

const flavorSchema = z.object({
  code: z.string().trim().regex(/^[a-z][a-z0-9_]*$/),
  value: numericValue.min(0).max(10),
  method: z.enum(['expert', 'editorial', 'manufacturer', 'community_aggregated']),
});

const tastingNotesSchema = z.object({
  authorType: z.enum(['manufacturer', 'expert', 'editorial']),
  authorLabel: nullableText(160),
  nose: nullableText(5_000),
  palate: nullableText(5_000),
  mouthfeel: nullableText(5_000),
  finish: nullableText(5_000),
  overall: nullableText(5_000),
  language: z.string().trim().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).optional(),
  tastedAt: z.string().date().nullable().optional(),
}).refine((value) => Boolean(value.nose || value.palate || value.finish || value.overall), 'TASTING_NOTE_EMPTY');

const sensoryDescriptorSchema = z.object({
  tagCode: z.string().trim().regex(/^[a-z][a-z0-9_]*$/),
  stage: z.enum(['unspecified', 'nose', 'palate', 'finish']).default('unspecified'),
}).strict();

export const importRecordSchema = z.object({
  sourceRecordId: z.string().trim().min(1).max(240).nullable().optional(),
  source: sourceSchema,
  retrievedAt: z.string().datetime({ offset: true }),
  brand: z.object({
    name: shortText(200),
    countryCode: nullableText(2),
  }),
  product: productSchema,
  variant: variantSchema.optional().default({}),
  flavors: z.array(flavorSchema).max(24).optional().default([]),
  sensoryDescriptors: z.array(sensoryDescriptorSchema).max(48).optional().default([]),
  tastingNotes: tastingNotesSchema.optional(),
}).strict();

export type CatalogImportRecord = z.infer<typeof importRecordSchema>;
type CatalogImportRows = unknown[] & { sourceRowNumbers?: number[] };

export type ImportIssue = {
  code: string;
  message: string;
  severity: 'error' | 'warning';
};

export type ImportRowResult = {
  rowNumber: number;
  recordKey: string | null;
  record: CatalogImportRecord | null;
  quality: 'complete' | 'incomplete' | 'invalid' | 'duplicate' | 'conflict';
  duplicateOf: number | null;
  issues: ImportIssue[];
};

export type ImportReport = {
  normalizerVersion: string;
  dryRun: true;
  totalRows: number;
  counts: {
    complete: number;
    incomplete: number;
    invalid: number;
    duplicate: number;
    conflict: number;
  };
  rows: ImportRowResult[];
};

const csvColumns = [
  'source_record_id', 'source_name', 'source_type', 'source_url', 'source_terms_url', 'source_license_id',
  'source_attribution', 'retrieved_at', 'brand_name', 'brand_country_code', 'product_name', 'category_slug',
  'product_family', 'origin_country_code', 'origin_region', 'age_years', 'abv_percent', 'variant_gtin',
  'variant_volume_ml', 'variant_market_country_code', 'variant_abv_percent_override', 'variant_edition_label',
  'variant_code', 'flavors_json', 'tasting_author_type', 'tasting_author_label', 'tasting_nose', 'tasting_palate',
  'tasting_mouthfeel', 'tasting_finish', 'tasting_overall', 'tasting_language', 'tasting_date',
  'product_image_url', 'product_image_alt_text', 'product_image_attribution', 'product_image_source_name',
  'product_image_source_type', 'product_image_source_url', 'product_image_source_terms_url',
  'product_image_source_license_id', 'product_image_source_attribution',
] as const;

function parseCsvRows(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let justClosedQuote = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
        justClosedQuote = true;
      } else {
        field += char;
      }
      continue;
    }

    if (justClosedQuote && char !== ',' && char !== '\r' && char !== '\n' && char !== ' ' && char !== '\t') {
      throw new Error(`CSV_UNEXPECTED_CHARACTER at character ${index + 1}`);
    }
    if (char === '"') {
      if (field.length > 0 && field.trim().length > 0) throw new Error(`CSV_UNEXPECTED_QUOTE at character ${index + 1}`);
      field = '';
      quoted = true;
      justClosedQuote = false;
    } else if (char === ',') {
      row.push(field.trim());
      field = '';
      justClosedQuote = false;
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = '';
      justClosedQuote = false;
    } else if (!justClosedQuote) {
      field += char;
    }
  }

  if (quoted) throw new Error('CSV_UNTERMINATED_QUOTE');
  row.push(field.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function csvNumber(value: string | undefined): number | null | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const trimmed = value.trim();
  if ((trimmed.includes(',') && trimmed.includes('.')) || (trimmed.match(/,/g) ?? []).length > 1) return Number.NaN;
  if (/,[0-9]{3}$/.test(trimmed)) return Number.NaN;
  if (!/^-?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(trimmed)) return Number.NaN;
  const normalized = trimmed.replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : Number.NaN;
}

function csvOptional(value: string | undefined): string | null | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  return value.trim();
}

function csvRecord(headers: string[], values: string[]): unknown {
  const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  let flavors: unknown = [];
  if (record.flavors_json) {
    try {
      flavors = JSON.parse(record.flavors_json);
    } catch {
      flavors = null;
    }
  }
  const authorType = csvOptional(record.tasting_author_type);
  const hasTastingContent = ['tasting_author_label', 'tasting_nose', 'tasting_palate', 'tasting_mouthfeel', 'tasting_finish', 'tasting_overall']
    .some((column) => Boolean(csvOptional(record[column as keyof typeof record])));
  const tastingNotes = authorType || hasTastingContent
    ? {
        authorType,
        authorLabel: csvOptional(record.tasting_author_label),
        nose: csvOptional(record.tasting_nose),
        palate: csvOptional(record.tasting_palate),
        mouthfeel: csvOptional(record.tasting_mouthfeel),
        finish: csvOptional(record.tasting_finish),
        overall: csvOptional(record.tasting_overall),
        language: csvOptional(record.tasting_language),
        tastedAt: csvOptional(record.tasting_date),
      }
    : undefined;
  const hasProductImage = [
    'product_image_url', 'product_image_alt_text', 'product_image_attribution', 'product_image_source_name',
    'product_image_source_type', 'product_image_source_url', 'product_image_source_terms_url',
    'product_image_source_license_id', 'product_image_source_attribution',
  ].some((column) => Boolean(csvOptional(record[column as keyof typeof record])));
  const image = hasProductImage ? {
    url: csvOptional(record.product_image_url),
    altText: csvOptional(record.product_image_alt_text),
    attribution: csvOptional(record.product_image_attribution),
    source: {
      name: csvOptional(record.product_image_source_name),
      type: csvOptional(record.product_image_source_type),
      url: csvOptional(record.product_image_source_url),
      termsUrl: csvOptional(record.product_image_source_terms_url),
      licenseId: csvOptional(record.product_image_source_license_id),
      attribution: csvOptional(record.product_image_source_attribution),
    },
  } : undefined;

  return {
    sourceRecordId: csvOptional(record.source_record_id),
    source: {
      name: record.source_name,
      type: record.source_type,
      url: record.source_url,
      termsUrl: csvOptional(record.source_terms_url),
      licenseId: csvOptional(record.source_license_id),
      attribution: csvOptional(record.source_attribution),
    },
    retrievedAt: record.retrieved_at,
    brand: { name: record.brand_name, countryCode: csvOptional(record.brand_country_code) },
    product: {
      name: record.product_name,
      categorySlug: record.category_slug,
      family: csvOptional(record.product_family),
      originCountryCode: csvOptional(record.origin_country_code),
      originRegion: csvOptional(record.origin_region),
      ageYears: csvNumber(record.age_years),
      abvPercent: csvNumber(record.abv_percent),
      image,
    },
    variant: {
      gtin: csvOptional(record.variant_gtin),
      volumeMl: csvNumber(record.variant_volume_ml),
      marketCountryCode: csvOptional(record.variant_market_country_code),
      abvPercentOverride: csvNumber(record.variant_abv_percent_override),
      editionLabel: csvOptional(record.variant_edition_label),
      variantCode: csvOptional(record.variant_code),
    },
    flavors,
    tastingNotes,
  };
}

export function parseCatalogImport(input: string, extension: string): unknown[] {
  if (Buffer.byteLength(input, 'utf8') > MAX_IMPORT_BYTES) throw new Error('IMPORT_FILE_TOO_LARGE');
  let values: unknown[];
  if (extension.toLowerCase() === '.csv') {
    const rows = parseCsvRows(input);
    const headers = (rows.shift() ?? []).map((value) => value.trim().toLowerCase());
    if (headers.length === 0 || new Set(headers).size !== headers.length) throw new Error('CSV_HEADER_MISSING_OR_DUPLICATE');
    if (headers.some((header) => !csvColumns.includes(header as (typeof csvColumns)[number]))) throw new Error('CSV_UNKNOWN_COLUMN');
    const missing = ['source_name', 'source_type', 'source_url', 'retrieved_at', 'brand_name', 'product_name', 'category_slug']
      .filter((column) => !headers.includes(column));
    if (missing.length) throw new Error(`CSV_REQUIRED_COLUMNS_MISSING:${missing.join(',')}`);
    values = rows.map((row) => {
      if (row.length !== headers.length) throw new Error('CSV_COLUMN_COUNT_MISMATCH');
      return csvRecord(headers, row);
    });
  } else if (extension.toLowerCase() === '.json') {
    const parsed: unknown = JSON.parse(input);
    values = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as { records?: unknown }).records)
        ? (parsed as { records: unknown[] }).records
        : (() => { throw new Error('JSON_EXPECTED_ARRAY_OR_RECORDS'); })();
  } else if (extension.toLowerCase() === '.jsonl' || extension.toLowerCase() === '.ndjson') {
    const lineNumbers: number[] = [];
    values = input.split(/\r?\n/).flatMap((line, index) => {
      if (line.trim().length === 0) return [];
      try {
        lineNumbers.push(index + 1);
        return [JSON.parse(line) as unknown];
      } catch {
        lineNumbers.pop();
        throw new Error(`JSONL_INVALID_LINE:${index + 1}`);
      }
    });
    Object.defineProperty(values, 'sourceRowNumbers', { value: lineNumbers });
  } else {
    throw new Error('UNSUPPORTED_IMPORT_FORMAT');
  }
  if (values.length > MAX_IMPORT_ROWS) throw new Error('IMPORT_ROW_LIMIT_EXCEEDED');
  return values;
}

function cleanText(value: string): string {
  return value.normalize('NFKC').replace(/[\u2018\u2019\u02bc]/g, "'").replace(/\s+/g, ' ').trim();
}

export function normalizeIdentity(value: string): string {
  return cleanText(value)
    .toLocaleLowerCase('und')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function isValidGtin(value: string): boolean {
  const digits = value.replace(/[\s-]/g, '');
  if (!/^(?:\d{8}|\d{12,14})$/.test(digits)) return false;
  const body = digits.slice(0, -1);
  let sum = 0;
  for (let index = body.length - 1, offset = 0; index >= 0; index -= 1, offset += 1) {
    sum += Number(body[index]) * (offset % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === Number(digits.at(-1));
}

function normalizedRecordValue(record: CatalogImportRecord): Record<string, unknown> {
  const brandName = cleanText(record.brand.name);
  const productName = cleanText(record.product.name);
  const gtin = record.variant.gtin ? record.variant.gtin.replace(/[\s-]/g, '') : null;
  return {
    brand: { name: brandName, normalizedName: normalizeIdentity(brandName), countryCode: record.brand.countryCode?.toUpperCase() ?? null },
    product: {
      name: productName,
      normalizedName: normalizeIdentity(productName),
      categorySlug: record.product.categorySlug.toLowerCase(),
      family: record.product.family ? cleanText(record.product.family) : null,
      originCountryCode: record.product.originCountryCode?.toUpperCase() ?? null,
      originRegion: record.product.originRegion ? cleanText(record.product.originRegion) : null,
      ageYears: record.product.ageYears ?? null,
      abvPercent: record.product.abvPercent ?? null,
      image: record.product.image ? {
        url: record.product.image.url,
        altText: cleanText(record.product.image.altText),
        attribution: record.product.image.attribution ? cleanText(record.product.image.attribution) : null,
        source: {
          name: cleanText(record.product.image.source.name),
          type: record.product.image.source.type,
          url: new URL(record.product.image.source.url).toString(),
          termsUrl: record.product.image.source.termsUrl ?? null,
          licenseId: record.product.image.source.licenseId ?? null,
          attribution: record.product.image.source.attribution ? cleanText(record.product.image.source.attribution) : null,
        },
      } : null,
    },
    variant: {
      gtin,
      volumeMl: record.variant.volumeMl ?? null,
      marketCountryCode: record.variant.marketCountryCode?.toUpperCase() ?? null,
      abvPercentOverride: record.variant.abvPercentOverride ?? null,
      editionLabel: record.variant.editionLabel ? cleanText(record.variant.editionLabel) : null,
      variantCode: record.variant.variantCode ? cleanText(record.variant.variantCode) : null,
    },
    flavors: record.flavors.map((flavor) => ({ code: flavor.code.toLowerCase(), value: flavor.value, method: flavor.method })),
    sensoryDescriptors: record.sensoryDescriptors.map((descriptor) => ({
      tagCode: descriptor.tagCode.toLowerCase(), stage: descriptor.stage,
    })),
    tastingNotes: record.tastingNotes
      ? {
          authorType: record.tastingNotes.authorType,
          authorLabel: record.tastingNotes.authorLabel ? cleanText(record.tastingNotes.authorLabel) : null,
          nose: record.tastingNotes.nose ? cleanText(record.tastingNotes.nose) : null,
          palate: record.tastingNotes.palate ? cleanText(record.tastingNotes.palate) : null,
          mouthfeel: record.tastingNotes.mouthfeel ? cleanText(record.tastingNotes.mouthfeel) : null,
          finish: record.tastingNotes.finish ? cleanText(record.tastingNotes.finish) : null,
          overall: record.tastingNotes.overall ? cleanText(record.tastingNotes.overall) : null,
          language: record.tastingNotes.language ?? 'de',
          tastedAt: record.tastingNotes.tastedAt ?? null,
        }
      : null,
  };
}

function recordIdentity(record: CatalogImportRecord, data: Record<string, unknown>): string {
  const product = data.product as { normalizedName: string; family: string | null };
  const variant = data.variant as { gtin: string | null; volumeMl: number | null; marketCountryCode: string | null; abvPercentOverride: number | null; editionLabel: string | null; variantCode: string | null };
  const variantIdentity = [
    variant.gtin ?? '',
    variant.volumeMl ?? '',
    variant.marketCountryCode ?? '',
    variant.abvPercentOverride ?? '',
    normalizeIdentity(variant.editionLabel ?? ''),
    normalizeIdentity(variant.variantCode ?? ''),
  ].join('|');
  const base = record.sourceRecordId
    ? `external:${normalizeIdentity(record.sourceRecordId)}|${variantIdentity}`
    : [
        normalizeIdentity(record.brand.name),
        product.normalizedName,
        variantIdentity,
      ].join('|');
  const canonicalSource = new URL(record.source.url);
  return createHash('sha256').update(`${canonicalSource.origin}${canonicalSource.pathname}|${base}`).digest('hex');
}

export function buildImportReport(values: unknown[], firstRowNumber = 1): ImportReport {
  if (values.length > MAX_IMPORT_ROWS) throw new Error('IMPORT_ROW_LIMIT_EXCEEDED');
  const sourceRowNumbers = (values as CatalogImportRows).sourceRowNumbers;
  const rows: ImportRowResult[] = values.map((value, index) => {
    const rowNumber = sourceRowNumbers?.[index] ?? index + firstRowNumber;
    const parsed = importRecordSchema.safeParse(value);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => ({
        code: `INVALID_${String(issue.path[0] ?? 'RECORD').toUpperCase()}`,
        message: `${issue.path.join('.') || 'record'}: ${issue.message}`,
        severity: 'error' as const,
      }));
      return { rowNumber, recordKey: null, record: null, quality: 'invalid', duplicateOf: null, issues };
    }

    const record = parsed.data;
    const issues: ImportIssue[] = [];
    if (record.brand.countryCode && !/^[A-Z]{2}$/i.test(record.brand.countryCode)) {
      issues.push({ code: 'INVALID_BRAND_COUNTRY_CODE', message: 'brand.countryCode muss aus zwei Buchstaben bestehen.', severity: 'error' });
    }
    for (const [field, value] of [['product.originCountryCode', record.product.originCountryCode], ['variant.marketCountryCode', record.variant.marketCountryCode]] as const) {
      if (value && !/^[A-Z]{2}$/i.test(value)) issues.push({ code: 'INVALID_COUNTRY_CODE', message: `${field} muss aus zwei Buchstaben bestehen.`, severity: 'error' });
    }
    if (record.variant.gtin && !isValidGtin(record.variant.gtin)) {
      issues.push({ code: 'INVALID_GTIN_CHECK_DIGIT', message: 'GTIN/EAN hat ein ungültiges Format oder Prüfziffer.', severity: 'error' });
    }
    if (record.tastingNotes) issues.push({ code: 'TEXT_RIGHTS_REQUIRE_SEPARATE_REVIEW', message: 'Verkostungstexte werden nur bei separat geprüfter Textlizenz gestaged.', severity: 'warning' });
    if (record.flavors.some((flavor) => flavor.method === 'community_aggregated')) {
      issues.push({ code: 'COMMUNITY_REVIEW_PIPELINE_REQUIRED', message: 'Community-Daten benötigen die separate Einwilligungs- und Reviewpipeline.', severity: 'error' });
    }

    const data = normalizedRecordValue(record);
    const missing: string[] = [];
    if (!record.product.originCountryCode) missing.push('product.originCountryCode');
    if (record.product.abvPercent == null && record.variant.abvPercentOverride == null) missing.push('abvPercent');
    if (record.variant.volumeMl == null) missing.push('variant.volumeMl');
    if (record.flavors.length === 0 && record.sensoryDescriptors.length === 0 && !record.tastingNotes) missing.push('sensoryData');
    if (missing.length) issues.push({ code: 'INCOMPLETE_PROFILE', message: `Nicht belegt: ${missing.join(', ')}.`, severity: 'warning' });

    const quality = issues.some((issue) => issue.severity === 'error') ? 'invalid' : missing.length ? 'incomplete' : 'complete';
    return {
      rowNumber,
      recordKey: recordIdentity(record, data),
      record: { ...record, brand: { ...record.brand, name: cleanText(record.brand.name), countryCode: record.brand.countryCode?.toUpperCase() ?? null }, product: { ...record.product, name: cleanText(record.product.name), categorySlug: record.product.categorySlug.toLowerCase(), originCountryCode: record.product.originCountryCode?.toUpperCase() ?? null }, variant: { ...record.variant, gtin: record.variant.gtin?.replace(/[\s-]/g, '') ?? null, marketCountryCode: record.variant.marketCountryCode?.toUpperCase() ?? null } },
      quality,
      duplicateOf: null,
      issues,
    };
  });

  const identityToFirst = new Map<string, ImportRowResult>();
  const gtinToFirst = new Map<string, ImportRowResult>();
  for (const row of rows) {
    if (!row.record || !row.recordKey || row.quality === 'invalid') continue;
    const previous = identityToFirst.get(row.recordKey);
    if (previous) {
      const sameContent = JSON.stringify(normalizedRecordValue(row.record)) === JSON.stringify(normalizedRecordValue(previous.record as CatalogImportRecord));
      row.quality = sameContent ? 'duplicate' : 'conflict';
      row.duplicateOf = previous.rowNumber;
      previous.quality = sameContent ? previous.quality : 'conflict';
      if (!sameContent) previous.issues.push({ code: 'SOURCE_IDENTITY_CONFLICT', message: `Zeile ${row.rowNumber} hat dieselbe Quellidentität mit abweichenden Fakten.`, severity: 'error' });
      row.issues.push({
        code: sameContent ? 'DUPLICATE_IN_BATCH' : 'SOURCE_IDENTITY_CONFLICT',
        message: sameContent ? `Identischer Datensatz bereits in Zeile ${previous.rowNumber}.` : `Quellidentität kollidiert mit Zeile ${previous.rowNumber}.`,
        severity: sameContent ? 'warning' : 'error',
      });
    } else {
      identityToFirst.set(row.recordKey, row);
    }

    const gtin = row.record.variant.gtin;
    if (gtin) {
      const priorGtin = gtinToFirst.get(gtin);
      if (priorGtin && priorGtin.recordKey !== row.recordKey) {
        priorGtin.quality = 'conflict';
        row.quality = 'conflict';
        priorGtin.issues.push({ code: 'GTIN_COLLISION', message: `GTIN bereits in Zeile ${row.rowNumber} mit anderer Produktidentität verwendet.`, severity: 'error' });
        row.issues.push({ code: 'GTIN_COLLISION', message: `GTIN kollidiert mit abweichender Produktidentität in Zeile ${priorGtin.rowNumber}.`, severity: 'error' });
      } else if (!priorGtin) {
        gtinToFirst.set(gtin, row);
      }
    }
  }

  return {
    normalizerVersion: IMPORT_NORMALIZER_VERSION,
    dryRun: true,
    totalRows: rows.length,
    counts: {
      complete: rows.filter((row) => row.quality === 'complete').length,
      incomplete: rows.filter((row) => row.quality === 'incomplete').length,
      invalid: rows.filter((row) => row.quality === 'invalid').length,
      duplicate: rows.filter((row) => row.quality === 'duplicate').length,
      conflict: rows.filter((row) => row.quality === 'conflict').length,
    },
    rows,
  };
}

export function buildStagePayload(report: ImportReport, inputDigest: string): Record<string, unknown> {
  if (report.counts.invalid > 0 || report.counts.conflict > 0) throw new Error('STAGE_BLOCKED_BY_VALIDATION_ERRORS');
  const rows = report.rows.filter((row) => row.record && row.recordKey && row.quality !== 'duplicate');
  return {
    inputDigest,
    normalizerVersion: report.normalizerVersion,
    records: rows.map((row) => ({
      rowNumber: row.rowNumber,
      recordKey: row.recordKey,
      quality: row.quality,
      retrievedAt: row.record?.retrievedAt,
      source: row.record?.source,
      sourceRecordId: row.record?.sourceRecordId ?? null,
      normalizedRecord: row.record ? normalizedRecordValue(row.record) : null,
      issues: row.issues.map((issue) => ({ code: issue.code, severity: issue.severity })),
    })),
  };
}

export function createInputDigest(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
