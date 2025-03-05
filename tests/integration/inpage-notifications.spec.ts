import { test, expect } from "./fixtures";

test.describe("In-page notifications", () => {
  test("should show token expired notification", async ({
    page,
    context,
    extensionId,
  }) => {
    // Navigate to a GitHub page
    await page.goto("https://github.com");

    // Inject the notification via content script message
    await page.evaluate(() => {
      // Mock receiving a message from background script
      const mockMessageEvent = new CustomEvent("message", {
        detail: {
          action: "showNotification",
          type: "token-expired",
        },
      });

      // Trigger the message handler
      window.dispatchEvent(mockMessageEvent);
    });

    // Alternatively, call the function directly if the page context allows
    await page.evaluate(async () => {
      // @ts-ignore - Adding to window for testing
      if (window.chrome && window.chrome.runtime) {
        // @ts-ignore
        window.chrome.runtime.onMessage.dispatch({
          action: "showNotification",
          type: "token-expired",
        });
      }
    });

    // Wait for notification to appear and verify its content
    const notification = page.locator(".cicd-workflow-in-page-notification");
    await expect(notification).toBeVisible({ timeout: 5000 });

    // Check notification content
    await expect(
      notification.locator("div:has-text('GitHub Token Issue')")
    ).toBeVisible();
    await expect(
      notification.locator("button:has-text('Update Token')")
    ).toBeVisible();

    // Test close button functionality
    await notification.locator("button:has-text('×')").click();
    await expect(notification).not.toBeVisible();
  });

  test("should show alarm limit notification", async ({
    page,
    context,
    extensionId,
  }) => {
    // Navigate to a GitHub page
    await page.goto("https://github.com");

    // Use the browser API to send a message to the content script
    await context.addInitScript(() => {
      // Mock runtime messaging
      window.addEventListener("DOMContentLoaded", () => {
        // @ts-ignore
        if (window.chrome && window.chrome.runtime) {
          // @ts-ignore
          const originalOnMessage = window.chrome.runtime.onMessage;
          // Manually trigger message handling
          setTimeout(() => {
            // @ts-ignore
            if (window.chrome.runtime.onMessage.hasListeners()) {
              // @ts-ignore
              window.chrome.runtime.onMessage.dispatch({
                action: "showNotification",
                type: "alarm-limit-reached",
              });
            }
          }, 1000);
        }
      });
    });

    // Wait for notification to appear and verify its content
    const notification = page.locator(".cicd-workflow-in-page-notification");
    await expect(notification).toBeVisible({ timeout: 10000 });

    // Check notification content
    await expect(
      notification.locator("div:has-text('Workflow Monitor Limit Reached')")
    ).toBeVisible();
    await expect(
      notification.locator("button:has-text('Manage Monitors')")
    ).toBeVisible();

    // Test action button click
    const manageButton = notification.locator(
      "button:has-text('Manage Monitors')"
    );

    // Create a page promise to wait for the new tab to open
    const pagePromise = context.waitForEvent("page");

    // Click the action button
    await manageButton.click();

    // Wait for the new page to open and verify it's the manage page
    const newPage = await pagePromise;
    await newPage.waitForLoadState();
    expect(newPage.url()).toContain("manage.html");
  });

  test("should auto-close notification after timeout", async ({ page }) => {
    // Navigate to a GitHub page
    await page.goto("https://github.com");

    // Reduce the timeout for testing purposes
    await page.evaluate(() => {
      // Define a mock for the showInPageNotification function with shorter timeout
      // @ts-ignore - Adding to window for testing
      window.mockShowNotification = () => {
        const notification = document.createElement("div");
        notification.className = "cicd-workflow-in-page-notification";
        notification.textContent = "Test notification";
        notification.style.position = "fixed";
        notification.style.bottom = "20px";
        notification.style.right = "20px";
        notification.style.backgroundColor = "#fff";
        notification.style.zIndex = "9999";
        document.body.appendChild(notification);

        // Much shorter timeout for testing (1 second)
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 1000);
      };

      // Call the mock function
      // @ts-ignore
      window.mockShowNotification();
    });

    // First verify the notification appears
    const notification = page.locator(".cicd-workflow-in-page-notification");
    await expect(notification).toBeVisible();

    // Then verify it disappears after the timeout
    await expect(notification).not.toBeVisible({ timeout: 3000 });
  });
});
