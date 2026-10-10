import { describe, expect, it } from 'vitest';
import { hasSafeSupabasePublishableKey, parsePublicSupabaseConfiguration } from '@/lib/supabase/configuration';

function legacyKey(role: 'anon' | 'service_role'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ role })).toString('base64url');
  return `${header}.${payload}.signature`;
}

describe('Supabase runtime configuration checks', () => {
  it('accepts publishable and legacy anon keys but rejects secret/service-role keys', () => {
    expect(hasSafeSupabasePublishableKey('sb_publishable_test_only')).toBe(true);
    expect(hasSafeSupabasePublishableKey(legacyKey('anon'))).toBe(true);
    expect(hasSafeSupabasePublishableKey('sb_secret_test_only')).toBe(false);
    expect(hasSafeSupabasePublishableKey(legacyKey('service_role'))).toBe(false);
    expect(hasSafeSupabasePublishableKey('unrecognized-key-value')).toBe(false);
  });

  it('requires HTTPS for hosted Supabase and permits loopback HTTP only outside production', () => {
    const base = { SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only' };
    expect(parsePublicSupabaseConfiguration({ ...base, SUPABASE_URL: 'https://dev-project.supabase.co' }, 'production')?.url)
      .toBe('https://dev-project.supabase.co');
    expect(parsePublicSupabaseConfiguration({ ...base, SUPABASE_URL: 'http://localhost:54321' }, 'development')?.url)
      .toBe('http://localhost:54321');
    expect(parsePublicSupabaseConfiguration({ ...base, SUPABASE_URL: 'http://db.example.test' }, 'development')).toBeNull();
    expect(parsePublicSupabaseConfiguration({ ...base, SUPABASE_URL: 'http://localhost:54321' }, 'production')).toBeNull();
  });

  it('rejects URL credentials, query strings, and non-root endpoints', () => {
    const key = 'sb_publishable_test_only';
    expect(parsePublicSupabaseConfiguration({ SUPABASE_URL: 'https://user:pass@dev.supabase.co', SUPABASE_PUBLISHABLE_KEY: key })).toBeNull();
    expect(parsePublicSupabaseConfiguration({ SUPABASE_URL: 'https://dev.supabase.co?secret=1', SUPABASE_PUBLISHABLE_KEY: key })).toBeNull();
    expect(parsePublicSupabaseConfiguration({ SUPABASE_URL: 'https://dev.supabase.co/rest/v1', SUPABASE_PUBLISHABLE_KEY: key })).toBeNull();
  });
});
