import { defineConfig, devices } from '@playwright/test'

const useSystemChrome = !process.env.CI

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4319',
    locale: 'pt-BR',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...(useSystemChrome ? { channel: 'chrome' } : {}) }, testIgnore: /responsivo.spec.ts/ },
    {
      name: 'celular',
      use: { ...devices['Pixel 7'], ...(useSystemChrome ? { channel: 'chrome' } : {}) },
      testMatch: /responsivo\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run build:test && npx vite preview --port 4319 --strictPort',
    url: 'http://localhost:4319',
    reuseExistingServer: false,
    timeout: 240_000,
  },
})
