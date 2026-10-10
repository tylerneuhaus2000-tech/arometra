import { fixtureProducts } from '@test/fixtures/catalog';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TasteProfile } from '@/components/taste-profile';

describe('category-specific taste profile', () => {
  it('uses supplied category dimensions and leaves unmeasured scales visibly unrated', () => {
    const product = {
      ...fixtureProducts[0],
      categoryName: 'Cognac',
      sensoryProfile: [{
        code: 'co_rancio',
        label: 'Rancio / Reifekomplexität',
        semanticFamily: 'maturity',
        displayOrder: 1,
        descriptors: [{
          code: 'getrocknete-fruechte',
          label: 'Trockenfrüchte',
          evidenceType: 'manufacturer' as const,
          stage: 'nose' as const,
          sourceName: 'TEST ONLY — Beispielquelle',
          sourceUrl: null,
          verifiedAt: null,
        }],
        intensity: null,
        measurementMethod: null,
        measurementEvidenceType: null,
        measurementSourceName: null,
        measurementSourceUrl: null,
        measurementVerifiedAt: null,
      }],
    };
    const html = renderToStaticMarkup(<TasteProfile product={product} />);

    expect(html).toContain('Rancio / Reifekomplexität');
    expect(html).toContain('Trockenfrüchte');
    expect(html).not.toContain('TEST ONLY — Beispielquelle');
    expect(html).not.toContain('Herstellerangabe');
    expect(html).toContain('Unbewertet');
    expect(html).not.toContain('<meter');
    expect(html).toContain('taste-profile__track--unrated');
    expect(html).not.toContain('Rauch</span>');
  });

  it('renders a zero only when an approved numeric measurement exists', () => {
    const product = {
      ...fixtureProducts[0],
      sensoryProfile: [{
        code: 'gin_juniper',
        label: 'Wacholder',
        semanticFamily: 'botanical',
        displayOrder: 1,
        descriptors: [],
        intensity: 0,
        measurementMethod: 'Kontrollierte Verkostung',
        measurementEvidenceType: 'expert' as const,
        measurementSourceName: 'TEST ONLY — Prüfquelle',
        measurementSourceUrl: null,
        measurementVerifiedAt: '2026-10-10',
      }],
    };
    const html = renderToStaticMarkup(<TasteProfile product={product} />);

    expect(html).toContain('0/10');
    expect(html).toContain('<meter');
    expect(html).toContain('value="0"');
  });
});
