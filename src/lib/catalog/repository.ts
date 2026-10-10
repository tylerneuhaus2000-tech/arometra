import 'server-only';
import { fixtureCategories, fixtureDisabledQrCode, fixtureProducts, fixtureQrCode } from '@test/fixtures/catalog';
import { createCatalogClient } from '@/lib/supabase/server';
import { getRuntimeConfig } from '@/lib/runtime-config';
import { normalizeSearchTerm } from './search';
import { getSimilarRecommendations } from './recommendations';
import { navigationTaxonomy } from './taxonomy';
import { mapPublicProductImages, type PublicProductImageRow } from './product-images';
import { localPackageQrCode, readLocalStartDatabase } from './local-start-database';
import type {
  CatalogCategory,
  CatalogProduct,
  CatalogQuery,
  CatalogResult,
  CatalogVariant,
  DataMode,
  ProductResult,
  ProductSource,
  ProductFlavorValue,
  ProductSensoryDimension,
  ProductSensoryTag,
  CommunityReview,
  TastingNote,
} from './model';

const PAGE_SIZE = 12;
// Supabase's default PostgREST row cap is 1,000; this covers the planned 300–500 item catalog.
const MAX_RECOMMENDATION_CANDIDATES = 1_000;
const PUBLIC_PRODUCT_IMAGE_SELECT = 'id,product_id,storage_path,source_url,alt_text,attribution,sort_order,source:sources!inner(source_name,canonical_url)';

type SearchRow = {
  id: string;
  slug: string;
  name: string;
  brand_id: string;
  brand_name: string;
  brand_slug: string;
  category_id: string;
  category_name_de: string;
  category_slug: string;
  product_family: string | null;
  origin_country_code: string | null;
  origin_region: string | null;
  age_years: number | null;
  abv_percent: number | null;
  description: string | null;
  total_count: number | string;
};

type DetailRow = {
  id: string;
  slug: string;
  name: string;
  brand_id: string;
  brand: { name: string; slug: string };
  primary_category_id: string;
  category: { name_de: string; slug: string };
  product_family: string | null;
  origin_country_code: string | null;
  origin_region: string | null;
  age_years: number | null;
  distillation_details: string | null;
  maturation_details: string | null;
  abv_percent: number | null;
  description: string | null;
};

type FlavorRow = {
  product_id: string;
  value: number;
  method: string;
  verified_at: string;
  dimension: { code: string; label_de: string };
  source: { source_name: string; canonical_url: string | null };
};

type VariantRow = {
  id: string;
  gtin: string | null;
  volume_ml: number | null;
  market_country_code: string | null;
  abv_percent_override: number | null;
  edition_label: string | null;
};

type VariantProvenanceRow = {
  variant_id: string;
  field_path: string;
  verified_at: string;
  source: { id: string; source_name: string; canonical_url: string | null; attribution_text: string | null };
};

type NoteRow = {
  id: string;
  product_id: string;
  author_label: string | null;
  author_type: 'manufacturer' | 'expert' | 'editorial' | 'consumer';
  nose_text: string | null;
  palate_text: string | null;
  mouthfeel_text: string | null;
  finish_text: string | null;
  overall_text: string | null;
  tasted_at: string | null;
  language: string;
  source: { source_name: string; canonical_url: string | null; attribution_text: string | null };
};

type SensoryProfileRow = {
  category_id: string;
  dimension_code: string;
  dimension_label_de: string;
  semantic_family: string;
  display_order: number;
  tag_code: string | null;
  tag_label_de: string | null;
  evidence_type: ProductSensoryTag['evidenceType'] | null;
  stage: 'unspecified' | 'nose' | 'palate' | 'finish' | null;
  source_name: string | null;
  canonical_url: string | null;
  descriptor_verified_at: string | null;
  intensity: number | string | null;
  measurement_method: string | null;
  measurement_evidence_type: ProductSensoryTag['evidenceType'] | null;
  measurement_source_name: string | null;
  measurement_source_url: string | null;
  measurement_verified_at: string | null;
};

type SensoryTagRow = {
  product_id: string;
  tag_code: string;
  tag_label_de: string;
  evidence_type: ProductSensoryTag['evidenceType'];
  category_id: string;
  source_name: string;
  canonical_url: string | null;
};

