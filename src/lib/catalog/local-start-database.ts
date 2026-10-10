import 'server-only';
import { lstat, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import type { CatalogCategory, CatalogProduct, CatalogVariant, ProductImage, ProductSource, TastingNote } from './model';
import { getCategorySensoryDimensions } from './sensory-taxonomy';
import { navigationTaxonomy } from './taxonomy';

type StartProduct = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  style?: string | null;
  country?: string | null;
  region?: string | null;
  age?: number | null;
  abv?: number | null;
  volume_ml?: number | null;
  market_country_code?: string | null;
  source: string;
  summary?: string | null;
  nose?: string | null;
  palate?: string | null;
  finish?: string | null;
  overall?: string | null;
  tags?: string[];
  distillation?: string | null;
  maturation?: string | null;
  verified_on?: string | null;
  source_records?: Array<{
    url: string;
    checked_on: string;
    fields: string[];
    attribution?: string | null;
  }>;
  image?: {
    filename?: string;
    alt_text?: string;
    source_name?: string;
    source_url?: string;
    source_page_url?: string;
    rights_status?: string;
  } | null;
};

type StartCatalog = { products?: unknown };

const categoryMap: Record<string, string> = {
  'whisky-single-malt': 'whisky-scotch',
  'whisky-blended': 'whisky-scotch',
  'whisky-irish': 'whisky-irish',
  'whisky-tennessee': 'whisky-american',
  'rum-white': 'rum-white',
  'rum-aged': 'rum-aged',
  'gin-london-dry': 'gin-london-dry',
  vodka: 'wodka',
  'tequila-blanco': 'tequila-blanco',
  'cognac-vsop': 'cognac',
  'liqueur-cream': 'likoere-cream',
};

const countryCodes: Record<string, string> = {
  Frankreich: 'FR',
  Irland: 'IE',
  Mexiko: 'MX',
  Schottland: 'GB',
  Schweden: 'SE',
  USA: 'US',
  Venezuela: 'VE',
  'Vereinigtes Königreich': 'GB',
};

const flavorLabels: Record<string, string> = {
  rauchig: 'Rauchig', torfig: 'Torfig', malzig: 'Malzig', fruchtig: 'Fruchtig', honig: 'Honig',
  maritim: 'Maritim', zitrus: 'Zitrus', salzig: 'Salzig', suess: 'Süß', birne: 'Birne',
  holzig: 'Holzig', vanille: 'Vanille', karamell: 'Karamell', floral: 'Floral', wuerzig: 'Würzig',
  nussig: 'Nussig', lakritz: 'Lakritz', wacholder: 'Wacholder', agave: 'Agave',
  schokolade: 'Schokolade', cremig: 'Cremig', getreidig: 'Getreidig', trockenfrucht: 'Trockenfrucht',
};

