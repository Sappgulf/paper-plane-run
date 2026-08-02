import { defineConfig, devices } from '@playwright/test'

const testPort = process.env.PLAYWRIGHT_PORT || '4173'
const testBaseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${testPort}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 45_000,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: testBaseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], browserName: 'chromium', viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${testPort}`,
    url: testBaseURL,
    reuseExistingServer: false,
  },
})