type CommunityReviewRow = {
  id: string;
  display_name: string | null;
  rating: number;
  nose_text: string | null;
  palate_text: string | null;
  finish_text: string | null;
  overall_text: string | null;
  origin: 'self_reported' | 'verified_purchase';
  purchase_verified_at: string | null;
  created_at: string;
};

type PublicSourceRow = {
  product_id: string;
  field_path: string;
  source_id: string;
  source_name: string;
  canonical_url: string | null;
  attribution_text: string | null;
  verified_at: string;
};

type CategoryRow = { id: string; parent_id: string | null; slug: string; name_de: string };

function unconfiguredResult(query: CatalogQuery, message: string, status: 'unconfigured' | 'error'): CatalogResult {
  return {
    status,
    mode: status === 'error' ? 'supabase' : 'unconfigured',
    message,
    products: [],
    categories: navigationTaxonomy,
    page: query.page,
    pageSize: PAGE_SIZE,
    total: 0,
  };
}

function fromSearchRow(row: SearchRow): CatalogProduct {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brandName: row.brand_name,
    brandSlug: row.brand_slug,
    categoryName: row.category_name_de,
    categorySlug: row.category_slug,
    family: row.product_family,
    countryCode: row.origin_country_code,
    region: row.origin_region,
    ageYears: row.age_years,
    distillationDetails: null,
    maturationDetails: null,
    abvPercent: row.abv_percent,
    description: row.description,
    flavors: [],
    sensoryProfile: [],
    sensoryTags: [],
    variants: [],
    tastingNotes: [],
    communityReviews: [],
    sources: [],
    dataOrigin: 'verified',
  };
}

function fromDetailRow(row: DetailRow): CatalogProduct {
  const product = fromSearchRow({
    ...row,
    brand_name: row.brand.name,
    brand_slug: row.brand.slug,
    category_id: row.primary_category_id,
    category_name_de: row.category.name_de,
    category_slug: row.category.slug,
    total_count: 1,
  });
  product.distillationDetails = row.distillation_details;
  product.maturationDetails = row.maturation_details;
  return product;
}

function filterFixtures(products: CatalogProduct[], query: CatalogQuery): CatalogProduct[] {
  const term = normalizeSearchTerm(query.q);
  return products.filter((product) => {
    const searchable = normalizeSearchTerm(`${product.name} ${product.brandName ?? ''} ${product.categoryName}`);
    if (term && !searchable.includes(term)) return false;
    if (query.category && product.categorySlug !== query.category
      && fixtureCategories.find((category) => category.slug === product.categorySlug)?.parentSlug !== query.category) return false;
    if (query.flavor && !product.flavors.some((flavor) => flavor.code === query.flavor)) return false;
    if (query.country && product.countryCode !== query.country) return false;
    if (query.brand && product.brandSlug !== query.brand) return false;
    return true;
  });
}

function filterLocalStartProducts(products: CatalogProduct[], query: CatalogQuery): CatalogProduct[] {
  const term = normalizeSearchTerm(query.q);
  return products.filter((product) => {
    const searchable = normalizeSearchTerm([
      product.name, product.brandName ?? '', product.categoryName, product.family ?? '',
      product.region ?? '', ...(product.qualitativeFlavors ?? []).map((flavor) => flavor.label),
    ].join(' '));
    if (term && !searchable.includes(term)) return false;
    if (query.category && product.categorySlug !== query.category
      && navigationTaxonomy.find((category) => category.slug === product.categorySlug)?.parentSlug !== query.category) return false;
    if (query.flavor && !product.qualitativeFlavors?.some((flavor) => flavor.code === query.flavor)) return false;
    if (query.country && product.countryCode !== query.country) return false;
    if (query.brand && product.brandSlug !== query.brand) return false;
    return true;
  });
}

