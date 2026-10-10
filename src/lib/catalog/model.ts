export type DataMode = 'fixtures' | 'supabase' | 'unconfigured';
export type ResultStatus = 'ready' | 'unconfigured' | 'error';

export type CatalogCategory = {
  slug: string;
  name: string;
};

export type ProductFlavorValue = {
  code: string;
  label: string;
  value: number;
  method: string;
  dataOrigin: 'verified' | 'synthetic';
};

export type ProductSource = {
  id: string;
  name: string;
  url: string | null;
  attribution: string | null;
  fields: string[];
};

export type TastingNote = {
  id: string;
  authorLabel: string | null;
  authorType: 'manufacturer' | 'expert' | 'editorial';
  nose: string | null;
  palate: string | null;
  finish: string | null;
  overall: string | null;
  sourceName: string;
  sourceUrl: string | null;
  attribution: string | null;
  language: string;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  brandName: string | null;
  brandSlug: string | null;
  categoryName: string;
  categorySlug: string;
  family: string | null;
  countryCode: string | null;
  region: string | null;
  ageYears: number | null;
  abvPercent: number | null;
  description: string | null;
  flavors: ProductFlavorValue[];
  tastingNotes: TastingNote[];
  sources: ProductSource[];
  dataOrigin: 'verified' | 'synthetic';
};

export type CatalogQuery = {
  q: string;
  category: string;
  flavor: string;
  country: string;
  brand: string;
  page: number;
};

export type CatalogResult = {
  status: ResultStatus;
  mode: DataMode;
  message: string | null;
  products: CatalogProduct[];
  categories: CatalogCategory[];
  page: number;
  pageSize: number;
  total: number;
};

export type ProductResult = {
  status: ResultStatus;
  mode: DataMode;
  message: string | null;
  product: CatalogProduct | null;
};

export type SimilarRecommendation = {
  product: CatalogProduct;
  reason: string;
  evidenceLabels: string[];
};
