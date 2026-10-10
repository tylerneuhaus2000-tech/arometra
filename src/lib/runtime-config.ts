import 'server-only';
import { z } from 'zod';

const supabaseEnvironment = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

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
    const parsed = supabaseEnvironment.safeParse(process.env);
    if (!parsed.success) {
      return {
        mode: 'invalid',
        message: 'Die Supabase-Datenquelle ist unvollständig konfiguriert.',
      };
    }
    return {
      mode: 'supabase',
      url: parsed.data.SUPABASE_URL,
      publishableKey: parsed.data.SUPABASE_PUBLISHABLE_KEY,
    };
  }

  return {
    mode: 'unconfigured',
    message: 'Die Datenquelle ist noch nicht eingerichtet. Es werden keine Testdaten eingeblendet.',
  };
}
