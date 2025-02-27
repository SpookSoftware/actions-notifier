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

test.describe("Action Functionality", () => {
  test("Notification button should be clickable on action pages", async ({
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

test.describe("Job functionality", () => {
  test("Notification button should be clickable on job pages", async ({
    page,
  }) => {
    // Navigate to GitHub actions page
    await page.goto("https://github.com/SpookSoftware/sandbox/actions");

    // Wait for the page to load completely
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle");

    // Look for a queued or running action (likely our do-a-lot-of-jobs trigger)
    // First try to find a queued element
    const queuedOrRunningSelector =
      'svg[aria-label*="queued"], svg[aria-label*="currently running"], svg[aria-label*="In progress"]';
    await page.waitForSelector(queuedOrRunningSelector, { timeout: 10000 });

    // Click on the first queued/running workflow to view it
    const actionLink = await page
      .locator(queuedOrRunningSelector)
      .first()
      .locator("xpath=./ancestor::a")
      .first();
    await actionLink.click();

    // Wait for job list to load
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector('li[data-item-id^="job"]');

    // Give the extension time to inject the buttons on the jobs page
    await page.waitForTimeout(2000);

    // Look for a notification button on one of the jobs
    const jobNotificationButton = page
      .locator(`button.${NOTIFICATION_BUTTON_CLASS}`)
      .first();
    await expect(jobNotificationButton).toBeVisible();

    // Click on the button to turn it yellow
    await jobNotificationButton.click();

    // Wait for the color change to take effect
    await page.waitForTimeout(500);

    // Verify it's yellow
    const svgColorAfterClick = await page.evaluate((buttonClass) => {
      const button = document.querySelector(`button.${buttonClass}`);
      if (!button) throw new Error("Button not found");
      const svg = button.querySelector("svg");
      if (!svg) throw new Error("SVG not found");
      return window.getComputedStyle(svg).color || svg.style.color;
    }, NOTIFICATION_BUTTON_CLASS);

    // Check if the color is yellow
    expect(
      ["yellow", "rgb(255, 255, 0)", "#ffff00"].some((color) =>
        svgColorAfterClick.toLowerCase().includes(color)
      )
    ).toBeTruthy();
  });

  test("Double clicking notification button should toggle between yellow and grey", async ({
    page,
  }) => {
    // Navigate to GitHub actions page
    await page.goto("https://github.com/SpookSoftware/sandbox/actions");

    // Wait for the page to load completely
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle");

    // Look for a queued or running action (likely our do-a-lot-of-jobs trigger)
    const queuedOrRunningSelector =
      'svg[aria-label*="queued"], svg[aria-label*="currently running"], svg[aria-label*="In progress"]';
    await page.waitForSelector(queuedOrRunningSelector, { timeout: 10000 });

    // Click on the first queued/running workflow to view it
    const actionLink = await page
      .locator(queuedOrRunningSelector)
      .first()
      .locator("xpath=./ancestor::a")
      .first();
    await actionLink.click();

    // Wait for job list to load
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector('li[data-item-id^="job"]');

    // Give the extension time to inject the buttons on the jobs page
    await page.waitForTimeout(2000);

    // Look for a notification button on one of the jobs
    const jobNotificationButton = page
      .locator(`button.${NOTIFICATION_BUTTON_CLASS}`)
      .first();
    await expect(jobNotificationButton).toBeVisible();

    // FIRST CLICK - Click on the button to turn it yellow
    await jobNotificationButton.click();

    // Wait for the color change to take effect
    await page.waitForTimeout(500);

    // Verify it's yellow after first click
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

    // Verify the color-fg-muted class is not present after first click
    const hasMutedClassAfterFirstClick = await page.evaluate((buttonClass) => {
      const button = document.querySelector(`button.${buttonClass}`);
      if (!button) throw new Error("Button not found");
      const svg = button.querySelector("svg");
      if (!svg) throw new Error("SVG not found");
      return svg.classList.contains("color-fg-muted");
    }, NOTIFICATION_BUTTON_CLASS);

    expect(hasMutedClassAfterFirstClick).toBeFalsy();

    // SECOND CLICK - Click on the button again to turn it back to grey
    await jobNotificationButton.click();

    // Wait for the color change to take effect
    await page.waitForTimeout(500);

    // Verify it's back to grey/default color after second click
    const hasMutedClassAfterSecondClick = await page.evaluate((buttonClass) => {
      const button = document.querySelector(`button.${buttonClass}`);
      if (!button) throw new Error("Button not found");
      const svg = button.querySelector("svg");
      if (!svg) throw new Error("SVG not found");
      return svg.classList.contains("color-fg-muted");
    }, NOTIFICATION_BUTTON_CLASS);

    // Verify button has returned to default state with the muted class
    expect(hasMutedClassAfterSecondClick).toBeTruthy();

    // Additional verification that color is not yellow anymore
    const svgColorAfterSecondClick = await page.evaluate((buttonClass) => {
      const button = document.querySelector(`button.${buttonClass}`);
      if (!button) throw new Error("Button not found");
      const svg = button.querySelector("svg");
      if (!svg) throw new Error("SVG not found");
      return window.getComputedStyle(svg).color || svg.style.color;
    }, NOTIFICATION_BUTTON_CLASS);

    // Check that the color is no longer yellow
    expect(
      ["yellow", "rgb(255, 255, 0)", "#ffff00"].some((color) =>
        svgColorAfterSecondClick.toLowerCase().includes(color)
      )
    ).toBeFalsy();
  });
});
