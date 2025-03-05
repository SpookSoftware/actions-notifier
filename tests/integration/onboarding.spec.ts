import { test, expect } from "./fixtures";
import { Page } from "@playwright/test";

test.describe("Onboarding Flow", () => {
  let page: Page;
  let extensionId: string;

  test.beforeEach(async ({ context, extensionId: id }) => {
    // Store extensionId for use in tests
    extensionId = id;

    // Create a new page for each test
    page = await context.newPage();

    // Navigate to the onboarding page
    await page.goto(`chrome-extension://${extensionId}/onboarding.html`);
    await page.waitForLoadState("domcontentloaded");
  });

  test("should display the first step on initial load", async () => {
    // Check that step 1 is visible
    const step1 = page.locator("#step-1");
    await expect(step1).toBeVisible();

    // Check that other steps are hidden
    await expect(page.locator("#step-2")).not.toBeVisible();
    await expect(page.locator("#step-3")).not.toBeVisible();

    // Verify progress marker is active
    const progressMarker1 = page.locator(
      ".progress-step:nth-child(1) .step-marker"
    );
    await expect(progressMarker1).toHaveClass(/active/);

    // Verify navigation buttons - previous should be hidden, next should be visible
    await expect(page.locator("#prev-btn")).not.toBeVisible();
    await expect(page.locator("#next-btn")).toBeVisible();
    await expect(page.locator("#finish-btn")).not.toBeVisible();
  });

  test("should navigate through steps correctly", async () => {
    // Start at step 1
    await expect(page.locator("#step-1")).toBeVisible();

    // Move to step 2
    await page.click("#next-btn");
    await expect(page.locator("#step-2")).toBeVisible();
    await expect(page.locator("#step-1")).not.toBeVisible();

    // Check that progress markers are updated
    const progressMarker1 = page.locator(
      ".progress-step:nth-child(1) .step-marker"
    );
    const progressMarker2 = page.locator(
      ".progress-step:nth-child(2) .step-marker"
    );
    await expect(progressMarker1).toHaveClass(/completed/);
    await expect(progressMarker2).toHaveClass(/active/);

    // Check that the completed marker has a checkmark
    await expect(progressMarker1).toHaveText("✓");

    // Verify navigation buttons in step 2
    await expect(page.locator("#prev-btn")).toBeVisible();
    await expect(page.locator("#next-btn")).toBeVisible();
    await expect(page.locator("#finish-btn")).not.toBeVisible();

    // Move back to step 1
    await page.click("#prev-btn");
    await expect(page.locator("#step-1")).toBeVisible();
    await expect(page.locator("#step-2")).not.toBeVisible();

    // Check that progress markers are updated again
    await expect(progressMarker1).toHaveClass(/active/);
    await expect(progressMarker2).not.toHaveClass(/active/);
    await expect(progressMarker2).not.toHaveClass(/completed/);

    // Move to step 2 again
    await page.click("#next-btn");
    await expect(page.locator("#step-2")).toBeVisible();

    // Try to move to step 3 without validating token
    await page.click("#next-btn");

    // Should still be on step 2 because token validation is required
    await expect(page.locator("#step-2")).toBeVisible();
    await expect(page.locator("#step-3")).not.toBeVisible();

    // Show the token input
    await page.click("#existing-token-btn");
    const tokenInput = page.locator("#github-token");
    await expect(tokenInput).toBeVisible();

    // Verify error handling - try to proceed with empty token
    await page.click("#validate-token-btn");
    const errorMessage = page.locator("#token-error");
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText("Please enter a token");
  });

  test("should show token input when clicking 'I already have a token'", async () => {
    // Navigate to step 2
    await page.click("#next-btn");

    // Initially the token input should be hidden
    await expect(page.locator("#token-input-container")).not.toBeVisible();

    // Click the button to show token input
    await page.click("#existing-token-btn");

    // Token input should now be visible
    await expect(page.locator("#token-input-container")).toBeVisible();
    await expect(page.locator("#github-token")).toBeVisible();
    await expect(page.locator("#validate-token-btn")).toBeVisible();
  });

  test("should validate token and proceed to step 3", async ({ context }) => {
    // Mock GitHub API responses for token validation
    await context.route("https://api.github.com/user", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ login: "test-user" }),
      });
    });

    await context.route(
      "https://api.github.com/repos/octocat/hello-world",
      async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ name: "hello-world" }),
        });
      }
    );

    // Navigate to step 2
    await page.click("#next-btn");

    // Show token input and enter a token
    await page.click("#existing-token-btn");
    await page.fill("#github-token", "test-github-token");

    // Click validate button
    await page.click("#validate-token-btn");

    // Check spinner is shown during validation
    await expect(page.locator("#validate-spinner")).toBeVisible();

    // Success message should appear
    const successMessage = page.locator("#token-success");
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toContainText("Token validated successfully");

    // Should auto-advance to step 3 after a delay
    await expect(page.locator("#step-3")).toBeVisible({ timeout: 2000 });
    await expect(page.locator("#finish-btn")).toBeVisible();
    await expect(page.locator("#next-btn")).not.toBeVisible();

    // Verify the token was stored in browser storage
    const tokenInStorage = await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.sync.get("githubToken", (data) => {
          resolve(data.githubToken);
        });
      });
    });
    expect(tokenInStorage).toBe("test-github-token");
  });

  test("should handle invalid token", async ({ context }) => {
    // Mock GitHub API responses for failed token validation
    await context.route("https://api.github.com/user", async (route) => {
      await route.fulfill({
        status: 401,
        body: JSON.stringify({ message: "Bad credentials" }),
      });
    });

    // Navigate to step 2
    await page.click("#next-btn");

    // Show token input and enter an invalid token
    await page.click("#existing-token-btn");
    await page.fill("#github-token", "invalid-token");

    // Click validate button
    await page.click("#validate-token-btn");

    // Error message should appear
    const errorMessage = page.locator("#token-error");
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(
      "Invalid token or insufficient permissions"
    );

    // Should not advance to step 3
    await expect(page.locator("#step-2")).toBeVisible();
  });

  test("should handle network error during validation", async ({ context }) => {
    // Mock GitHub API to simulate network error
    await context.route("https://api.github.com/user", async (route) => {
      await route.abort("failed");
    });

    // Navigate to step 2
    await page.click("#next-btn");

    // Show token input and enter a token
    await page.click("#existing-token-btn");
    await page.fill("#github-token", "test-token");

    // Click validate button
    await page.click("#validate-token-btn");

    // Error message should appear
    const errorMessage = page.locator("#token-error");
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText("Error");
  });

  test("should detect and use existing valid token", async ({ context }) => {
    // Mock API responses for token validation
    await context.route("https://api.github.com/user", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ login: "test-user" }),
      });
    });

    await context.route(
      "https://api.github.com/repos/octocat/hello-world",
      async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ name: "hello-world" }),
        });
      }
    );

    // Set a token in storage before loading onboarding
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        chrome.storage.sync.set({ githubToken: "existing-token" }, resolve);
      });
    });

    // Reload the page to trigger the existing token check
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Navigate to step 2
    await page.click("#next-btn");

    // Token input should be visible and pre-filled
    await expect(page.locator("#token-input-container")).toBeVisible();
    const tokenInput = page.locator("#github-token");
    await expect(tokenInput).toHaveValue("existing-token");

    // Success message should be shown
    const successMessage = page.locator("#token-success");
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toContainText("Existing token is valid");

    // Should be able to proceed to step 3
    await page.click("#next-btn");
    await expect(page.locator("#step-3")).toBeVisible();
  });

  test("should complete onboarding and mark as completed in storage", async () => {
    // Navigate to step 3
    await page.click("#next-btn"); // to step 2
    await page.click("#existing-token-btn");

    // Mock token validation to always succeed
    await page.evaluate(() => {
      // Override the testGitHubToken function to always return true
      window.eval(`
        async function testGitHubToken() { return true; }
        document.querySelector("#github-token").value = "mocked-token";
        document.querySelector("#validate-token-btn").click();
      `);
    });

    // Wait for step 3 to be visible
    await expect(page.locator("#step-3")).toBeVisible({ timeout: 2000 });

    // Click finish button and intercept the navigation
    const navigationPromise = page.waitForNavigation();
    await page.click("#finish-btn");

    // Should have set onboarding completed flag in storage
    const onboardingCompleted = await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.local.get("hasCompletedOnboarding", (data) => {
          resolve(data.hasCompletedOnboarding);
        });
      });
    });
    expect(onboardingCompleted).toBe(true);

    // Navigation should occur to GitHub
    await navigationPromise;
    expect(page.url()).toContain("github.com");
  });
});
