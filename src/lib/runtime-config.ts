import 'server-only';
import { parsePublicSupabaseConfiguration } from '@/lib/supabase/configuration';

export type RuntimeConfig =
  | { mode: 'fixtures' }
  | { mode: 'supabase'; url: string; publishableKey: string }
  | { mode: 'unconfigured'; message: string }
  | { mode: 'invalid'; message: string };

export function getRuntimeConfig(): RuntimeConfig {
  const mode = process.env.AROMETRA_DATA_MODE;

  if (mode === 'fixtures') {
    if (process.env.NODE_ENV === 'production') {
      return { mode: 'invalid', message: 'Synthetische Testdaten sind in der Produktionsumgebung gesperrt.' };
    }
    return { mode: 'fixtures' };
  }

  if (mode === 'supabase') {
    const parsed = parsePublicSupabaseConfiguration(process.env, process.env.NODE_ENV);
    if (!parsed) {
      return {
        mode: 'invalid',
        message: 'Die Supabase-Datenquelle ist unvollständig oder unsicher konfiguriert.',
      };
    }
    return {
      mode: 'supabase',
      url: parsed.url,
      publishableKey: parsed.publishableKey,
    };
  }

  return {
    mode: 'unconfigured',
    message: 'Die Datenquelle ist noch nicht eingerichtet. Es werden keine Testdaten eingeblendet.',
  };
}
