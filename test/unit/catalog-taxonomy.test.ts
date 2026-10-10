import { describe, expect, it } from 'vitest';
import { navigationTaxonomy } from '@/lib/catalog/taxonomy';

describe('catalog navigation taxonomy', () => {
  it('contains the 14 catalog roots and the seeded subcategories', () => {
    const roots = navigationTaxonomy.filter((category) => category.parentSlug === null);
    expect(roots.map((category) => category.slug)).toEqual([
      'whisky', 'rum', 'gin', 'wodka', 'tequila', 'mezcal', 'cognac-brandy', 'likoere',
      'grappa', 'pisco', 'baijiu', 'soju-shochu', 'aquavit', 'obstbraende',
    ]);
    expect(navigationTaxonomy).toHaveLength(47);
  });

  it('keeps every child connected to a real navigation root without duplicate slugs', () => {
    const slugs = new Set(navigationTaxonomy.map((category) => category.slug));
    expect(slugs.size).toBe(navigationTaxonomy.length);
    for (const category of navigationTaxonomy.filter((item) => item.parentSlug !== null)) {
      expect(slugs.has(category.parentSlug ?? '')).toBe(true);
      expect(navigationTaxonomy.find((item) => item.slug === category.parentSlug)?.parentSlug).toBeNull();
    }
  });
});