function mapFlavorRows(rows: FlavorRow[], productId: string): ProductFlavorValue[] {
  const priority: Record<string, number> = {
    expert: 0,
    editorial: 1,
    manufacturer: 2,
    community_aggregated: 3,
  };
  const ordered = rows
    .filter((row) => row.product_id === productId && row.dimension)
    .sort((left, right) =>
      (priority[left.method] ?? 4) - (priority[right.method] ?? 4)
      || right.verified_at.localeCompare(left.verified_at)
      || left.dimension.code.localeCompare(right.dimension.code),
    );
  const selected = new Map<string, ProductFlavorValue>();
  for (const row of ordered) {
    if (selected.has(row.dimension.code)) continue;
    selected.set(row.dimension.code, {
      code: row.dimension.code,
      label: row.dimension.label_de,
      value: Number(row.value),
      method: row.method,
      sourceName: row.source.source_name,
      sourceUrl: row.source.canonical_url,
      verifiedAt: row.verified_at,
      dataOrigin: 'verified',
    });
  }
  return [...selected.values()].sort((left, right) => left.code.localeCompare(right.code));
}

function mapSources(rows: PublicSourceRow[]): ProductSource[] {
  const grouped = new Map<string, ProductSource>();
  for (const row of rows) {
    const source = grouped.get(row.source_id) ?? {
      id: row.source_id,
      name: row.source_name,
      url: row.canonical_url,
      attribution: row.attribution_text,
      fields: [],
    };
    source.fields.push({ path: row.field_path, verifiedAt: row.verified_at });
    grouped.set(row.source_id, source);
  }
  return [...grouped.values()].map((source) => ({
    ...source,
    fields: [...new Map(source.fields.map((field) => [field.path, field])).values()]
      .sort((left, right) => left.path.localeCompare(right.path)),
  }));
}

function mapVariantRows(variants: VariantRow[], provenance: VariantProvenanceRow[]): CatalogVariant[] {
  const sourceRows = new Map<string, PublicSourceRow[]>();
  for (const row of provenance) {
    const rows = sourceRows.get(row.variant_id) ?? [];
    rows.push({
      product_id: row.variant_id,
      field_path: `variant:${row.field_path}`,
      source_id: row.source.id,
      source_name: row.source.source_name,
      canonical_url: row.source.canonical_url,
      attribution_text: row.source.attribution_text,
      verified_at: row.verified_at,
    });
    sourceRows.set(row.variant_id, rows);
  }
  return variants.map((row) => ({
    id: row.id,
    gtin: row.gtin,
    volumeMl: row.volume_ml,
    marketCountryCode: row.market_country_code,
    abvPercentOverride: row.abv_percent_override === null ? null : Number(row.abv_percent_override),
    editionLabel: row.edition_label,
    sources: mapSources(sourceRows.get(row.id) ?? []),
  }));
}

function mapNotes(rows: NoteRow[]): TastingNote[] {
  return rows.map((row) => ({
    id: row.id,
    authorLabel: row.author_label,
    authorType: row.author_type,
    nose: row.nose_text,
    palate: row.palate_text,
    mouthfeel: row.mouthfeel_text,
    finish: row.finish_text,
    overall: row.overall_text,
    sourceName: row.source.source_name,
    sourceUrl: row.source.canonical_url,
    attribution: row.source.attribution_text,
    language: row.language,
    tastedAt: row.tasted_at,
  }));
}

function mapSensoryProfile(rows: SensoryProfileRow[]): ProductSensoryDimension[] {
  const dimensions = new Map<string, ProductSensoryDimension>();
  for (const row of rows) {
    const dimension = dimensions.get(row.dimension_code) ?? {
      code: row.dimension_code,
      label: row.dimension_label_de,
      semanticFamily: row.semantic_family,
      displayOrder: row.display_order,
      descriptors: [],
      intensity: row.intensity === null ? null : Number(row.intensity),
      measurementMethod: row.measurement_method,
      measurementEvidenceType: row.measurement_evidence_type,
      measurementSourceName: row.measurement_source_name,
      measurementSourceUrl: row.measurement_source_url,
      measurementVerifiedAt: row.measurement_verified_at,
    };
    if (row.tag_code && row.tag_label_de && row.evidence_type && row.source_name) {
      dimension.descriptors.push({
        code: row.tag_code,
        label: row.tag_label_de,
        evidenceType: row.evidence_type,
        stage: row.stage ?? 'unspecified',
        sourceName: row.source_name,
        sourceUrl: row.canonical_url,
        verifiedAt: row.descriptor_verified_at,
      });
    }
    dimensions.set(row.dimension_code, dimension);
  }
  return [...dimensions.values()].sort((left, right) => left.displayOrder - right.displayOrder);
}