function slugify(value: string): string {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function isStartProduct(value: unknown): value is StartProduct {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<StartProduct>;
  return typeof row.slug === 'string' && typeof row.name === 'string'
    && typeof row.brand === 'string' && typeof row.category === 'string' && typeof row.source === 'string';
}

function mapProduct(row: StartProduct): CatalogProduct {
  const categorySlug = categoryMap[row.category];
  const category = navigationTaxonomy.find((item) => item.slug === categorySlug);
  const sourceUrl = new URL(row.source);
  if (!category || sourceUrl.protocol !== 'https:') throw new Error('local_catalog_record_invalid');

  const fields: Array<[string, unknown]> = [
    ['name', row.name], ['brand', row.brand], ['category', row.category], ['style', row.style],
    ['origin_country_code', row.country], ['origin_region', row.region], ['age_years', row.age],
    ['abv_percent', row.abv], ['volume_ml', row.volume_ml], ['nose', row.nose],
    ['palate', row.palate], ['finish', row.finish], ['distillation_details', row.distillation],
    ['maturation_details', row.maturation], ['qualitative_flavors', row.tags?.length ? 'present' : null],
  ];
  const sourceRecords = row.source_records?.length ? row.source_records : [{
    url: sourceUrl.toString(),
    checked_on: row.verified_on ?? '',
    fields: fields.flatMap(([fieldPath, value]) => value === null || value === undefined || value === ''
      ? [] : [String(fieldPath)]),
  }];
  const sources: ProductSource[] = sourceRecords.map((record, index) => {
    const url = new URL(record.url);
    if (url.protocol !== 'https:' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(record.checked_on)) {
      throw new Error('local_catalog_source_invalid');
    }
    return {
      id: `local-source-${row.slug}-${index}`,
      name: url.hostname,
      url: url.toString(),
      attribution: record.attribution ?? null,
      fields: record.fields.map((fieldPath) => ({ path: fieldPath, verifiedAt: record.checked_on })),
    };
  });
  const source = sources.find((record) => record.url === sourceUrl.toString()) ?? sources[0];
  if (!source) throw new Error('local_catalog_source_missing');

  const variants: CatalogVariant[] = row.abv != null || row.volume_ml != null
    ? [{
        id: `local-variant-${row.slug}`,
        gtin: null,
        volumeMl: row.volume_ml ?? null,
        marketCountryCode: row.market_country_code ?? null,
        abvPercentOverride: null,
        editionLabel: null,
        sources: sources.filter((record) => record.fields.some((field) => field.path === 'volume_ml'
          || field.path === 'abv_percent' || field.path === 'variant:volume_ml' || field.path === 'variant:abv_percent_override')),
      }]
    : [];

  const note: TastingNote | null = [row.nose, row.palate, row.finish, row.overall].some(Boolean)
    ? {
        id: `local-note-${row.slug}`,
        authorLabel: null,
        authorType: 'manufacturer',
        nose: row.nose ?? null,
        palate: row.palate ?? null,
        mouthfeel: null,
        finish: row.finish ?? null,
        overall: row.overall ?? null,
        sourceName: source.name,
        sourceUrl: source.url,
        attribution: null,
        language: 'de',
        tastedAt: null,
      }
    : null;

  return {
    id: `local-product-${row.slug}`,
    slug: row.slug,
    name: row.name,
    brandName: row.brand,
    brandSlug: slugify(row.brand),
    categoryName: category.name,
    categorySlug,
    family: row.style ?? null,
    countryCode: row.country ? countryCodes[row.country] ?? null : null,
    region: row.region ?? null,
    ageYears: row.age ?? null,
    distillationDetails: row.distillation ?? null,
    maturationDetails: row.maturation ?? null,
    abvPercent: row.abv ?? null,
    description: row.summary ?? null,
    image: imageFor(row),
    flavors: [],
    sensoryProfile: getCategorySensoryDimensions(categorySlug),
    sensoryTags: [],
    qualitativeFlavors: (row.tags ?? []).flatMap((code) => flavorLabels[code]
      ? [{ code, label: flavorLabels[code] }]
      : []),
    variants,
    tastingNotes: note ? [note] : [],
    communityReviews: [],
    sources,
    dataOrigin: 'unreviewed',
  };
}

function imageFor(row: StartProduct): ProductImage | null {
  const image = row.image;
  if (!image?.filename || !image.alt_text || !image.source_name || !image.source_url
    || !image.source_page_url || image.rights_status !== 'unverified_local_development_preview') return null;
  const extension = path.extname(image.filename).toLowerCase();
  if (path.basename(image.filename) !== image.filename || !['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(extension)) return null;
  try {
    if (new URL(image.source_url).protocol !== 'https:' || new URL(image.source_page_url).protocol !== 'https:') return null;
  } catch {
    return null;
  }
  return {
    src: `/api/local-official-product-image/${row.slug}`,
    altText: image.alt_text,
    sourceName: image.source_name,
    sourceUrl: image.source_url,
    sourcePageUrl: image.source_page_url,
    attribution: null,
    rightsStatus: 'unverified',
    localOnly: true,
  };
}

export async function readLocalStartProductImage(
  filePath: string,
  slug: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const metadata = await stat(filePath);
  if (!metadata.isFile() || metadata.size > 2 * 1024 * 1024) return null;
  const payload = JSON.parse(await readFile(filePath, 'utf8')) as StartCatalog;
  if (!Array.isArray(payload.products)) return null;
  const row = payload.products.find((product): product is StartProduct => isStartProduct(product) && product.slug === slug);
  if (!row?.image?.filename || path.basename(row.image.filename) !== row.image.filename) return null;

  const contentTypes: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif',
  };
  const extension = path.extname(row.image.filename).toLowerCase();
  const contentType = contentTypes[extension];
  if (!contentType) return null;

  const catalogDirectory = await realpath(path.dirname(filePath));
  const imagesDirectory = path.join(catalogDirectory, 'official-images');
  const directoryMetadata = await lstat(imagesDirectory);
  if (!directoryMetadata.isDirectory() || directoryMetadata.isSymbolicLink()) return null;
  const assetPath = path.join(imagesDirectory, row.image.filename);
  const assetMetadata = await lstat(assetPath);
  if (!assetMetadata.isFile() || assetMetadata.isSymbolicLink() || assetMetadata.size > 8 * 1024 * 1024) return null;
  const resolvedAssetPath = await realpath(assetPath);
  if (path.dirname(resolvedAssetPath) !== imagesDirectory) return null;

  return { bytes: new Uint8Array(await readFile(resolvedAssetPath)), contentType };
}

export async function readLocalStartDatabase(filePath: string): Promise<{ products: CatalogProduct[]; categories: CatalogCategory[] }> {
  const metadata = await stat(filePath);
  if (!metadata.isFile() || metadata.size > 2 * 1024 * 1024) throw new Error('local_catalog_file_invalid');
  const payload = JSON.parse(await readFile(filePath, 'utf8')) as StartCatalog;
  if (!Array.isArray(payload.products) || payload.products.length === 0 || !payload.products.every(isStartProduct)) {
    throw new Error('local_catalog_shape_invalid');
  }
  const products = payload.products.map((row) => mapProduct(row));
  if (new Set(products.map((product) => product.slug)).size !== products.length) throw new Error('local_catalog_duplicate_slug');
  return { products, categories: navigationTaxonomy };
}

export function localPackageQrCode(index: number): string {
  return `AR-${String(index + 1).padStart(4, '0')}`;
}
