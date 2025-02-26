import { test, expect } from "./fixtures";

test.describe("CI/CD Workflow Notifications Extension", () => {
  test("Extension should load correctly", async ({ context, extensionId }) => {
    // Check if the extension's service worker is loaded
    const workers = context.serviceWorkers();
    expect(workers.length).toBeGreaterThan(0);

    // Check that the service worker URL contains the extension ID
    const serviceWorkerUrl = workers[0].url();
    expect(serviceWorkerUrl).toContain(extensionId);
  });

  test("Popup page should load correctly", async ({ page, extensionId }) => {
    // Navigate to the extension's popup page
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Wait for the page to load and verify content
    await page.waitForLoadState("domcontentloaded");

    // Check that the popup loaded without errors
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test("Extension should populate the text field with the correct value if it is in chrome.storage.sync", async ({
    page,
    extensionId,
  }) => {
    // Navigate to the extension's popup page
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    const token = "test-token";

    await page.evaluate((tokenValue) => {
      return new Promise<void>((resolve) => {
        chrome.storage.sync.set({ githubToken: tokenValue }, resolve);
      });
    }, token);

    // Reload the page to ensure the storage is read
    await page.reload();

    // Wait for the page to load and verify content
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector('input[name="githubToken"]');

    const tokenInput = page.locator('input[name="githubToken"]');
    const tokenValue = await tokenInput.inputValue();
    expect(tokenValue).toBe(token);
  });
});
