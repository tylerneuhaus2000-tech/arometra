import { defineConfig, devices } from '@playwright/test';

const testPort = Number(process.env.AROMETRA_PLAYWRIGHT_PORT ?? 3117);
if (!Number.isInteger(testPort) || testPort < 1024 || testPort > 65535) {
  throw new Error('AROMETRA_PLAYWRIGHT_PORT must be an integer from 1024 to 65535.');
}

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${testPort}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } }
          : {}),
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${testPort}`,
    url: `http://127.0.0.1:${testPort}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      AROMETRA_DATA_MODE: 'fixtures',
      AROMETRA_UI_PREVIEW: 'true',
      AROMETRA_NEXT_DIST_DIR: '.next-e2e',
    },
  },
});
