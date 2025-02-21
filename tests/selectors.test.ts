import { expect, describe, it, beforeAll } from "bun:test";
import pMemoize from "p-memoize";
import { parseHTML } from "linkedom";
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
} from "../extension/selectors";

async function dispatchWorkflow({ token, body, workflowURL }) {
  const response = await fetch(workflowURL, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${token}`,
    },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to dispatch workflow: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  return response.json();
}

const fetchDocument = pMemoize(async (url: string): Promise<string> => {
  const request = await fetch(url, {
    headers: {
      Accept: "text/html",
    },
  });
  return await request.text();
});

async function getMatchesFor(url: string, selector: string) {
  const html = await fetchDocument(url);
  const { document } = parseHTML(html);
  return document.querySelectorAll(selector);
}

beforeAll(async () => {
  if (!process.env.SANDBOX_REPO_GITHUB_TOKEN) {
    throw new Error("SANDBOX_REPO_GITHUB_TOKEN is not set.");
  }
  await dispatchWorkflow({
    token: process.env.SANDBOX_REPO_GITHUB_TOKEN,
    workflowURL:
      "https://api.github.com/repos/SpookSoftware/sandbox/dispatches",
    body: JSON.stringify({ event_type: "wait-for-five-minutes" }),
  });

  await Bun.sleep(30_000);
});

describe("Actions selectors", () => {
  describe("ACTION_RUNS_CONTAINER_SELECTOR", () => {
    it("selects the action container", async () => {
      const matches = await getMatchesFor(
        "https://github.com/SpookSoftware/sandbox/actions",
        ACTION_RUNS_CONTAINER_SELECTOR
      );
      expect(matches).toHaveLength(1);
    });
  });

  describe("ACTION_RUNS_SELECTOR", () => {
    it("selects the action runs", async () => {
      const matches = await getMatchesFor(
        "https://github.com/SpookSoftware/sandbox/actions",
        ACTION_RUNS_SELECTOR
      );
      expect(matches).toHaveLength(25);
    });
    it("does not select the parent element of the action runs", async () => {
      const matches = await getMatchesFor(
        "https://github.com/SpookSoftware/sandbox/actions",
        ACTION_RUNS_SELECTOR
      );
      expect(
        Array.from(matches).some(
          (match) => match.id === "partial-actions-workflow-runs"
        )
      ).toBeFalse();
    });
  });

  describe("SUCCESSFUL_SELECTOR", () => {
    it("selects successful action runs", async () => {
      const matches = await getMatchesFor(
        "https://github.com/SpookSoftware/sandbox/actions?query=is%3Asuccess",
        SUCCESSFUL_SELECTOR
      );
      expect(matches).toHaveLength(25);
    });
  });

  describe("CURRENTLY_RUNNING_SELECTOR", () => {
    it("selects currently running actions", async () => {
      const matches = await getMatchesFor(
        "https://github.com/SpookSoftware/sandbox/actions?query=is%3Ain_progress",
        CURRENTLY_RUNNING_SELECTOR
      );
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("Job selectors", () => {
  describe("JOB_RUNS_CONTAINER_SELECTOR", () => {
    it("selects the container that has all the job elements", async () => {
      const jobRunsContainer = await getMatchesFor(
        "https://github.com/SpookSoftware/sandbox/actions/runs/13338664329",
        JOB_RUNS_CONTAINER_SELECTOR
      );

      expect(jobRunsContainer).toHaveLength(1);

      // There are 9 simply because that's how many I made.
      const expectedJobs = 9;

      const actualJobs = jobRunsContainer[0].querySelectorAll(JOB_RUN_SELECTOR);

      expect(expectedJobs).toEqual(actualJobs.length);
    });
  });
  describe("JOB_RUN_SELECTOR", () => {
    it("selects all the job runs in a runs page", async () => {
      const matches = await getMatchesFor(
        "https://github.com/SpookSoftware/sandbox/actions/runs/12384934580",
        JOB_RUN_SELECTOR
      );
      expect(matches).toHaveLength(9);
    });
  });

  describe("SUCCESSFUL_JOB_RUN_SELECTOR", () => {
    it("selects the successful job runs in a runs page", async () => {
      const matches = await getMatchesFor(
        "https://github.com/SpookSoftware/sandbox/actions/runs/12384934580",
        SUCCESSFUL_JOB_RUN_SELECTOR
      );
      expect(matches).toHaveLength(8);
    });
  });

  describe("FAILED_JOB_RUN_SELECTOR", () => {
    it("selects the failed job runs in a runs page", async () => {
      const matches = await getMatchesFor(
        "https://github.com/SpookSoftware/sandbox/actions/runs/12384934580",
        FAILED_JOB_RUN_SELECTOR
      );
      expect(matches).toHaveLength(1);
    });
  });
});

// This section requires JS to work, so I'll probably need to move to puppeteer for the whole thing.
describe.skip("PR selectors", () => {
  describe("PR_CHECKS_CONTAINER_GRANDPARENT_SELECTOR", () => {
    it("selects the PR checks container", async () => {
      const matches = await getMatchesFor(
        "https://github.com/SpookSoftware/sandbox/pull/1?new_mergebox=false",
        PR_CHECKS_CONTAINER_GRANDPARENT_SELECTOR
      );
      expect(matches).toHaveLength(1);
    });
  });
  describe("PR_CHECKS_CONTAINER_PARENT_SELECTOR", () => {
    it("selects the proper container", async () => {
      const matches = await getMatchesFor(
        "https://github.com/SpookSoftware/sandbox/pull/1?new_mergebox=false",
        PR_CHECKS_CONTAINER_PARENT_SELECTOR
      );
      expect(matches).toHaveLength(1);
    });
  });
  describe("PR_CHECKS_CONTAINER_SELECTOR", () => {
    it("selects the PR checks container", async () => {
      const matches = await getMatchesFor(
        "https://github.com/SpookSoftware/sandbox/pull/1/checks",
        PR_CHECKS_CONTAINER_SELECTOR
      );
      expect(matches).toHaveLength(1);
    });
  });
});
