import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT ?? 3111);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  reporter: [['list']],
  use: { baseURL, trace: 'off' },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 5'] } }],
  webServer: {
    command: `npm run start -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
