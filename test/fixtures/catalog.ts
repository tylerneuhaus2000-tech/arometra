import type { CatalogCategory, CatalogProduct } from '@/lib/catalog/model';
import { navigationTaxonomy } from '@/lib/catalog/taxonomy';

// These are deliberately generic algorithm fixtures, not spirit products or tasting claims.
export const fixtureModeNotice =
  'Lokaler Testmodus: synthetische Prüfprofile, keine realen Produkt- oder Verkostungsangaben.';

export const fixtureQrCode = 'fixture000000000000000000001';
export const fixtureDisabledQrCode = 'fixture000000000000000000000';

export const fixtureCategories: CatalogCategory[] = navigationTaxonomy satisfies CatalogCategory[];

function createFixture(
  id: string,
  slug: string,
  name: string,
  values: Array<[string, string, number]>,
): CatalogProduct {
  return {
    id,
    slug,
    name,
    brandName: null,
    brandSlug: null,
    categoryName: 'Synthetische Testprofile',
    categorySlug: 'testprofile',
    family: 'Prüfdatensatz',
    countryCode: null,
    region: null,
    ageYears: null,
    distillationDetails: null,
    maturationDetails: null,
    abvPercent: null,
    description: 'Synthetischer Datensatz zur Prüfung von Suche und Empfehlungslogik.',
    flavors: values.map(([code, label, value]) => ({
      code,
      label,
      value,
      method: 'synthetic_test',
      sourceName: 'Synthetischer Test',
      sourceUrl: null,
      verifiedAt: null,
      dataOrigin: 'synthetic',
    })),
    variants: [],
    tastingNotes: [],
    sources: [],
    dataOrigin: 'synthetic',
  };
}

export const fixtureProducts: CatalogProduct[] = [
  createFixture('fixture-profile-a', 'synthetisches-pruefprofil-alpha', 'Synthetisches Prüfprofil Alpha', [
    ['test_a', 'Prüfmerkmal A', 7],
    ['test_b', 'Prüfmerkmal B', 3],
    ['test_c', 'Prüfmerkmal C', 8],
    ['test_d', 'Prüfmerkmal D', 4],
  ]),
  createFixture('fixture-profile-b', 'synthetisches-pruefprofil-beta', 'Synthetisches Prüfprofil Beta', [
    ['test_a', 'Prüfmerkmal A', 6],
    ['test_b', 'Prüfmerkmal B', 3],
    ['test_c', 'Prüfmerkmal C', 8],
    ['test_d', 'Prüfmerkmal D', 4],
  ]),
  createFixture('fixture-profile-c', 'synthetisches-pruefprofil-gamma', 'Synthetisches Prüfprofil Gamma', [
    ['test_a', 'Prüfmerkmal A', 6],
    ['test_b', 'Prüfmerkmal B', 3],
  ]),
];
