export type PublicSupabaseConfiguration = {
  url: string;
  publishableKey: string;
};

export type PublicSupabaseEnvironment = {
  url: string | undefined;
  publishableKey: string | undefined;
};

function resolveAlias(primary: string | undefined, publicAlias: string | undefined): string | undefined {
  const values = [primary, publicAlias].filter((value): value is string => Boolean(value?.trim()));
  if (values.length === 2 && values[0] !== values[1]) return undefined;
  return values[0];
}

export function readPublicSupabaseEnvironment(
  environment: Record<string, string | undefined>,
): PublicSupabaseEnvironment {
  return {
    url: resolveAlias(environment.SUPABASE_URL, environment.NEXT_PUBLIC_SUPABASE_URL),
    publishableKey: resolveAlias(environment.SUPABASE_PUBLISHABLE_KEY, environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  };
}

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
  const { url: rawUrl, publishableKey } = readPublicSupabaseEnvironment(environment);
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
