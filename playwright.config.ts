import { defineConfig, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

const contentDataDir = join(
  tmpdir(),
  `ricky-twin-playwright-${process.pid}`,
);
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"]],
  timeout: 30_000,
  workers: 1,
  use: {
    baseURL: externalBaseUrl ?? "http://127.0.0.1:43117",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "pnpm dev --hostname 127.0.0.1 --port 43117",
        env: {
          RICKY_ADMIN_PASSWORD: "test-admin",
          RICKY_ADMIN_SESSION_SECRET:
            "test-session-secret-for-ricky-twin-e2e",
          RICKY_CONTENT_DATA_DIR: contentDataDir,
        },
        url: "http://127.0.0.1:43117",
        reuseExistingServer: false,
      },
});
