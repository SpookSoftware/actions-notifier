import { defineConfig } from "@playwright/test";
import { resolve } from "path";

export default defineConfig({
  // Support for TypeScript path aliases
  webServer: {
    command: 'echo "No server required, just setting up TS paths"',
    reuseExistingServer: true,
    cwd: resolve(__dirname),
  },
  reporter: [["html"]],
  fullyParallel: true,
  testDir: "./tests/integration",
  workers: 3,
  use: {
    trace: "retain-on-failure",
  },
  // Define multiple projects for different test scenarios
  projects: [
    {
      name: "selectors",
      testMatch: /selectors\.spec\.ts/,
    },
    {
      name: "extension",
      testMatch: /^(?!.*selectors\.spec\.ts$).*\.spec\.ts$/,
      use: {
        headless: false, // Extension tests require head
      },
    },
  ],
});
