export type DataMode = 'fixtures' | 'supabase' | 'local-start-database' | 'unconfigured';
export type ResultStatus = 'ready' | 'unconfigured' | 'error';

export type CatalogCategory = {
  slug: string;
  name: string;
  parentSlug: string | null;
};

export type ProductSourceField = {
  path: string;
  verifiedAt: string | null;
};

export type ProductFlavorValue = {
  code: string;
  label: string;
  value: number;
  method: string;
  sourceName: string;
  sourceUrl: string | null;
  verifiedAt: string | null;
  dataOrigin: 'verified' | 'synthetic';
};

export type ProductSource = {
  id: string;
  name: string;
  url: string | null;
  attribution: string | null;
  fields: ProductSourceField[];
};

export type CatalogVariant = {
  id: string;
  gtin: string | null;
  volumeMl: number | null;
  marketCountryCode: string | null;
  abvPercentOverride: number | null;
  editionLabel: string | null;
  sources: ProductSource[];
};

export type TastingNote = {
  id: string;
  authorLabel: string | null;
  authorType: 'manufacturer' | 'expert' | 'editorial' | 'consumer';
  nose: string | null;
  palate: string | null;
  mouthfeel: string | null;
  finish: string | null;
  overall: string | null;
  sourceName: string;
  sourceUrl: string | null;
  attribution: string | null;
  language: string;
  tastedAt: string | null;
};

export type ProductSensoryDescriptor = {
  code: string;
  label: string;
  evidenceType: 'expert' | 'editorial' | 'manufacturer' | 'community_aggregated';
  stage: 'unspecified' | 'nose' | 'palate' | 'finish';
  sourceName: string;
  sourceUrl: string | null;
  verifiedAt: string | null;
};

export type ProductSensoryDimension = {
  code: string;
  label: string;
  semanticFamily: string;
  displayOrder: number;
  descriptors: ProductSensoryDescriptor[];
  intensity: number | null;
  measurementMethod: string | null;
  measurementEvidenceType: 'expert' | 'editorial' | 'manufacturer' | 'community_aggregated' | null;
  measurementSourceName: string | null;
  measurementSourceUrl: string | null;
  measurementVerifiedAt: string | null;
};

export type ProductSensoryTag = {
  code: string;
  label: string;
  evidenceType: 'expert' | 'editorial' | 'manufacturer' | 'community_aggregated';
  categoryId: string;
  sourceName: string;
  sourceUrl: string | null;
};

export type CommunityReview = {
  id: string;
  displayName: string | null;
  rating: number;
  nose: string | null;
  palate: string | null;
  finish: string | null;
  overall: string | null;
  verifiedPurchase: boolean;
  createdAt: string;
};

export type ProductImage = {
  id?: string;
  src: string;
  altText: string;
  sourceName: string;
  sourceUrl: string;
  sourcePageUrl: string | null;
  attribution: string | null;
  rightsStatus: 'approved' | 'unverified';
  localOnly: boolean;
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
  distillationDetails: string | null;
  maturationDetails: string | null;
  abvPercent: number | null;
  description: string | null;
  image?: ProductImage | null;
  flavors: ProductFlavorValue[];
  sensoryProfile: ProductSensoryDimension[];
  sensoryTags: ProductSensoryTag[];
  qualitativeFlavors?: Array<{ code: string; label: string }>;
  variants: CatalogVariant[];
  tastingNotes: TastingNote[];
  communityReviews: CommunityReview[];
  sources: ProductSource[];
  dataOrigin: 'verified' | 'synthetic' | 'unreviewed';
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
