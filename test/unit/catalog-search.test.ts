import { describe, expect, it } from 'vitest';
import { normalizeSearchTerm, parseCatalogQuery } from '@/lib/catalog/search';

describe('catalog query parsing', () => {
  it('normalizes apostrophe aliases without creating product records', () => {
    expect(normalizeSearchTerm("Teacher's")).toBe('teachers');
    expect(normalizeSearchTerm('Teachers')).toBe('teachers');
  });

  it('normalizes diacritics consistently', () => {
    expect(normalizeSearchTerm('Żubrówka')).toBe('zubrowka');
  });

  it('accepts a safe query and bounded pagination', () => {
    const parsed = parseCatalogQuery({ q: "Teacher's", page: '2', category: 'whisky' });
    expect(parsed.invalid).toBe(false);
    expect(parsed.query).toMatchObject({ q: "Teacher's", page: 2, category: 'whisky' });
  });

  it('rejects filter syntax and resets the full query instead of building raw database filters', () => {
    const parsed = parseCatalogQuery({ q: 'Gin),id.neq.null', page: '1' });
    expect(parsed.invalid).toBe(true);
    expect(parsed.query.q).toBe('');
    expect(parsed.query.page).toBe(1);
  });
});
