export type PublicSupabaseConfiguration = {
  url: string;
  publishableKey: string;
};

export function hasSafeSupabasePublishableKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return false;
  if (key.startsWith('sb_publishable_')) return true;

  const segments = key.split('.');
  if (segments.length !== 3) return false;
  try {
    const claims = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8')) as { role?: unknown };
    return claims.role === 'anon';
  } catch {
    return false;
  }
}

export function parsePublicSupabaseConfiguration(
  environment: Record<string, string | undefined>,
  nodeEnvironment = 'development',
): PublicSupabaseConfiguration | null {
  const rawUrl = environment.SUPABASE_URL;
  const publishableKey = environment.SUPABASE_PUBLISHABLE_KEY;
  if (!rawUrl || !publishableKey || !hasSafeSupabasePublishableKey(publishableKey)) return null;

  try {
    const url = new URL(rawUrl);
    const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    if (url.protocol !== 'https:' && !(nodeEnvironment !== 'production' && localHost && url.protocol === 'http:')) return null;
    return { url: url.toString().replace(/\/$/, ''), publishableKey };
  } catch {
    return null;
  }
}
