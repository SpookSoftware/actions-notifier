import { test, expect } from "./fixtures";
import { mockGithubApi } from "./mocks/github-api";

// Skip tests if running in CI environment without required environment variables
test.skip(
  !!process.env.CI && !process.env.SANDBOX_REPO_GITHUB_TOKEN,
  "Skipping tests in CI environment without required environment variables"
);

test.describe("Onboarding Flow", () => {
  test.beforeEach(async ({ page, extensionId }) => {
    // Navigate to the onboarding page
    await page.goto(`chrome-extension://${extensionId}/onboarding.html`);

    // Wait for the page to load
    await page.waitForLoadState("domcontentloaded");

    // Clear any existing token from storage
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        chrome.storage.sync.remove("githubToken", resolve);
      });
    });

    // Reload the page to ensure clean state
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
  });

  test("should start at the welcome step", async ({ page }) => {
    // Check that we're on the welcome step
    await expect(page.locator("h2").first()).toHaveText(
      "Welcome to Actions Notifier"
    );
  });
});
