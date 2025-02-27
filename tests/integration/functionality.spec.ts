import { NOTIFICATION_BUTTON_CLASS } from "@/helpers/pure";
import { test, expect } from "./fixtures";

if (!process.env.SANDBOX_REPO_GITHUB_TOKEN) {
  throw new Error(
    "SANDBOX_REPO_GITHUB_TOKEN environment variable is required for tests to run"
  );
}

test.beforeAll(async () => {
  const actionStartResponse = await fetch(
    "https://api.github.com/repos/SpookSoftware/sandbox/dispatches",
    {
      method: "POST",
      body: JSON.stringify({ event_type: "do-a-lot-of-jobs" }),
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `token ${process.env.SANDBOX_REPO_GITHUB_TOKEN}`,
      },
    }
  );
  if (!actionStartResponse.ok) {
    const errorBody = await actionStartResponse.text();
    throw new Error(
      `Failed to dispatch workflow: ${actionStartResponse.status} ${actionStartResponse.statusText} - ${errorBody}`
    );
  }
});

/* 
Test case ideas
- When you click a yellow link, it turns back to grey
- When you go back and forth on the page, only one button is created.
 */

test.describe("Extension Functionality", () => {
  test("Notification button should be clickable on GitHub workflow pages", async ({
    page,
  }) => {
    // Navigate to a GitHub workflow page
    await page.goto("https://github.com/SpookSoftware/sandbox/actions");

    // Wait for the page to load
    await page.waitForLoadState("domcontentloaded");

    // Give the extension time to inject the button
    await page.waitForTimeout(2000);

    // Find and click the notification button
    const notificationButton = page
      .locator(`button.${NOTIFICATION_BUTTON_CLASS}`)
      .first();

    // Make sure it's visible before clicking
    await expect(notificationButton).toBeVisible();

    // Click the button
    await notificationButton.click();

    // Wait a moment for the color change to take effect
    await page.waitForTimeout(500);

    // Check that the SVG inside the button has the color style set to yellow
    const svgColor = await page.evaluate((buttonClass) => {
      const button = document.querySelector(`button.${buttonClass}`);
      if (!button) throw new Error("Button not found");
      const svg = button.querySelector("svg");
      if (!svg) throw new Error("SVG not found");
      return window.getComputedStyle(svg).color || svg.style.color;
    }, NOTIFICATION_BUTTON_CLASS);

    // Check if the color is yellow (could be in different formats)
    expect(
      ["yellow", "rgb(255, 255, 0)", "#ffff00"].some((color) =>
        svgColor.toLowerCase().includes(color)
      )
    ).toBeTruthy();

    // Also check that the SVG no longer has the 'color-fg-muted' class
    const hasMutedClass = await page.evaluate((buttonClass) => {
      const button = document.querySelector(`button.${buttonClass}`);
      if (!button) throw new Error("Button not found");
      const svg = button.querySelector("svg");
      if (!svg) throw new Error("SVG not found");
      return svg.classList.contains("color-fg-muted");
    }, NOTIFICATION_BUTTON_CLASS);

    expect(hasMutedClass).toBeFalsy();
  });

  test("Clicking a yellow notification button should turn it back to grey", async ({
    page,
  }) => {
    // Navigate to a GitHub workflow page
    await page.goto("https://github.com/SpookSoftware/sandbox/actions");

    // Wait for the page to load
    await page.waitForLoadState("domcontentloaded");

    // Give the extension time to inject the button
    await page.waitForTimeout(2000);

    // Find the notification button
    const notificationButton = page
      .locator(`button.${NOTIFICATION_BUTTON_CLASS}`)
      .first();

    // Make sure it's visible before clicking
    await expect(notificationButton).toBeVisible();

    // First click to turn it yellow
    await notificationButton.click();

    // Wait for the color change to take effect
    await page.waitForTimeout(500);

    // Verify it's yellow
    const svgColorAfterFirstClick = await page.evaluate((buttonClass) => {
      const button = document.querySelector(`button.${buttonClass}`);
      if (!button) throw new Error("Button not found");
      const svg = button.querySelector("svg");
      if (!svg) throw new Error("SVG not found");
      return window.getComputedStyle(svg).color || svg.style.color;
    }, NOTIFICATION_BUTTON_CLASS);

    // Check if the color is yellow
    expect(
      ["yellow", "rgb(255, 255, 0)", "#ffff00"].some((color) =>
        svgColorAfterFirstClick.toLowerCase().includes(color)
      )
    ).toBeTruthy();

    // Now click it again to turn it back to grey
    await notificationButton.click();

    // Wait for the color change to take effect
    await page.waitForTimeout(500);

    // Verify it's back to grey/default color
    const svgColorAfterSecondClick = await page.evaluate((buttonClass) => {
      const button = document.querySelector(`button.${buttonClass}`);
      if (!button) throw new Error("Button not found");
      const svg = button.querySelector("svg");
      if (!svg) throw new Error("SVG not found");
      return svg.classList.contains("color-fg-muted");
    }, NOTIFICATION_BUTTON_CLASS);

    // Verify button has returned to default state with the muted class
    expect(svgColorAfterSecondClick).toBeTruthy();
  });

  test("Button should remain yellow after page refresh", async ({ page }) => {
    // Navigate to a GitHub workflow page
    await page.goto("https://github.com/SpookSoftware/sandbox/actions");

    // Wait for the page to load
    await page.waitForLoadState("domcontentloaded");

    // Give the extension time to inject the button
    await page.waitForTimeout(2000);

    // Find the notification button
    const notificationButton = page
      .locator(`button.${NOTIFICATION_BUTTON_CLASS}`)
      .first();

    // Make sure it's visible before clicking
    await expect(notificationButton).toBeVisible();

    // Click to turn it yellow
    await notificationButton.click();

    // Wait for the color change to take effect
    await page.waitForTimeout(500);

    // Verify it's yellow
    const svgColorBeforeRefresh = await page.evaluate((buttonClass) => {
      const button = document.querySelector(`button.${buttonClass}`);
      if (!button) throw new Error("Button not found");
      const svg = button.querySelector("svg");
      if (!svg) throw new Error("SVG not found");
      return window.getComputedStyle(svg).color || svg.style.color;
    }, NOTIFICATION_BUTTON_CLASS);

    // Check if the color is yellow
    expect(
      ["yellow", "rgb(255, 255, 0)", "#ffff00"].some((color) =>
        svgColorBeforeRefresh.toLowerCase().includes(color)
      )
    ).toBeTruthy();

    // Store the button's data attributes for identification after refresh
    const buttonData = await notificationButton.evaluate((button) => {
      return {
        runId: button.getAttribute("data-run-id"),
        repository: button.getAttribute("data-repository"),
        owner: button.getAttribute("data-owner"),
      };
    });

    // Refresh the page
    await page.reload();

    // Wait for the page to load
    await page.waitForLoadState("domcontentloaded");

    // Give the extension time to re-inject and initialize the button
    await page.waitForTimeout(2000);

    // Locate the same button after refresh using the stored data attributes if needed
    const notificationButtonAfterRefresh = page
      .locator(`button.${NOTIFICATION_BUTTON_CLASS}`)
      .first();

    // Verify the button is visible
    await expect(notificationButtonAfterRefresh).toBeVisible();

    // Verify it's still yellow after refresh
    const svgColorAfterRefresh = await page.evaluate((buttonClass) => {
      const button = document.querySelector(`button.${buttonClass}`);
      if (!button) throw new Error("Button not found");
      const svg = button.querySelector("svg");
      if (!svg) throw new Error("SVG not found");
      return window.getComputedStyle(svg).color || svg.style.color;
    }, NOTIFICATION_BUTTON_CLASS);

    // Check if the color is still yellow
    expect(
      ["yellow", "rgb(255, 255, 0)", "#ffff00"].some((color) =>
        svgColorAfterRefresh.toLowerCase().includes(color)
      )
    ).toBeTruthy();

    // Also verify the color-fg-muted class is not present
    const hasMutedClassAfterRefresh = await page.evaluate((buttonClass) => {
      const button = document.querySelector(`button.${buttonClass}`);
      if (!button) throw new Error("Button not found");
      const svg = button.querySelector("svg");
      if (!svg) throw new Error("SVG not found");
      return svg.classList.contains("color-fg-muted");
    }, NOTIFICATION_BUTTON_CLASS);

    expect(hasMutedClassAfterRefresh).toBeFalsy();
  });
});
