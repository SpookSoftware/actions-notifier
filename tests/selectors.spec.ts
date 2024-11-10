import { test, expect } from "@playwright/test";
import { WORKFLOW_RUN_ATTRIBUTE_SELECTOR } from "../extension/selectors";

test.describe("WORKFLOW_RUN_ATTRIBUTE_SELECTOR", () => {
  test("should see workflow elements", async ({ page }) => {
		await page.goto('https://github.com/SpookSoftware/github-actions-browser-notifications/actions')

				await page.waitForSelector(WORKFLOW_RUN_ATTRIBUTE_SELECTOR);

				const elements = await page.$$(WORKFLOW_RUN_ATTRIBUTE_SELECTOR);
		
				expect(elements.length).toBeGreaterThan(0);
	});
});