function mapProfileTags(rows: SensoryProfileRow[]): ProductSensoryTag[] {
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    if (!row.tag_code || !row.tag_label_de || !row.evidence_type || !row.source_name) return [];
    const identity = `${row.category_id}:${row.tag_code}`;
    if (seen.has(identity)) return [];
    seen.add(identity);
    return [{
      code: row.tag_code,
      label: row.tag_label_de,
      evidenceType: row.evidence_type,
      categoryId: row.category_id,
      sourceName: row.source_name,
      sourceUrl: row.canonical_url,
    }];
  });
}

function mapSensoryTags(rows: SensoryTagRow[]): ProductSensoryTag[] {
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    const identity = `${row.category_id}:${row.tag_code}`;
    if (seen.has(identity)) return [];
    seen.add(identity);
    return [{
      code: row.tag_code,
      label: row.tag_label_de,
      evidenceType: row.evidence_type,
      categoryId: row.category_id,
      sourceName: row.source_name,
      sourceUrl: row.canonical_url,
    }];
  });
}

function mapCommunityReviews(rows: CommunityReviewRow[]): CommunityReview[] {
  return rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    rating: Number(row.rating),
    nose: row.nose_text,
    palate: row.palate_text,
    finish: row.finish_text,
    overall: row.overall_text,
    verifiedPurchase: row.origin === 'verified_purchase' && row.purchase_verified_at !== null,
    createdAt: row.created_at,
  }));
}

async function getDatabaseCategories(client: NonNullable<ReturnType<typeof createCatalogClient>>): Promise<CatalogCategory[]> {
  const { data, error } = await client.from('categories').select('id,parent_id,slug,name_de').eq('active', true).order('sort_order');
  if (error || !data) throw new Error('category_query_failed');
  const rows = data as unknown as CategoryRow[];
  const slugById = new Map(rows.map((row) => [row.id, row.slug]));
  return rows.map((row) => ({
    slug: row.slug,
    name: row.name_de,
    parentSlug: row.parent_id ? slugById.get(row.parent_id) ?? null : null,
  }));
}

export async function getNavigationCategories(): Promise<CatalogCategory[]> {
  const config = getRuntimeConfig();
  if (config.mode === 'fixtures' || config.mode === 'unconfigured') return navigationTaxonomy;
  if (config.mode === 'local-start-database') {
    try {
      return (await readLocalStartDatabase(config.catalogPath)).categories;
    } catch {
      return navigationTaxonomy;
    }
  }
  if (config.mode !== 'supabase') return [];
  const client = createCatalogClient();
  if (!client) return [];
  try {
    return await getDatabaseCategories(client);
  } catch {
    return [];
  }
}

