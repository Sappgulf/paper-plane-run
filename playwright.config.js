import { defineConfig, devices } from '@playwright/test'

const workerCount = Math.max(1, Number(process.env.PLAYWRIGHT_WORKERS || 1))
const usePreviewServer = process.env.PLAYWRIGHT_PREVIEW === '1'
const port = Number(process.env.PLAYWRIGHT_PORT || 4173)
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PLAYWRIGHT_PORT must be a port between 1 and 65535')
}
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // Generous margin: this app boots a deferred WebGL engine, which is slow
  // on cold hosts and CI runners even after the shell is interactive.
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  workers: workerCount,
  reporter: 'line',
  use: {
    baseURL,
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
    command: usePreviewServer
      ? `npm run build && npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`
      : `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
