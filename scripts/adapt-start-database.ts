import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type StartCatalog = {
  meta?: { checked_on?: unknown };
  products?: unknown;
};

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
  source: string;
  nose?: string | null;
  palate?: string | null;
  mouthfeel?: string | null;
  finish?: string | null;
  overall?: string | null;
  tags?: string[];
  image?: {
    alt_text?: string;
    source_name?: string;
    source_url?: string;
    source_page_url?: string;
  } | null;
};

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

const originCountryCodes: Record<string, string> = {
  Frankreich: 'FR',
  Irland: 'IE',
  Mexiko: 'MX',
  Schottland: 'GB',
  Schweden: 'SE',
  USA: 'US',
  Venezuela: 'VE',
  'Vereinigtes Königreich': 'GB',
};

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

function isProduct(value: unknown): value is StartProduct {
  if (!value || typeof value !== 'object') return false;
  const product = value as Partial<StartProduct>;
  return typeof product.slug === 'string'
    && typeof product.name === 'string'
    && typeof product.brand === 'string'
    && typeof product.category === 'string'
    && typeof product.source === 'string';
}

function convert(product: StartProduct, checkedOn: string, factsOnly: boolean): Record<string, unknown> {
  const categorySlug = categoryMap[product.category];
  if (!categorySlug) throw new Error(`UNMAPPED_CATEGORY:${product.category}`);
  const sourceUrl = new URL(product.source);
  if (sourceUrl.protocol !== 'https:') throw new Error('SOURCE_URL_MUST_USE_HTTPS');
  const noteFields = {
    nose: product.nose?.trim() || null,
    palate: product.palate?.trim() || null,
    mouthfeel: product.mouthfeel?.trim() || null,
    finish: product.finish?.trim() || null,
    overall: product.overall?.trim() || null,
  };
  const hasNotes = !factsOnly && Boolean(noteFields.nose || noteFields.palate || noteFields.finish || noteFields.overall);
  let image: Record<string, unknown> | undefined;
  if (!factsOnly && product.image?.alt_text && product.image.source_name && product.image.source_url && product.image.source_page_url) {
    const imageUrl = new URL(product.image.source_url);
    const imageSourcePage = new URL(product.image.source_page_url);
    if (imageUrl.protocol !== 'https:' || imageSourcePage.protocol !== 'https:') throw new Error('IMAGE_SOURCE_MUST_USE_HTTPS');
    const isProductSourcePage = imageSourcePage.toString() === sourceUrl.toString();
    image = {
      url: imageUrl.toString(),
      altText: product.image.alt_text,
      attribution: null,
      source: isProductSourcePage ? {
        name: sourceUrl.hostname,
        type: 'official_manufacturer',
        url: sourceUrl.toString(),
        termsUrl: null,
        licenseId: null,
        attribution: null,
      } : {
        name: product.image.source_name,
        type: imageSourcePage.hostname === sourceUrl.hostname ? 'official_manufacturer' : 'operator_entry',
        url: imageSourcePage.toString(),
        termsUrl: null,
        licenseId: null,
        attribution: null,
      },
    };
  }

  return {
    sourceRecordId: product.slug,
    source: {
      name: sourceUrl.hostname,
      type: 'official_manufacturer',
      url: sourceUrl.toString(),
      termsUrl: null,
      licenseId: null,
      attribution: null,
    },
    // The supplied package records only a calendar date. Midnight UTC is a
    // storage normalization marker; it does not claim a known retrieval time.
    retrievedAt: `${checkedOn}T00:00:00.000Z`,
    brand: { name: product.brand, countryCode: null },
    product: {
      name: product.name,
      categorySlug,
      family: product.style ?? null,
      originCountryCode: product.country ? originCountryCodes[product.country] ?? null : null,
      originRegion: product.region ?? null,
      ageYears: product.age ?? null,
      abvPercent: product.abv ?? null,
      ...(image ? { image } : {}),
    },
    variant: {
      gtin: null,
      volumeMl: product.volume_ml ?? null,
      marketCountryCode: null,
      abvPercentOverride: null,
      editionLabel: null,
      variantCode: null,
    },
    // Qualitative tags are never turned into numeric flavor values.
    flavors: [],
    sensoryDescriptors: (product.tags ?? []).map((tag) => ({
      tagCode: tag === 'getreidig' ? 'getreide' : tag,
      stage: 'unspecified',
    })),
    ...(hasNotes ? {
      tastingNotes: {
        authorType: 'manufacturer',
        authorLabel: null,
        ...noteFields,
        language: 'de',
      },
    } : {}),
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const inputPath = option(args, '--file');
  const outputPath = option(args, '--output');
  const factsOnly = args.includes('--facts-only');
  if (!inputPath || !outputPath) throw new Error('USAGE: --file <catalog_data.json> --output <converted.json>');

  const input = JSON.parse(await readFile(path.resolve(inputPath), 'utf8')) as StartCatalog;
  const checkedOn = input.meta?.checked_on;
  if (typeof checkedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(checkedOn)) {
    throw new Error('SOURCE_CHECK_DATE_MISSING_OR_INVALID');
  }
  if (!Array.isArray(input.products) || input.products.length === 0 || !input.products.every(isProduct)) {
    throw new Error('START_CATALOG_PRODUCTS_INVALID');
  }
  const converted = input.products.map((product) => convert(product, checkedOn, factsOnly));
  const resolvedOutput = path.resolve(outputPath);
  await writeFile(resolvedOutput, `${JSON.stringify(converted, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  process.stdout.write(`${JSON.stringify({ convertedRows: converted.length, output: resolvedOutput, factsOnly, databaseWrites: 0 }, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'START_CATALOG_ADAPT_FAILED'}\n`);
  process.exitCode = 1;
});
