import type { CatalogProduct, SimilarRecommendation } from './model';

const MINIMUM_SHARED_DIMENSIONS = 3;
const MAX_DIMENSION_DISTANCE = 2;

export function getSimilarRecommendations(
  source: CatalogProduct,
  candidates: CatalogProduct[],
  limit = 3,
): SimilarRecommendation[] {
  const maxResults = Number.isFinite(limit) ? Math.max(0, Math.min(3, Math.floor(limit))) : 0;
  if (maxResults === 0) return [];
  const sourceValues = new Map(source.flavors.map((item) => [item.code, item]));
  const ranked = candidates
    .filter((candidate) => candidate.id !== source.id && candidate.slug !== source.slug)
    .filter((candidate) => candidate.dataOrigin === source.dataOrigin)
    .map((product) => {
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

  const selected: SimilarRecommendation[] = [];
  const seenBrands = new Set<string>();

  for (const item of ranked) {
    const identity = item.product.brandSlug ?? item.product.id;
    if (seenBrands.has(identity)) continue;
    seenBrands.add(identity);
    selected.push({
      product: item.product,
      reason: item.reason,
      evidenceLabels: item.evidenceLabels,
    });
    if (selected.length >= maxResults) break;
  }

  return selected;
}
