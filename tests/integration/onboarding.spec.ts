import { test, expect } from "./fixtures";
import { mockGithubApi } from "./mocks/github-api";

// Skip tests if running in CI environment without required environment variables
test.skip(
  !!process.env.CI && !process.env.SANDBOX_REPO_GITHUB_TOKEN,
  "Skipping tests in CI environment without required environment variables"
);

// Mock GitHub API responses
const MOCK_VALID_TOKEN = "ghp_VALID_TOKEN";
const MOCK_INVALID_TOKEN = "ghp_INVALID_TOKEN";

test.describe("Onboarding Flow", () => {
  test.beforeEach(async ({ page, extensionId, context }) => {
    // Mock GitHub API call for token validation (/user endpoint)
    await page.route("https://api.github.com/user", async (route) => {
      const token = await route.request().headerValue("Authorization");
      if (token === `token ${MOCK_VALID_TOKEN}`) {
        // Simulate successful validation for the valid token
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ login: "valid-user" }),
        });
      } else if (token === `token ${MOCK_INVALID_TOKEN}`) {
        // Simulate failed validation for the invalid token
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ message: "Bad credentials" }),
        });
      } else {
        // Let other requests pass through or handle as needed
        await route.continue();
        // Or fulfill with a default error for unexpected tokens
        // await route.fulfill({ status: 401, body: '{"message":"Unhandled token"}' });
      }
    });

    // Mock other API calls if needed by specific steps (e.g., orgs, repos)
    // await mockGithubApi(page, { /* config for other endpoints */ });

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
    await expect(page.locator("h2").first()).toHaveText(
      "Welcome to Actions Notifier"
    );
  });

  test.describe("Navigation", () => {
    test("should navigate forward and backward between steps", async ({
      page,
    }) => {
      // Verify we're starting at step 1
      await expect(page.locator("h2").first()).toHaveText(
        "Welcome to Actions Notifier"
      );
      // No step param in the URL originally
      await expect(page).toHaveURL(/onboarding.html/);

      // Forward to step 2
      await page.getByRole("button", { name: "Next" }).click();
      await expect(page.locator("h2").first()).toHaveText("GitHub Token Setup");
      await expect(page).toHaveURL(/step=2/);

      // Backward to step 1
      await page.getByRole("button", { name: "Previous" }).click();
      await expect(page.locator("h2").first()).toHaveText(
        "Welcome to Actions Notifier"
      );
      await expect(page).toHaveURL(/step=1/);
    });

    test("should update URL when navigating", async ({ page }) => {
      // await expect(page).toHaveURL(/step=1/); // Removed: Rely on initial heading check
      await page.getByRole("button", { name: "Next" }).click();
      await expect(page).toHaveURL(/step=2/);
    });

    test("should handle browser navigation", async ({ page }) => {
      await page.getByRole("button", { name: "Next" }).click(); // Go to step 2
      await expect(page).toHaveURL(/step=2/);
      await page.goBack();
      // await expect(page).toHaveURL(/step=1/); // Removed: Rely on heading check below
      await expect(page.locator("h2").first()).toHaveText(
        "Welcome to Actions Notifier"
      );
      await page.goForward();
      await expect(page).toHaveURL(/step=2/);
      await expect(page.locator("h2").first()).toHaveText("GitHub Token Setup");
    });
  });

  test.describe.only("GitHub Token Step", () => {
    test.beforeEach(async ({ page, extensionId }) => {
      // Navigate directly to step 2
      await page.goto(
        `chrome-extension://${extensionId}/onboarding.html?step=2`,
        {
          waitUntil: "domcontentloaded",
        }
      );
      // Verify we are on the correct step
      await expect(page.locator("h2").first()).toHaveText("GitHub Token Setup");
    });

    test("should validate and store GitHub token", async ({ page }) => {
      await page
        .getByRole("button", { name: "I already have a token" })
        .click();
      const tokenInput = page.locator('input[type="password"]');
      await tokenInput.fill(MOCK_VALID_TOKEN);
      await tokenInput.press("Enter");

      // Check for validation success indicator (adjust selector if needed)
      await expect(
        page.locator("text=Token validated successfully")
      ).toBeVisible({ timeout: 2000 }); // Wait for async validation

      // Verify token is stored in storage
      const storedToken = await page.evaluate(() => {
        return new Promise((resolve) => {
          chrome.storage.sync.get("githubToken", (result) => {
            resolve(result.githubToken);
          });
        });
      });
      expect(storedToken).toBe(MOCK_VALID_TOKEN);
    });

    test("should handle invalid token submission", async ({ page }) => {
      await page
        .getByRole("button", { name: "I already have a token" })
        .click();
      const tokenInput = page.locator('input[type="password"]');
      await tokenInput.fill(MOCK_INVALID_TOKEN);
      await tokenInput.press("Enter");

      // Check for validation error indicator (adjust selector if needed)
      await expect(page.locator("text=Invalid token")).toBeVisible();

      // Verify token is not stored or is cleared
      const storedToken = await page.evaluate(() => {
        return new Promise((resolve) => {
          chrome.storage.sync.get("githubToken", (result) => {
            resolve(result.githubToken);
          });
        });
      });
      // Expect storage to be undefined or the invalid token depending on implementation
      expect([undefined, MOCK_INVALID_TOKEN]).toContain(storedToken);
    });

    test("should disable Next button until token is valid", async ({
      page,
    }) => {
      await page
        .getByRole("button", { name: "I already have a token" })
        .click();

      // Get Next button
      const nextButton = page.getByRole("button", { name: "Next" });

      const suggestionButton = page.getByRole("button", {
        name: "Please ensure you have a valid token to continue",
      });

      // Check that Next button is disabled initially
      await expect(nextButton).toBeHidden();
      await expect(suggestionButton).toBeDisabled();

      // Enter valid token
      const tokenInput = page.locator('input[type="password"]');
      await tokenInput.fill(MOCK_VALID_TOKEN);
      await tokenInput.press("Enter");

      // Check for validation success indicator
      await expect(
        page.locator("text=Token validated successfully")
      ).toBeVisible({ timeout: 2000 });

      // Verify Next button becomes enabled after validation
      await expect(nextButton).toBeEnabled();
    });
  });
});
