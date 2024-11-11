import { test, expect } from "@playwright/test";
import {
  WORKFLOW_RUN_ATTRIBUTE_SELECTOR,
  COMPLETED_ATTRIBUTE_SELECTOR,
  WORKFLOW_RUNS_CONTAINER_ATTRIBUTE_SELECTOR,
  CURRENTLY_RUNNING_ATTRIBUTE_SELECTOR,
} from "../extension/selectors";

test.describe("WORKFLOW_RUN_ATTRIBUTE_SELECTOR", () => {
  test("should see workflow elements", async ({ page }) => {
    await page.goto(
      "https://github.com/SpookSoftware/github-actions-browser-notifications/actions"
    );

    await page.waitForSelector(WORKFLOW_RUN_ATTRIBUTE_SELECTOR);

    const elements = await page.$$(WORKFLOW_RUN_ATTRIBUTE_SELECTOR);

    expect(elements.length).toBeGreaterThan(0);
  });
});

test.describe("COMPLETED_ATTRIBUTE_SELECTOR", () => {
  test("should see completed workflow elements", async ({ page }) => {
    await page.goto(
      "https://github.com/SpookSoftware/github-actions-browser-notifications/actions/workflows/waitAMinute.yml?query=is%3Acompleted"
    );

    await page.waitForSelector(COMPLETED_ATTRIBUTE_SELECTOR);

    const elements = await page.$$(COMPLETED_ATTRIBUTE_SELECTOR);

    expect(elements.length).toBeGreaterThan(0);
  });
});

test.describe("WORKFLOW_RUNS_CONTAINER_ATTRIBUTE_SELECTOR", () => {
  test("should select the workflow runs container", async ({ page }) => {
    await page.goto(
      "https://github.com/SpookSoftware/github-actions-browser-notifications/actions/workflows/waitAMinute.yml"
    );

    await page.waitForSelector(WORKFLOW_RUNS_CONTAINER_ATTRIBUTE_SELECTOR);

    const elements = await page.$$(WORKFLOW_RUNS_CONTAINER_ATTRIBUTE_SELECTOR);

    expect(elements.length).toBe(1);
  });
});

test.describe("CURRENTLY_RUNNING_ATTRIBUTE_SELECTOR", () => {
  test("should select workflows that are currently running", async ({
    page,
  }) => {
    await page.goto(
      "https://github.com/SpookSoftware/github-actions-browser-notifications/actions/workflows/waitAMinute.yml"
    );

    await page.waitForSelector(CURRENTLY_RUNNING_ATTRIBUTE_SELECTOR);

    const elements = await page.$$(CURRENTLY_RUNNING_ATTRIBUTE_SELECTOR);

    expect(elements.length).toBe(1);
  });
});
