import { test, expect } from './fixtures';

test.describe('Extension Functionality', () => {
  // Before running tests, make sure we have a built extension
  test.beforeAll(async () => {
    // You could add a build step here if needed
  });

  test('Background service worker responds to messages', async ({ page, extensionId, context }) => {
    // Create a page to test communication with the background service worker
    await page.goto('https://github.com/');
    
    // Execute a script that sends a message to the background service worker
    // and returns the response
    const response = await page.evaluate(async () => {
      return await new Promise((resolve) => {
        // Send a test message to the background service worker
        // This message should match what your extension is expecting
        chrome.runtime.sendMessage({ type: 'TEST_MESSAGE' }, (response) => {
          resolve(response);
        });
      });
    });
    
    // Check that we got some kind of response
    // You'll need to adjust this based on what your background script
    // actually responds with
    expect(response).toBeDefined();
  });

  test('Notification button should be clickable on GitHub workflow pages', async ({ page }) => {
    // Navigate to a GitHub workflow page
    await page.goto('https://github.com/SpookSoftware/sandbox/actions');
    
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Give the extension time to inject the button
    await page.waitForTimeout(2000);
    
    // Find and click the notification button
    const notificationButton = page.locator('button[data-testid="cicd-notification-button"]').first();
    
    // Make sure it's visible before clicking
    await expect(notificationButton).toBeVisible();
    
    // Click the button
    await notificationButton.click();
    
    // Verify the button state changed (this depends on your implementation)
    // For example, if clicking changes a class or attribute:
    await expect(notificationButton).toHaveAttribute('data-notification-active', 'true');
  });

  test('Popup UI should display correct information', async ({ page, extensionId }) => {
    // Navigate to the extension's popup
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    
    // Wait for the popup to load
    await page.waitForLoadState('domcontentloaded');
    
    // Check for expected elements in the popup
    // You'll need to adjust these selectors based on your popup's structure
    await expect(page.locator('h1')).toBeVisible();
    
    // If your popup has settings or options, test interactions with them
    // For example:
    // const toggleSwitch = page.locator('#notifications-toggle');
    // await toggleSwitch.click();
    // await expect(toggleSwitch).toBeChecked();
  });
});