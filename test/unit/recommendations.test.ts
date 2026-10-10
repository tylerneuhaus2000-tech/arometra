import { describe, expect, it } from 'vitest';
import { fixtureProducts } from '@test/fixtures/catalog';
import { getSimilarRecommendations } from '@/lib/catalog/recommendations';

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
});
