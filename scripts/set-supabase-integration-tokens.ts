import { chmodSync, readFileSync, writeFileSync } from 'node:fs';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd(), true, { info: () => undefined, error: () => undefined }, true);

function fail(message: string): never {
  throw new Error(message);
}

function requireDevelopmentConfig(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const projectRef = process.env.AROMETRA_DEVELOPMENT_PROJECT_REF;
  if (process.env.AROMETRA_SUPABASE_TARGET !== 'development') {
    fail('Blocked: AROMETRA_SUPABASE_TARGET must be development.');
  }
  if (!url || !key || !projectRef) {
    fail('Blocked: Supabase URL, publishable key, and development project reference must exist in .env.local.');
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return fail('Blocked: NEXT_PUBLIC_SUPABASE_URL is invalid.');
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== `${projectRef}.supabase.co`) {
    fail('Blocked: Supabase URL does not match the configured development project reference.');
  }
  return { url: parsed.toString().replace(/\/$/, ''), key };
}

async function askEmail(label: string): Promise<string> {
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    return (await prompt.question(`${label} E-Mail: `)).trim();
  } finally {
    prompt.close();
  }
}

async function askPassword(label: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    fail('Run this command in an interactive terminal so passwords can be hidden.');
  }
  stdout.write(`${label} Passwort (Eingabe bleibt unsichtbar): `);
  stdin.setRawMode(true);
  stdin.resume();
  let password = '';
  return new Promise((resolve, reject) => {
    const onData = (chunk: Buffer) => {
      for (const character of chunk.toString('utf8')) {
        if (character === '\u0003') {
          cleanup();
          stdout.write('\n');
          reject(new Error('Abgebrochen.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          stdout.write('\n');
          resolve(password);
          return;
        }
        if (character === '\u007f' || character === '\b') {
          password = password.slice(0, -1);
        } else {
          password += character;
        }
      }
    };
    const cleanup = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
    };
    stdin.on('data', onData);
  });
}

async function signIn(url: string, key: string, email: string, password: string, label: string): Promise<{ token: string; id: string; email: string }> {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: key, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json() as {
    access_token?: unknown;
    user?: { id?: unknown; email?: unknown };
    msg?: unknown;
    message?: unknown;
  };
  if (!response.ok || typeof result.access_token !== 'string' || typeof result.user?.id !== 'string'
    || typeof result.user.email !== 'string') {
    const detail = typeof result.msg === 'string' ? result.msg : typeof result.message === 'string' ? result.message : '';
    fail(`${label} Login fehlgeschlagen (HTTP ${response.status})${detail ? `: ${detail}` : '.'}`);
  }
  if (result.user.email.toLowerCase() !== email.toLowerCase()) {
    fail(`${label} Login lieferte nicht die erwartete E-Mail-Adresse.`);
  }
  return { token: result.access_token, id: result.user.id, email: result.user.email };
}

function setEnvValue(content: string, name: string, value: string): string {
  const line = `${name}=${value}`;
  const expression = new RegExp(`^${name}=.*$`, 'm');
  if (expression.test(content)) return content.replace(expression, line);
  return `${content.trimEnd()}\n${line}\n`;
}

async function run(): Promise<void> {
  const { url, key } = requireDevelopmentConfig();
  stdout.write('Die Tokens werden lokal in .env.local gespeichert und nicht ausgegeben.\n');

  const nonAdminEmail = await askEmail('Normaler Nutzer');
  const nonAdminPassword = await askPassword('Normaler Nutzer');
  const adminEmail = await askEmail('AROMETRA-Editor');
  const adminPassword = await askPassword('AROMETRA-Editor');
  if (!nonAdminEmail || !adminEmail || nonAdminEmail.toLowerCase() === adminEmail.toLowerCase()) {
    fail('Es müssen zwei unterschiedliche Testkonten angegeben werden.');
  }

  const nonAdmin = await signIn(url, key, nonAdminEmail, nonAdminPassword, 'Normaler Nutzer');
  const admin = await signIn(url, key, adminEmail, adminPassword, 'AROMETRA-Editor');
  if (nonAdmin.id === admin.id) fail('Beide Anmeldungen gehören zum selben Nutzer.');

  const envPath = `${process.cwd()}/.env.local`;
  let content = readFileSync(envPath, 'utf8');
  content = setEnvValue(content, 'SUPABASE_INTEGRATION_NON_ADMIN_ACCESS_TOKEN', nonAdmin.token);
  content = setEnvValue(content, 'SUPABASE_INTEGRATION_ADMIN_ACCESS_TOKEN', admin.token);
  content = setEnvValue(content, 'SUPABASE_IMPORT_ACCESS_TOKEN', admin.token);
  writeFileSync(envPath, content, { mode: 0o600 });
  chmodSync(envPath, 0o600);
  stdout.write('Beide Nutzer angemeldet; Access Tokens lokal gespeichert. Die Passwörter und Tokens wurden nicht ausgegeben.\n');
}

run().catch((error: unknown) => {
  stdout.write(`${error instanceof Error ? error.message : 'Token-Einrichtung fehlgeschlagen.'}\n`);
  process.exitCode = 1;
});
