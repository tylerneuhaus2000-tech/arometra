import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const nextCli = resolve(projectRoot, 'node_modules/next/dist/bin/next');
const port = process.env.AROMETRA_UI_PREVIEW_PORT ?? '3130';

if (!/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535) {
  throw new Error('AROMETRA_UI_PREVIEW_PORT must be an integer from 1024 to 65535.');
}

const server = spawn(process.execPath, [nextCli, 'dev', '--hostname', '127.0.0.1', '--port', port], {
  cwd: projectRoot,
  env: {
    ...process.env,
    NODE_ENV: 'development',
    AROMETRA_UI_PREVIEW: 'true',
    AROMETRA_NEXT_DIST_DIR: '.next-ui-preview',
  },
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal));
}

server.on('error', (error) => {
  console.error(`Could not start the local UI preview: ${error.message}`);
  process.exitCode = 1;
});

server.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
