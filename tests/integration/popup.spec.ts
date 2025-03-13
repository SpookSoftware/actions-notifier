import { test, expect } from "./fixtures";

test.describe("Popup functionality", () => {
  test("should show warning state when no token exists", async ({
    context,
    extensionId,
  }) => {
    // Open the popup directly
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Check that warning state is displayed
    await expect(page.locator("#auth-warning")).toBeVisible();
    await expect(page.locator("#auth-success")).not.toBeVisible();
    await expect(page.locator("#auth-error")).not.toBeVisible();
  });

  test("should save and validate GitHub token", async ({
    context,
    extensionId,
  }) => {
    // Open the popup
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Fill in a test token - using a placeholder since we can't use a real token in tests
    await page.locator("#githubToken").fill("test_token");

    // Intercept the fetch request to GitHub API and mock a successful response
    await page.route("https://api.github.com/user", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ login: "testuser" }),
      });
    });

    await page.route(
      "https://api.github.com/repos/octocat/hello-world",
      async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ name: "hello-world" }),
        });
      }
    );

    // Submit the form
    await page.locator("#saveButton").click();

    // Check that success state is displayed
    await expect(page.locator("#auth-success")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("#auth-warning")).not.toBeVisible();
    await expect(page.locator("#auth-error")).not.toBeVisible();

    // Verify token status message
    await expect(page.locator("#token-status")).toHaveText(
      /Token validated successfully/
    );
    await expect(page.locator("#token-status")).toHaveClass(/token-valid/);

    // Verify monitors section is shown
    await expect(page.locator("#monitors-section")).toBeVisible();
  });

  test("should show error state for invalid token", async ({
    context,
    extensionId,
  }) => {
    // Open the popup
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Fill in an invalid token
    await page.locator("#githubToken").fill("invalid_token");

    // Intercept the fetch request to GitHub API and mock an unauthorized response
    await page.route("https://api.github.com/user", async (route) => {
      await route.fulfill({
        status: 401,
        body: JSON.stringify({ message: "Bad credentials" }),
      });
    });

    // Submit the form
    await page.locator("#saveButton").click();

    // Check that error state is displayed
    await expect(page.locator("#auth-error")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("#auth-warning")).not.toBeVisible();
    await expect(page.locator("#auth-success")).not.toBeVisible();

    // Verify token status message
    await expect(page.locator("#token-status")).toHaveText(
      /Invalid token or insufficient permissions/
    );
    await expect(page.locator("#token-status")).toHaveClass(/token-invalid/);
  });

  test("should toggle extension enabled state", async ({
    context,
    extensionId,
  }) => {
    // Open the popup
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Extension should be enabled by default
    await expect(page.locator("#extension-toggle")).toBeChecked();
    await expect(page.locator("#extension-status")).toHaveText("Enabled");

    // Click to disable
    await page.locator(".toggle-slider").click();

    // Verify toggle is unchecked and status text is updated
    await expect(page.locator("#extension-toggle")).not.toBeChecked();
    await expect(page.locator("#extension-status")).toHaveText("Disabled");
    await expect(page.locator("#extension-status")).toHaveCSS(
      "color",
      "rgb(203, 36, 49)"
    );

    // Click again to enable
    await page.locator(".toggle-slider").click();

    // Verify toggle is checked and status text is updated
    await expect(page.locator("#extension-toggle")).toBeChecked();
    await expect(page.locator("#extension-status")).toHaveText("Enabled");
    await expect(page.locator("#extension-status")).toHaveCSS(
      "color",
      "rgb(40, 167, 69)"
    );
  });

  test("should open manage page when clicking manage button", async ({
    context,
    extensionId,
  }) => {
    // Open the popup
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Fill in a test token and mock successful validation
    await page.locator("#githubToken").fill("test_token");

    await page.route("https://api.github.com/user", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ login: "testuser" }),
      });
    });

    await page.route(
      "https://api.github.com/repos/octocat/hello-world",
      async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ name: "hello-world" }),
        });
      }
    );

    // Mock alarm count to show manage button
    await page.evaluate(() => {
      // @ts-ignore
      chrome.alarms = chrome.alarms || {};
      // @ts-ignore
      chrome.alarms.getAll = () => Promise.resolve([{ name: "test-alarm" }]);
    });

    // Submit form to validate token
    await page.locator("#saveButton").click();

    // Wait for monitors section and manage button to be visible
    await expect(page.locator("#monitors-section")).toBeVisible();
    await expect(page.locator("#manage-section")).toBeVisible();
    await expect(page.locator("#manage-button")).toBeVisible();

    // Create a page promise to wait for the manage page to open
    const pagePromise = context.waitForEvent("page");

    // Click the manage button
    await page.locator("#manage-button").click();

    // Wait for the new page to open and verify it's the manage page
    const newPage = await pagePromise;
    await newPage.waitForLoadState();
    expect(newPage.url()).toContain("manage.html");
  });

  test("should open onboarding page when clicking debug button", async ({
    context,
    extensionId,
  }) => {
    // Open the popup
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Create a page promise to wait for the onboarding page to open
    const pagePromise = context.waitForEvent("page");

    // Click the debug onboarding button
    await page.locator("#debug-onboarding-button").click();

    // Wait for the new page to open and verify it's the onboarding page
    const newPage = await pagePromise;
    await newPage.waitForLoadState();
    expect(newPage.url()).toContain("onboarding.html");
  });

  test("should show welcome message for first-time users", async ({
    context,
    extensionId,
  }) => {
    // Open the popup
    const page = await context.newPage();

    // Mock storage to simulate first run
    await context.addInitScript(() => {
      // @ts-ignore
      if (window.chrome && window.chrome.storage) {
        // @ts-ignore
        const originalGet = window.chrome.storage.sync.get;
        // @ts-ignore
        window.chrome.storage.sync.get = (key, callback) => {
          if (key === "hasSeenOnboarding") {
            callback({ hasSeenOnboarding: false });
          } else {
            originalGet(key, callback);
          }
        };
      }
    });

    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Verify welcome message is displayed
    await expect(page.locator("#welcome-message")).toBeVisible();
  });
});
