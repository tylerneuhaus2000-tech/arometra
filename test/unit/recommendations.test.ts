import { describe, expect, it } from 'vitest';
import { fixtureProducts } from '@test/fixtures/catalog';
import { getSimilarRecommendations } from '@/lib/catalog/recommendations';

function localProfile(slug: string, categorySlug: string, tags: string[]) {
  return {
    ...fixtureProducts[0],
    id: slug,
    slug,
    name: slug,
    brandSlug: slug,
    categorySlug,
    dataOrigin: 'unreviewed' as const,
    flavors: [],
    qualitativeFlavors: tags.map((code) => ({ code, label: code })),
  };
}

function verifiedProfile(slug: string, categorySlug: string, tags: string[], scores: Array<[string, number]> = []) {
  return {
    ...fixtureProducts[0],
    id: slug,
    slug,
    name: slug,
    brandSlug: slug,
    categorySlug,
    dataOrigin: 'verified' as const,
    qualitativeFlavors: [],
    flavors: scores.map(([code, value]) => ({
      code,
      label: code,
      value,
      method: 'expert',
      sourceName: 'TEST ONLY — source',
      sourceUrl: null,
      verifiedAt: '2026-10-10',
      dataOrigin: 'verified' as const,
    })),
    sensoryTags: tags.map((code) => ({
      code,
      label: code,
      evidenceType: 'manufacturer' as const,
      categoryId: `profile-${categorySlug}`,
      sourceName: 'TEST ONLY — source',
      sourceUrl: null,
    })),
  };
}

describe('explainable recommendations', () => {
  it('is deterministic and explains only shared test features', () => {
    const alpha = fixtureProducts[0];
    const first = getSimilarRecommendations(alpha, fixtureProducts);
    const second = getSimilarRecommendations(alpha, fixtureProducts);
    expect(first.map((item) => item.product.id)).toEqual(second.map((item) => item.product.id));
    expect(first.map((item) => item.product.id)).toEqual(['fixture-profile-b']);
    expect(first[0].reason).toContain('Prüfmerkmal');
    expect(first[0].reason).not.toMatch(/%|Match/i);
  });

  it('does not recommend the source or profiles with fewer than three shared dimensions', () => {
    const alpha = fixtureProducts[0];
    const recommendations = getSimilarRecommendations(alpha, [alpha, fixtureProducts[2]]);
    expect(recommendations).toEqual([]);
  });

  it('does not mix synthetic fixtures into verified product recommendations', () => {
    const synthetic = fixtureProducts[0];
    const verified = { ...fixtureProducts[1], id: 'verified-id', dataOrigin: 'verified' as const };
    expect(getSimilarRecommendations(synthetic, [verified])).toEqual([]);
  });

  it('returns no results for a zero or negative result limit', () => {
    expect(getSimilarRecommendations(fixtureProducts[0], fixtureProducts, 0)).toEqual([]);
    expect(getSimilarRecommendations(fixtureProducts[0], fixtureProducts, -1)).toEqual([]);
  });

  it('prefers source backed similarities within the same spirit family', () => {
    const source = localProfile('islay-one', 'whisky-scotch', ['rauchig', 'torfig', 'zitrus']);
    const relatedWhisky = localProfile('islay-two', 'whisky-scotch', ['rauchig', 'torfig', 'salzig']);
    const genericRum = localProfile('sweet-rum', 'rum-aged', ['fruchtig', 'suess', 'vanille']);
    const results = getSimilarRecommendations(source, [genericRum, relatedWhisky]);
    expect(results.map((item) => item.product.slug)).toEqual(['islay-two']);
    expect(results[0].reason).toContain('rauchig');
    expect(results[0].reason).not.toMatch(/%|Match/i);
  });

  it('requires several distinctive shared traits before crossing spirit families', () => {
    const source = localProfile('dry-gin', 'gin-london-dry', ['zitrus', 'floral', 'wuerzig', 'wacholder']);
    const genericRum = localProfile('generic-rum', 'rum-aged', ['fruchtig', 'suess', 'vanille']);
    const borderlineRum = localProfile('borderline-rum', 'rum-white', ['zitrus', 'floral', 'wuerzig']);
    const alignedRum = localProfile('citrus-rum', 'rum-white', ['zitrus', 'floral', 'wuerzig', 'wacholder']);
    expect(getSimilarRecommendations(source, [genericRum])).toEqual([]);
    expect(getSimilarRecommendations(source, [borderlineRum])).toEqual([]);
    expect(getSimilarRecommendations(source, [genericRum, alignedRum]).map((item) => item.product.slug)).toEqual(['citrus-rum']);
  });

  it('requires stronger evidence across spirit styles within one family', () => {
    const source = localProfile('scotch-source', 'whisky-scotch', ['rauchig', 'torfig', 'salzig', 'zitrus']);
    const borderlineAmerican = localProfile('borderline-american', 'whisky-american', ['zitrus', 'salzig', 'vanille']);
    const alignedAmerican = localProfile('aligned-american', 'whisky-american', ['rauchig', 'torfig', 'salzig', 'zitrus']);
    expect(getSimilarRecommendations(source, [borderlineAmerican])).toEqual([]);
    expect(getSimilarRecommendations(source, [borderlineAmerican, alignedAmerican]).map((item) => item.product.slug)).toEqual(['aligned-american']);
  });

  it('uses documented aroma tags for cross-category similarity and explains the overlap', () => {
    const source = verifiedProfile('dry-gin', 'gin-london-dry', ['zitrus', 'floral', 'wuerzig', 'wacholder']);
    const weakRum = verifiedProfile('weak-rum', 'rum-white', ['zitrus', 'floral']);
    const similarRum = verifiedProfile('similar-rum', 'rum-white', ['zitrus', 'floral', 'wuerzig', 'wacholder']);
    const recommendations = getSimilarRecommendations(source, [weakRum, similarRum]);

    expect(recommendations.map((item) => item.product.slug)).toEqual(['similar-rum']);
    expect(recommendations[0].reason).toContain('zitrus');
    expect(recommendations[0].reason).not.toMatch(/%|Match/i);
  });

  it('does not compare raw numeric scales across spirit categories', () => {
    const source = verifiedProfile('cognac-a', 'cognac', [], [['sweet', 5], ['smoky', 3], ['fruity', 6]]);
    const unrelated = verifiedProfile('gin-a', 'gin', [], [['sweet', 5], ['smoky', 3], ['fruity', 6]]);

    expect(getSimilarRecommendations(source, [unrelated])).toEqual([]);
  });
});
