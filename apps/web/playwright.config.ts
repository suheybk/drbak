import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the web app.
 *
 * `webServer` boots `astro dev` so tests run against the actual SSR pipeline.
 * Note: a stub API on http://localhost:8787 is expected to be running.
 */
export default defineConfig({
  testDir: './tests/e2e',
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