export async function getCatalog(query: CatalogQuery): Promise<CatalogResult> {
  const config = getRuntimeConfig();
  if (config.mode === 'fixtures') {
    const matched = filterFixtures(fixtureProducts, query);
    const start = (query.page - 1) * PAGE_SIZE;
    return {
      status: 'ready',
      mode: 'fixtures',
      message: null,
      products: matched.slice(start, start + PAGE_SIZE),
      categories: fixtureCategories,
      page: query.page,
      pageSize: PAGE_SIZE,
      total: matched.length,
    };
  }
  if (config.mode === 'local-start-database') {
    try {
      const { products, categories } = await readLocalStartDatabase(config.catalogPath);
      const matched = filterLocalStartProducts(products, query);
      const start = (query.page - 1) * PAGE_SIZE;
      return {
        status: 'ready',
        mode: 'local-start-database',
        message: null,
        products: matched.slice(start, start + PAGE_SIZE),
        categories,
        page: query.page,
        pageSize: PAGE_SIZE,
        total: matched.length,
      };
    } catch {
      return unconfiguredResult(query, 'Die lokale Testdatenbank konnte nicht geladen werden.', 'error');
    }
  }
  if (config.mode !== 'supabase') {
    return unconfiguredResult(query, config.message, config.mode === 'invalid' ? 'error' : 'unconfigured');
  }

  const client = createCatalogClient();
  if (!client) return unconfiguredResult(query, 'Die Datenquelle ist nicht verfügbar.', 'error');

  try {
    const [{ data, error }, categories] = await Promise.all([
      client.rpc('search_catalog', {
        search_term: query.q || null,
        normalized_term: normalizeSearchTerm(query.q) || null,
        category_slug: query.category || null,
        flavor_code: query.flavor || null,
        origin_country_code: query.country || null,
        brand_slug: query.brand || null,
        page_number: query.page,
        page_size: PAGE_SIZE,
      }),
      getDatabaseCategories(client),
    ]);
    if (error) return unconfiguredResult(query, 'Der Katalog konnte nicht geladen werden.', 'error');
    const rows = (data ?? []) as unknown as SearchRow[];
    const products = rows.map(fromSearchRow);
    if (products.length > 0) {
      const productIds = products.map((product) => product.id);
      const [flavorResult, imageResult] = await Promise.all([
        client.from('product_flavor_values')
          .select('product_id,value,method,verified_at,dimension:flavor_dimensions!inner(code,label_de),source:sources!inner(source_name,canonical_url)')
          .in('product_id', productIds),
        client.from('product_images')
          .select(PUBLIC_PRODUCT_IMAGE_SELECT)
          .in('product_id', productIds)
          .order('sort_order'),
      ]);
      if (flavorResult.error) return unconfiguredResult(query, 'Das Geschmacksprofil konnte nicht geprüft werden.', 'error');
      const flavorRows = (flavorResult.data ?? []) as unknown as FlavorRow[];
      for (const product of products) product.flavors = mapFlavorRows(flavorRows, product.id);
      if (!imageResult.error) {
        const images = mapPublicProductImages((imageResult.data ?? []) as unknown as PublicProductImageRow[]);
        for (const product of products) product.image = images.get(product.id) ?? null;
      }
    }
    return {
      status: 'ready',
      mode: 'supabase',
      message: null,
      products,
      categories,
      page: query.page,
      pageSize: PAGE_SIZE,
      total: rows.length > 0 ? Number(rows[0].total_count) : 0,
    };
  } catch {
    return unconfiguredResult(query, 'Der Katalog konnte nicht geladen werden.', 'error');
  }
}

