import { defineConfig, devices } from '@playwright/test';

const STORYBOOK_PORT = 6006;
const DEMO_PORT = 4173;
const DOCS_PORT = 4300;
const reuseWebServers =
  process.env.CI !== 'true' && process.env.PLAYWRIGHT_REUSE_SERVER !== 'false';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: process.env.CI === 'true',
  retries: process.env.CI === 'true' ? 1 : 0,
  ...(process.env.CI === 'true' ? { workers: 2 } : {}),
  reporter: process.env.CI === 'true' ? [['github'], ['html', { open: 'never' }]] : 'list',
  expect: {
    toHaveScreenshot: {
      // Allow a small amount of anti-aliasing drift between platforms.
      maxDiffPixels: 50,
    },
  },
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'visual',
      testMatch: /e2e\/visual\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${STORYBOOK_PORT}`,
        viewport: { width: 900, height: 700 },
      },
    },
    {
      name: 'docs',
      testMatch: /e2e\/docs\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${DOCS_PORT}`,
      },
    },
    {
      name: 'flows',
      testMatch: /e2e\/flows\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${DEMO_PORT}`,
      },
    },
  ],
  webServer: [
    {
      command:
        'pnpm -F @pedigree/docs build && pnpm -F @pedigree/docs serve --host 0.0.0.0 --port 4300',
      url: `http://localhost:${DOCS_PORT}`,
      reuseExistingServer: reuseWebServers,
      timeout: 120_000,
    },
    {
      command: 'pnpm -F @pedigree/storybook dev',
      url: `http://localhost:${STORYBOOK_PORT}`,
      reuseExistingServer: reuseWebServers,
      timeout: 120_000,
    },
    {
      command:
        'pnpm -F @pedigree/demo build && pnpm -F @pedigree/demo preview --port 4173 --strictPort',
      url: `http://localhost:${DEMO_PORT}`,
      reuseExistingServer: reuseWebServers,
      timeout: 120_000,
    },
  ],
});
