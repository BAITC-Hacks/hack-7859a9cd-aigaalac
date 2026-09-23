import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "map-theme.spec.ts",
  workers: 1,
  timeout: 60000,
  use: {
    channel: "chrome",
    headless: true,
    baseURL: "http://127.0.0.1:3110",
    viewport: { width: 1440, height: 1050 },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3110",
    url: "http://127.0.0.1:3110",
    env: {
      NEXT_PUBLIC_USE_MOCK_API: "true",
      NEXT_TEST_DIST_DIR: ".next-e2e-map",
    },
    timeout: 120000,
  },
});
