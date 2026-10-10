import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getRuntimeConfig } from '@/lib/runtime-config';

export function createCatalogClient() {
  const config = getRuntimeConfig();
  if (config.mode !== 'supabase') return null;

  return createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'X-Client-Info': 'arometra-catalog/0.1' },
    },
  });
}
