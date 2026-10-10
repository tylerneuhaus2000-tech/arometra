import nextEnv from '@next/env';
import { writeFile } from 'node:fs/promises';

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
if (!url || !publishableKey || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !publishableKey.startsWith('sb_publishable_')) {
  throw new Error('Pages config requires a Supabase project URL and publishable key in local environment.');
}
const output = `window.AROMETRA_PAGES_CONFIG = Object.freeze(${JSON.stringify({ url, publishableKey })});\n`;
await writeFile('pages-config.js', output, { mode: 0o644 });
console.log('Wrote public Supabase Pages configuration. The publishable key is intended for browser use; no secret key is accepted.');
