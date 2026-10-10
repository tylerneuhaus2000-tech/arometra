import type { CatalogProduct, SimilarRecommendation } from './model';
import { navigationTaxonomy } from './taxonomy';

const MINIMUM_SHARED_DIMENSIONS = 3;
const MAX_DIMENSION_DISTANCE = 2;
const BROAD_FLAVOR_TAGS = new Set(['fruchtig', 'suess', 'vanille', 'holzig', 'malzig']);

function categoryRoot(slug: string): string {
  let category = navigationTaxonomy.find((item) => item.slug === slug);
  if (!category) return slug;
  while (category.parentSlug) {
    const parent = navigationTaxonomy.find((item) => item.slug === category?.parentSlug);
    if (!parent) break;
    category = parent;
  }
  return category.slug;
}

export function getSimilarRecommendations(
  source: CatalogProduct,
  candidates: CatalogProduct[],
  limit = 3,
): SimilarRecommendation[] {
  const maxResults = Number.isFinite(limit) ? Math.max(0, Math.min(3, Math.floor(limit))) : 0;
  if (maxResults === 0) return [];

  if (source.dataOrigin === 'unreviewed') {
    const sourceTags = new Map((source.qualitativeFlavors ?? []).map((tag) => [tag.code, tag.label]));
    const rankedLocal = candidates
      .filter((candidate) => candidate.id !== source.id && candidate.slug !== source.slug && candidate.dataOrigin === 'unreviewed')
      .map((product) => {
        const shared = (product.qualitativeFlavors ?? []).filter((tag) => sourceTags.has(tag.code));
        const sharedSpecific = shared.filter((tag) => !BROAD_FLAVOR_TAGS.has(tag.code));
        const sameCategory = product.categorySlug === source.categorySlug;
        const sameCategoryFamily = categoryRoot(product.categorySlug) === categoryRoot(source.categorySlug);
        const minimumShared = sameCategory ? 2 : sameCategoryFamily ? 3 : 4;
        const minimumSpecific = sameCategory ? 1 : sameCategoryFamily ? 2 : 3;
        if (shared.length < minimumShared || sharedSpecific.length < minimumSpecific) return null;

        const evidenceLabels = shared
          .slice()
          .sort((left, right) => Number(BROAD_FLAVOR_TAGS.has(left.code)) - Number(BROAD_FLAVOR_TAGS.has(right.code)))
          .slice(0, 3)
          .map((tag) => tag.label);
        return {
          product,
          evidenceLabels,
          reason: `Gemeinsame, ungeprüfte Herstellermerkmale: ${evidenceLabels.join(' · ')}.`,
          sharedCount: shared.length,
          specificCount: sharedSpecific.length,
          categoryRank: sameCategory ? 0 : sameCategoryFamily ? 1 : 2,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((left, right) =>
        left.categoryRank - right.categoryRank
        || right.specificCount - left.specificCount
        || right.sharedCount - left.sharedCount
        || left.product.name.localeCompare(right.product.name, 'de'),
      );
    const selected: SimilarRecommendation[] = [];
    const seenBrands = new Set<string>();
    for (const item of rankedLocal) {
      const identity = item.product.brandSlug ?? item.product.id;
      if (seenBrands.has(identity)) continue;
      seenBrands.add(identity);
      selected.push({ product: item.product, evidenceLabels: item.evidenceLabels, reason: item.reason });
      if (selected.length >= maxResults) break;
    }
    return selected;
  }

  const sourceValues = new Map(source.flavors.map((item) => [item.code, item]));
  const ranked = candidates
    .filter((candidate) => candidate.id !== source.id && candidate.slug !== source.slug)
    .filter((candidate) => candidate.dataOrigin === source.dataOrigin)
    .map((product) => {
      const sameCategory = product.categorySlug === source.categorySlug;
      if (source.dataOrigin === 'verified' && !sameCategory) return null;
      const shared = product.flavors.flatMap((value) => {
        const sourceValue = sourceValues.get(value.code);
        if (!sourceValue || value.dataOrigin !== sourceValue.dataOrigin) return [];
        return [{ sourceValue, value, distance: Math.abs(sourceValue.value - value.value) }];
      });

      if (shared.length < MINIMUM_SHARED_DIMENSIONS) return null;

      const closeFeatures = shared
        .filter((item) => item.distance <= MAX_DIMENSION_DISTANCE)
        .sort((left, right) => left.distance - right.distance || left.value.code.localeCompare(right.value.code));

      if (closeFeatures.length === 0) return null;

      const meanDistance = shared.reduce((total, item) => total + item.distance, 0) / shared.length;
      const evidenceLabels = closeFeatures.slice(0, 2).map((item) => item.sourceValue.label);
      const reason = source.dataOrigin === 'synthetic'
        ? `Gemeinsame Testmerkmale: ${evidenceLabels.join(' und ')}.`
        : `Ähnlich durch belegte Überschneidungen bei ${evidenceLabels.join(' und ')}.`;

      return { product, meanDistance, reason, evidenceLabels };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) =>
      left.meanDistance - right.meanDistance || left.product.name.localeCompare(right.product.name, 'de'),
    );

  const numericRecommendations: SimilarRecommendation[] = [];
  const seenBrands = new Set<string>();

  for (const item of ranked) {
    const identity = item.product.brandSlug ?? item.product.id;
    if (seenBrands.has(identity)) continue;
    seenBrands.add(identity);
    numericRecommendations.push({
      product: item.product,
      reason: item.reason,
      evidenceLabels: item.evidenceLabels,
    });
    if (numericRecommendations.length >= maxResults) break;
  }

  if (source.dataOrigin !== 'verified') return numericRecommendations;

  const sourceTags = new Map(source.sensoryTags.map((tag) => [tag.code, tag.label]));
  const rankedByTags = candidates
    .filter((candidate) => candidate.id !== source.id && candidate.slug !== source.slug && candidate.dataOrigin === 'verified')
    .map((product) => {
      const shared = product.sensoryTags
        .filter((tag) => sourceTags.has(tag.code))
        .map((tag) => ({ code: tag.code, label: sourceTags.get(tag.code) ?? tag.label }));
      const specific = shared.filter((tag) => !BROAD_FLAVOR_TAGS.has(tag.code));
      const sameCategory = product.categorySlug === source.categorySlug;
      const sameFamily = categoryRoot(product.categorySlug) === categoryRoot(source.categorySlug);
      const minShared = sameCategory ? 2 : 3;
      const minSpecific = sameCategory ? 1 : 2;
      if (shared.length < minShared || specific.length < minSpecific) return null;
      const evidenceLabels = specific.slice(0, 3).map((tag) => tag.label);
      return {
        product,
        evidenceLabels,
        sameCategoryRank: sameCategory ? 0 : sameFamily ? 1 : 2,
        sharedCount: shared.length,
        specificCount: specific.length,
        reason: `Ähnliche, belegte Aromamerkmale: ${evidenceLabels.join(' · ')}.`,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) =>
      left.sameCategoryRank - right.sameCategoryRank
      || right.specificCount - left.specificCount
      || right.sharedCount - left.sharedCount
      || left.product.name.localeCompare(right.product.name, 'de'),
    );

  const selected: SimilarRecommendation[] = [];
  const selectedBrands = new Set<string>();
  const selectedIds = new Set<string>();
  for (const item of rankedByTags) {
    const brand = item.product.brandSlug ?? item.product.id;
    if (selectedBrands.has(brand)) continue;
    selected.push({ product: item.product, evidenceLabels: item.evidenceLabels, reason: item.reason });
    selectedBrands.add(brand);
    selectedIds.add(item.product.id);
    if (selected.length >= maxResults) break;
  }
  if (selected.length < maxResults) {
    for (const item of numericRecommendations) {
      const brand = item.product.brandSlug ?? item.product.id;
      if (selectedBrands.has(brand) || selectedIds.has(item.product.id)) continue;
      selected.push(item);
      selectedBrands.add(brand);
      selectedIds.add(item.product.id);
      if (selected.length >= maxResults) break;
    }
  }
  return selected;
}