export async function getProductBySlug(slug: string): Promise<ProductResult> {
  const config = getRuntimeConfig();
  if (config.mode === 'fixtures') {
    return {
      status: 'ready',
      mode: 'fixtures',
      message: null,
      product: fixtureProducts.find((product) => product.slug === slug) ?? null,
    };
  }
  if (config.mode === 'local-start-database') {
    try {
      const { products } = await readLocalStartDatabase(config.catalogPath);
      return { status: 'ready', mode: 'local-start-database', message: null, product: products.find((product) => product.slug === slug) ?? null };
    } catch {
      return { status: 'error', mode: 'local-start-database', message: 'Die lokale Testdatenbank konnte nicht geladen werden.', product: null };
    }
  }
  if (config.mode !== 'supabase') {
    return {
      status: config.mode === 'invalid' ? 'error' : 'unconfigured',
      mode: 'unconfigured',
      message: config.message,
      product: null,
    };
  }

  const client = createCatalogClient();
  if (!client) return { status: 'error', mode: 'unconfigured', message: 'Die Datenquelle ist nicht verfügbar.', product: null };

  try {
    const { data, error } = await client
      .from('products')
      .select('id,slug,name,brand_id,brand:brands!inner(name,slug),primary_category_id,category:categories!products_primary_category_id_fkey!inner(name_de,slug),product_family,origin_country_code,origin_region,age_years,distillation_details,maturation_details,abv_percent,description')
      .eq('slug', slug)
      .maybeSingle();
    if (error) return { status: 'error', mode: 'supabase', message: 'Das Produkt konnte nicht geladen werden.', product: null };
    if (!data) return { status: 'ready', mode: 'supabase', message: null, product: null };

    const row = data as unknown as DetailRow;
    const product = fromDetailRow(row);
    const [flavorResult, noteResult, sourceResult, variantResult, sensoryResult, reviewResult, imageResult] = await Promise.all([
      client.from('product_flavor_values')
        .select('product_id,value,method,verified_at,dimension:flavor_dimensions!inner(code,label_de),source:sources!inner(source_name,canonical_url)')
        .eq('product_id', product.id),
      client.from('tasting_notes')
        .select('id,product_id,author_label,author_type,nose_text,palate_text,mouthfeel_text,finish_text,overall_text,tasted_at,language,source:sources!inner(source_name,canonical_url,attribution_text)')
        .eq('product_id', product.id),
      client.from('product_public_sources')
        .select('product_id,field_path,source_id,source_name,canonical_url,attribution_text,verified_at')
        .eq('product_id', product.id),
      client.from('product_variants')
        .select('id,gtin,volume_ml,market_country_code,abv_percent_override,edition_label')
        .eq('product_id', product.id)
        .order('volume_ml'),
      client.rpc('get_product_sensory_profile', { target_product_id: product.id }),
      client.from('community_reviews')
        .select('id,display_name,rating,nose_text,palate_text,finish_text,overall_text,origin,purchase_verified_at,created_at')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false })
        .limit(10),
      client.from('product_images')
        .select(PUBLIC_PRODUCT_IMAGE_SELECT)
        .eq('product_id', product.id)
        .order('sort_order'),
    ]);

    if (flavorResult.error || noteResult.error || sourceResult.error || variantResult.error || sensoryResult.error || reviewResult.error) {
      return { status: 'error', mode: 'supabase', message: 'Produktnachweise konnten nicht vollständig geladen werden.', product: null };
    }

    const variants = (variantResult.data ?? []) as unknown as VariantRow[];
    const variantIds = variants.map((variant) => variant.id);
    const provenanceResult = variantIds.length > 0
      ? await client.from('variant_field_provenance')
        .select('variant_id,field_path,verified_at,source:sources!inner(id,source_name,canonical_url,attribution_text)')
        .in('variant_id', variantIds)
      : { data: [], error: null };
    if (provenanceResult.error) {
      return { status: 'error', mode: 'supabase', message: 'Abfüllungsnachweise konnten nicht vollständig geladen werden.', product: null };
    }

    product.flavors = mapFlavorRows((flavorResult.data ?? []) as unknown as FlavorRow[], product.id);
    product.tastingNotes = mapNotes((noteResult.data ?? []) as unknown as NoteRow[]);
    product.sources = mapSources((sourceResult.data ?? []) as unknown as PublicSourceRow[]);
    const sensoryRows = (sensoryResult.data ?? []) as unknown as SensoryProfileRow[];
    product.sensoryProfile = mapSensoryProfile(sensoryRows);
    product.sensoryTags = mapProfileTags(sensoryRows);
    product.communityReviews = mapCommunityReviews((reviewResult.data ?? []) as unknown as CommunityReviewRow[]);
    product.image = imageResult.error
      ? null
      : mapPublicProductImages((imageResult.data ?? []) as unknown as PublicProductImageRow[]).get(product.id) ?? null;
    product.variants = mapVariantRows(variants, (provenanceResult.data ?? []) as unknown as VariantProvenanceRow[]);
    return { status: 'ready', mode: 'supabase', message: null, product };
  } catch {
    return { status: 'error', mode: 'supabase', message: 'Das Produkt konnte nicht geladen werden.', product: null };
  }
}

