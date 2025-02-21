import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [["html"]],
  fullyParallel: true,
  testDir: "./tests/integration",
  workers: 3,
  use: {
    trace: "retain-on-failure",
  },
});
