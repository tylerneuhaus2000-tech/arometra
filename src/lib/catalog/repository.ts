import 'server-only';
import { fixtureCategories, fixtureDisabledQrCode, fixtureProducts, fixtureQrCode } from '@test/fixtures/catalog';
import { createCatalogClient } from '@/lib/supabase/server';
import { getRuntimeConfig } from '@/lib/runtime-config';
import { normalizeSearchTerm } from './search';
import { getSimilarRecommendations } from './recommendations';
import type {
  CatalogCategory,
  CatalogProduct,
  CatalogQuery,
  CatalogResult,
  DataMode,
  ProductResult,
  ProductSource,
  ProductFlavorValue,
  TastingNote,
} from './model';

const PAGE_SIZE = 12;
const MAX_RECOMMENDATION_CANDIDATES = 200;

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
  abv_percent: number | null;
  description: string | null;
};

type FlavorRow = {
  product_id: string;
  value: number;
  method: string;
  verified_at: string;
  dimension: { code: string; label_de: string };
};

type NoteRow = {
  id: string;
  product_id: string;
  author_label: string | null;
  author_type: 'manufacturer' | 'expert' | 'editorial';
  nose_text: string | null;
  palate_text: string | null;
  finish_text: string | null;
  overall_text: string | null;
  tasted_at: string | null;
  language: string;
  source: { source_name: string; canonical_url: string | null; attribution_text: string | null };
};

type PublicSourceRow = {
  product_id: string;
  field_path: string;
  source_id: string;
  source_name: string;
  canonical_url: string | null;
  attribution_text: string | null;
};

type CategoryRow = { slug: string; name_de: string };

function unconfiguredResult(query: CatalogQuery, message: string, status: 'unconfigured' | 'error'): CatalogResult {
  return {
    status,
    mode: status === 'error' ? 'supabase' : 'unconfigured',
    message,
    products: [],
    categories: [],
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
    abvPercent: row.abv_percent,
    description: row.description,
    flavors: [],
    tastingNotes: [],
    sources: [],
    dataOrigin: 'verified',
  };
}

function fromDetailRow(row: DetailRow): CatalogProduct {
  return fromSearchRow({
    ...row,
    brand_name: row.brand.name,
    brand_slug: row.brand.slug,
    category_id: row.primary_category_id,
    category_name_de: row.category.name_de,
    category_slug: row.category.slug,
    total_count: 1,
  });
}

function filterFixtures(products: CatalogProduct[], query: CatalogQuery): CatalogProduct[] {
  const term = normalizeSearchTerm(query.q);
  return products.filter((product) => {
    const searchable = normalizeSearchTerm(`${product.name} ${product.brandName ?? ''} ${product.categoryName}`);
    if (term && !searchable.includes(term)) return false;
    if (query.category && product.categorySlug !== query.category) return false;
    if (query.flavor && !product.flavors.some((flavor) => flavor.code === query.flavor)) return false;
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
    source.fields.push(row.field_path);
    grouped.set(row.source_id, source);
  }
  return [...grouped.values()].map((source) => ({
    ...source,
    fields: [...new Set(source.fields)].sort(),
  }));
}

function mapNotes(rows: NoteRow[]): TastingNote[] {
  return rows.map((row) => ({
    id: row.id,
    authorLabel: row.author_label,
    authorType: row.author_type,
    nose: row.nose_text,
    palate: row.palate_text,
    finish: row.finish_text,
    overall: row.overall_text,
    sourceName: row.source.source_name,
    sourceUrl: row.source.canonical_url,
    attribution: row.source.attribution_text,
    language: row.language,
  }));
}

async function getDatabaseCategories(client: NonNullable<ReturnType<typeof createCatalogClient>>): Promise<CatalogCategory[]> {
  const { data, error } = await client.from('categories').select('slug,name_de').eq('active', true).order('sort_order');
  if (error || !data) throw new Error('category_query_failed');
  return (data as unknown as CategoryRow[]).map((row) => ({ slug: row.slug, name: row.name_de }));
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
    return {
      status: 'ready',
      mode: 'supabase',
      message: null,
      products: rows.map(fromSearchRow),
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
      .select('id,slug,name,brand_id,brand:brands!inner(name,slug),primary_category_id,category:categories!inner(name_de,slug),product_family,origin_country_code,origin_region,age_years,abv_percent,description')
      .eq('slug', slug)
      .maybeSingle();
    if (error) return { status: 'error', mode: 'supabase', message: 'Das Produkt konnte nicht geladen werden.', product: null };
    if (!data) return { status: 'ready', mode: 'supabase', message: null, product: null };

    const row = data as unknown as DetailRow;
    const product = fromDetailRow(row);
    const [flavorResult, noteResult, sourceResult] = await Promise.all([
      client.from('product_flavor_values')
        .select('product_id,value,method,verified_at,dimension:flavor_dimensions!inner(code,label_de)')
        .eq('product_id', product.id),
      client.from('tasting_notes')
        .select('id,product_id,author_label,author_type,nose_text,palate_text,finish_text,overall_text,tasted_at,language,source:sources!inner(source_name,canonical_url,attribution_text)')
        .eq('product_id', product.id),
      client.from('product_public_sources')
        .select('product_id,field_path,source_id,source_name,canonical_url,attribution_text')
        .eq('product_id', product.id),
    ]);

    if (flavorResult.error || noteResult.error || sourceResult.error) {
      return { status: 'error', mode: 'supabase', message: 'Produktnachweise konnten nicht vollständig geladen werden.', product: null };
    }

    product.flavors = mapFlavorRows((flavorResult.data ?? []) as unknown as FlavorRow[], product.id);
    product.tastingNotes = mapNotes((noteResult.data ?? []) as unknown as NoteRow[]);
    product.sources = mapSources((sourceResult.data ?? []) as unknown as PublicSourceRow[]);
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
  if (config.mode !== 'supabase' || product.dataOrigin !== 'verified') return [];

  const client = createCatalogClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('products')
      .select('id,slug,name,brand_id,brand:brands!inner(name,slug),primary_category_id,category:categories!inner(name_de,slug),product_family,origin_country_code,origin_region,age_years,abv_percent,description')
      .order('name')
      .limit(MAX_RECOMMENDATION_CANDIDATES);
    if (error || !data || data.length === 0) return [];

    const products = (data as unknown as DetailRow[]).map(fromDetailRow);
    const ids = products.map((item) => item.id);
    const flavorResult = await client
      .from('product_flavor_values')
      .select('product_id,value,method,verified_at,dimension:flavor_dimensions!inner(code,label_de)')
      .in('product_id', ids);
    if (flavorResult.error) return [];

    const flavorRows = (flavorResult.data ?? []) as unknown as FlavorRow[];
    for (const candidate of products) {
      candidate.flavors = mapFlavorRows(flavorRows, candidate.id);
    }
    return getSimilarRecommendations(product, products);
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
  if (mode === 'supabase') return { label: 'Geprüfter Katalog', isSynthetic: false };
  return { label: 'Datenquelle nicht verbunden', isSynthetic: false };
}