export async function getSimilarProducts(product: CatalogProduct): Promise<ReturnType<typeof getSimilarRecommendations>> {
  const config = getRuntimeConfig();
  if (config.mode === 'fixtures') {
    return getSimilarRecommendations(product, fixtureProducts);
  }
  if (config.mode === 'local-start-database' && product.dataOrigin === 'unreviewed') {
    try {
      const { products } = await readLocalStartDatabase(config.catalogPath);
      return getSimilarRecommendations(product, products);
    } catch {
      return [];
    }
  }
  if (config.mode !== 'supabase' || product.dataOrigin !== 'verified') return [];

  const client = createCatalogClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('products')
      .select('id,slug,name,brand_id,brand:brands!inner(name,slug),primary_category_id,category:categories!products_primary_category_id_fkey!inner(name_de,slug),product_family,origin_country_code,origin_region,age_years,distillation_details,maturation_details,abv_percent,description')
      .order('name')
      .limit(MAX_RECOMMENDATION_CANDIDATES);
    if (error || !data || data.length === 0) return [];

    const products = (data as unknown as DetailRow[]).map(fromDetailRow);
    const ids = products.map((item) => item.id);
    const [flavorResult, sensoryTagResult] = await Promise.all([
      client
        .from('product_flavor_values')
        .select('product_id,value,method,verified_at,dimension:flavor_dimensions!inner(code,label_de),source:sources!inner(source_name,canonical_url)')
        .in('product_id', ids),
      client.rpc('get_public_sensory_tags', { target_product_ids: ids }),
    ]);
    if (flavorResult.error || sensoryTagResult.error) return [];

    const flavorRows = (flavorResult.data ?? []) as unknown as FlavorRow[];
    for (const candidate of products) {
      candidate.flavors = mapFlavorRows(flavorRows, candidate.id);
    }
    const sensoryTags = (sensoryTagResult.data ?? []) as unknown as SensoryTagRow[];
    for (const candidate of products) {
      candidate.sensoryTags = mapSensoryTags(sensoryTags.filter((tag) => tag.product_id === candidate.id));
    }
    const recommendations = getSimilarRecommendations(product, products);
    if (recommendations.length === 0) return recommendations;
    const imageResult = await client.from('product_images')
      .select(PUBLIC_PRODUCT_IMAGE_SELECT)
      .in('product_id', recommendations.map((item) => item.product.id))
      .order('sort_order');
    if (!imageResult.error) {
      const images = mapPublicProductImages((imageResult.data ?? []) as unknown as PublicProductImageRow[]);
      for (const recommendation of recommendations) {
        recommendation.product.image = images.get(recommendation.product.id) ?? null;
      }
    }
    return recommendations;
  } catch {
    return [];
  }
}

export async function resolveQrCode(code: string): Promise<{
  status: 'active' | 'disabled' | 'unavailable' | 'unknown' | 'error';
  slug: string | null;
  mode: DataMode;
}> {
  const config = getRuntimeConfig();
  if (config.mode === 'fixtures') {
    if (code === fixtureDisabledQrCode) return { status: 'disabled', slug: null, mode: 'fixtures' };
    if (code !== fixtureQrCode) return { status: 'unknown', slug: null, mode: 'fixtures' };
    return { status: 'active', slug: fixtureProducts[0].slug, mode: 'fixtures' };
  }
  if (config.mode === 'local-start-database') {
    try {
      const { products } = await readLocalStartDatabase(config.catalogPath);
      const index = Number(/^AR-(\d{4})$/.exec(code)?.[1]) - 1;
      if (index < 0 || !Number.isInteger(index) || !products[index]) return { status: 'unknown', slug: null, mode: 'local-start-database' };
      return localPackageQrCode(index) === code
        ? { status: 'active', slug: products[index].slug, mode: 'local-start-database' }
        : { status: 'unknown', slug: null, mode: 'local-start-database' };
    } catch {
      return { status: 'error', slug: null, mode: 'local-start-database' };
    }
  }
  if (config.mode !== 'supabase') {
    return { status: config.mode === 'invalid' ? 'error' : 'unavailable', slug: null, mode: 'unconfigured' };
  }

  const client = createCatalogClient();
  if (!client) return { status: 'error', slug: null, mode: 'unconfigured' };
  try {
    const { data, error } = await client.rpc('resolve_qr_link', { lookup_code: code });
    if (error) return { status: 'error', slug: null, mode: 'supabase' };
    const row = (data as Array<{ resolution_status: string; product_slug: string | null }> | null)?.[0];
    if (!row) return { status: 'unknown', slug: null, mode: 'supabase' };
    if (row.resolution_status === 'active' && row.product_slug) {
      return { status: 'active', slug: row.product_slug, mode: 'supabase' };
    }
    if (row.resolution_status === 'disabled') return { status: 'disabled', slug: null, mode: 'supabase' };
    return { status: 'unavailable', slug: null, mode: 'supabase' };
  } catch {
    return { status: 'error', slug: null, mode: 'supabase' };
  }
}

export function getModeStatus(mode: DataMode): { label: string; isSynthetic: boolean } {
  if (mode === 'fixtures') return { label: 'Synthetische Testdaten', isSynthetic: true };
  if (mode === 'local-start-database') return { label: 'Lokale Testdatenbank · ungeprüft', isSynthetic: false };
  if (mode === 'supabase') return { label: 'Geprüfter Katalog', isSynthetic: false };
  return { label: 'Datenquelle nicht verbunden', isSynthetic: false };
}
