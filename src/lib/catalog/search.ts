import { z } from 'zod';
import type { CatalogQuery } from './model';

const querySchema = z.object({
  q: z.string().trim().max(80).regex(/^[\p{L}\p{N}\s.'’&/-]*$/u).optional().default(''),
  category: z.string().max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).optional().default(''),
  flavor: z.string().max(80).regex(/^[a-z][a-z0-9_]*$/).optional().default(''),
  country: z.string().max(2).regex(/^[A-Z]{2}$/).optional().default(''),
  brand: z.string().max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).optional().default(''),
  page: z.coerce.number().int().min(1).max(100).optional().default(1),
});

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseCatalogQuery(params: RawSearchParams): { query: CatalogQuery; invalid: boolean } {
  const parsed = querySchema.safeParse({
    q: first(params.q),
    category: first(params.category),
    flavor: first(params.flavor),
    country: first(params.country),
    brand: first(params.brand),
    page: first(params.page),
  });

  if (!parsed.success) {
    return {
      query: { q: '', category: '', flavor: '', country: '', brand: '', page: 1 },
      invalid: true,
    };
  }

  return { query: parsed.data, invalid: false };
}

export function normalizeSearchTerm(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('de-DE')
    .replace(/ß/g, 'ss')
    .replace(/[’']/g, '')
    .trim();
}
