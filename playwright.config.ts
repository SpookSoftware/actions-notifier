import { defineConfig } from "@playwright/test";

export default defineConfig({
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
      name: "extension-basic",
      testMatch: /extension\.spec\.ts/,
      use: {
        headless: false, // Extension tests require head
      },
    },
    {
      name: "extension-functionality",
      testMatch: /functionality\.spec\.ts/,
      use: {
        headless: false, // Extension tests require head
      },
    },
  ],
});
