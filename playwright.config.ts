import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    channel: "chrome",
    headless: true,
    viewport: { width: 1440, height: 1000 },
  },
  projects: [
    {
      name: "demo",
      testMatch: "demo.spec.ts",
      use: { baseURL: "http://127.0.0.1:3100" },
    },
    {
      name: "api",
      testMatch: "api.spec.ts",
      use: { baseURL: "http://127.0.0.1:3101" },
    },
  ],
  webServer: [
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100",
      env: {
        NEXT_PUBLIC_USE_MOCK_API: "true",
        NEXT_TEST_DIST_DIR: ".next-e2e-demo",
      },
      timeout: 120000,
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3101",
      url: "http://127.0.0.1:3101",
      env: {
        NEXT_PUBLIC_USE_MOCK_API: "false",
        NEXT_TEST_DIST_DIR: ".next-e2e-api",
      },
      timeout: 120000,
    },
  ],
});
