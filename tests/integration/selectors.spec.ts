import { test, expect } from "@playwright/test";
import {
  ACTION_RUNS_SELECTOR,
  CURRENTLY_RUNNING_SELECTOR,
  SUCCESSFUL_SELECTOR,
  ACTION_RUNS_CONTAINER_SELECTOR,
  JOB_RUN_SELECTOR,
  SUCCESSFUL_JOB_RUN_SELECTOR,
  FAILED_JOB_RUN_SELECTOR,
  JOB_RUNS_CONTAINER_SELECTOR,
  PR_CHECKS_CONTAINER_GRANDPARENT_SELECTOR,
  PR_CHECKS_CONTAINER_SELECTOR,
  PR_CHECKS_CONTAINER_PARENT_SELECTOR,
  CHECKS_PAGE_CONTAINER_SELECTOR,
} from "../../src/selectors";

if (!process.env.SANDBOX_REPO_GITHUB_TOKEN) {
  throw new Error("SANDBOX_REPO_GITHUB_TOKEN is not set.");
}

test.describe("Actions selectors", () => {
  test.describe.configure({ retries: 3 });
  test("ACTION_RUNS_CONTAINER_SELECTOR selects the action container", async ({
    page,
  }) => {
    await page.goto("https://github.com/SpookSoftware/sandbox/actions");
    await page.waitForSelector(ACTION_RUNS_CONTAINER_SELECTOR);
    const matches = await page.locator(ACTION_RUNS_CONTAINER_SELECTOR).count();
    expect(matches).toBe(1);
  });

  test("ACTION_RUNS_SELECTOR selects the action runs", async ({ page }) => {
    await page.goto("https://github.com/SpookSoftware/sandbox/actions");
    await page.waitForSelector(ACTION_RUNS_SELECTOR);
    const matches = await page.locator(ACTION_RUNS_SELECTOR).count();
    expect(matches).toBe(25);
  });

  test("ACTION_RUNS_SELECTOR does not select the parent element of the action runs", async ({
    page,
  }) => {
    await page.goto("https://github.com/SpookSoftware/sandbox/actions");
    await page.waitForSelector(ACTION_RUNS_SELECTOR);
    const matches = await page.locator(ACTION_RUNS_SELECTOR);
    const hasParent = await matches.evaluateAll((elements) =>
      elements.some((match) => match.id === "partial-actions-workflow-runs")
    );
    expect(hasParent).toBeFalsy();
  });

  test("SUCCESSFUL_SELECTOR selects successful action runs", async ({
    page,
  }) => {
    await page.goto(
      "https://github.com/SpookSoftware/sandbox/actions?query=is%3Asuccess"
    );
    await page.waitForSelector(SUCCESSFUL_SELECTOR);
    const matches = await page.locator(SUCCESSFUL_SELECTOR).count();
    expect(matches).toBe(25);
  });

  test("CURRENTLY_RUNNING_SELECTOR selects currently running actions", async ({
    page,
  }) => {
    const actionStartResponse = await fetch(
      "https://api.github.com/repos/SpookSoftware/sandbox/dispatches",
      {
        method: "POST",
        body: JSON.stringify({ event_type: "wait-for-five-minutes" }),
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
    await page.goto(
      "https://github.com/SpookSoftware/sandbox/actions?query=is%3Ain_progress"
    );
    await page.waitForSelector(CURRENTLY_RUNNING_SELECTOR);
    const matches = await page.locator(CURRENTLY_RUNNING_SELECTOR).count();
    expect(matches).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Job selectors", () => {
  test("JOB_RUNS_CONTAINER_SELECTOR selects the container that has all job elements", async ({
    page,
  }) => {
    await page.goto(
      "https://github.com/SpookSoftware/sandbox/actions/runs/13338664329"
    );
    await page.waitForSelector(JOB_RUNS_CONTAINER_SELECTOR);

    const jobRunsContainer = await page.locator(JOB_RUNS_CONTAINER_SELECTOR);
    expect(await jobRunsContainer.count()).toBe(1);

    const actualJobs = await jobRunsContainer.locator(JOB_RUN_SELECTOR).count();
    expect(actualJobs).toBe(9);
  });

  test("JOB_RUN_SELECTOR selects all the job runs in a runs page", async ({
    page,
  }) => {
    await page.goto(
      "https://github.com/SpookSoftware/sandbox/actions/runs/12384934580"
    );
    await page.waitForSelector(JOB_RUN_SELECTOR);
    const matches = await page.locator(JOB_RUN_SELECTOR).count();
    expect(matches).toBe(9);
  });

  test("SUCCESSFUL_JOB_RUN_SELECTOR selects successful job runs", async ({
    page,
  }) => {
    await page.goto(
      "https://github.com/SpookSoftware/sandbox/actions/runs/12384934580"
    );
    await page.waitForSelector(SUCCESSFUL_JOB_RUN_SELECTOR);
    const matches = await page.locator(SUCCESSFUL_JOB_RUN_SELECTOR).count();
    expect(matches).toBe(8);
  });

  test("FAILED_JOB_RUN_SELECTOR selects failed job runs", async ({ page }) => {
    await page.goto(
      "https://github.com/SpookSoftware/sandbox/actions/runs/12384934580"
    );
    await page.waitForSelector(FAILED_JOB_RUN_SELECTOR);
    const matches = await page.locator(FAILED_JOB_RUN_SELECTOR).count();
    expect(matches).toBe(1);
  });
});

// We need to be signed in for these to work, apparently. Will consider how to get around that later.
test.describe.skip("PR selectors", () => {
  test("PR_CHECKS_CONTAINER_GRANDPARENT_SELECTOR selects the PR checks container", async ({
    page,
  }) => {
    await page.goto(
      "https://github.com/SpookSoftware/sandbox/pull/1?new_mergebox=false"
    );
    await page.waitForSelector(PR_CHECKS_CONTAINER_GRANDPARENT_SELECTOR);
    const matches = await page
      .locator(PR_CHECKS_CONTAINER_GRANDPARENT_SELECTOR)
      .count();
    expect(matches).toBe(1);
  });

  test("PR_CHECKS_CONTAINER_PARENT_SELECTOR selects the proper container", async ({
    page,
  }) => {
    await page.goto(
      "https://github.com/SpookSoftware/sandbox/pull/1?new_mergebox=false"
    );

    await page
      .locator(PR_CHECKS_CONTAINER_PARENT_SELECTOR)
      .first()
      .scrollIntoViewIfNeeded();
    await page.waitForSelector(PR_CHECKS_CONTAINER_PARENT_SELECTOR);
    const matches = await page
      .locator(PR_CHECKS_CONTAINER_PARENT_SELECTOR)
      .count();
    expect(matches).toBe(1);
  });

  test("PR_CHECKS_CONTAINER_SELECTOR selects the PR checks container", async ({
    page,
  }) => {
    await page.goto("https://github.com/SpookSoftware/sandbox/pull/1/checks");
    await page.waitForSelector(PR_CHECKS_CONTAINER_SELECTOR);
    const matches = await page.locator(PR_CHECKS_CONTAINER_SELECTOR).count();
    expect(matches).toBe(1);
  });
});

test.describe("Checks selectors", () => {
  test.skip("IN_PROGRESS_SELECTOR", async ({ page }) => {
    // For this, we will need to toggle the checkbox on a PR, then navigate to the checks page and look for > 1 checks.
  });
  test("CHECKS_PAGE_CONTAINER_SELECTOR selects the checks container", async ({
    page,
  }) => {
    await page.goto("https://github.com/SpookSoftware/sandbox/pull/1/checks");
    await page.waitForSelector(CHECKS_PAGE_CONTAINER_SELECTOR);
    const matches = await page.locator(CHECKS_PAGE_CONTAINER_SELECTOR).count();
    expect(matches).toBe(1);
  });
});
