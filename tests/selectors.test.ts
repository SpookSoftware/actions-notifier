import { test, expect, Page } from '@playwright/test';

test.describe('GitHub Selectors Validation', () => {

  test.beforeEach(async ({ page }) => {
    await loginToGitHub(page);
  });

	test('Validate selector for workflow runs', async ({ page }) => {
		// Navigate to the GitHub Actions page
		await page.goto('https://github.com/owner/repository/actions');
	
		// Wait for the page to load necessary elements
		await page.waitForSelector("[data-url*='workflow-run']");
	
		const WORKFLOW_RUN_ATTRIBUTE_SELECTOR = "[data-url*='workflow-run']";
	
		// Use the selector
		const elements = await page.$$(WORKFLOW_RUN_ATTRIBUTE_SELECTOR);
	
		// Assert that elements are found
		expect(elements.length).toBeGreaterThan(0);
	});

});
