import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://127.0.0.1:4173/conpeex/',
    launchOptions: { executablePath: process.env.CONPEEX_BROWSER || undefined },
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --strictPort',
    url: 'http://127.0.0.1:4173/conpeex/',
    reuseExistingServer: !process.env.CI,
  },
})
