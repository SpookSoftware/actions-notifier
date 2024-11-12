import { expect, describe, it } from "bun:test";
import pMemoize from "p-memoize";
import { parseHTML } from "linkedom";
import {
  WORKFLOW_RUN_ATTRIBUTE_SELECTOR,
  CURRENTLY_RUNNING_ATTRIBUTE_SELECTOR,
  QUEUED_ATTRIBUTE_SELECTOR,
  SUCCESSFUL_ATTRIBUTE_SELECTOR,
  WORKFLOW_RUNS_CONTAINER_ATTRIBUTE_SELECTOR,
  PR_CHECKS_CONTAINER_SELECTOR,
  PR_CHECKS_ACTION_LINK_SELECTOR,
} from "../extension/selectors";

async function dispatchWorkflow() {
  const token = process.env.SANDBOX_REPO_GITHUB_TOKEN;
  const url = `https://api.github.com/repos/SpookSoftware/sandbox/dispatches`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${token}`,
    },
    body: JSON.stringify({
      event_type: "wait-for-five-minutes",
    }),
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
  return request.text();
});

async function getMatchesFor(url: string, selector: string) {
  const html = await fetchDocument(url);
  const { document } = parseHTML(html);
  return document.querySelectorAll(selector);
}

describe("WORKFLOW_RUNS_CONTAINER_ATTRIBUTE_SELECTOR", () => {
  it("selects the workflow container", async () => {
    const matches = await getMatchesFor(
      "https://github.com/SpookSoftware/sandbox/actions",
      WORKFLOW_RUNS_CONTAINER_ATTRIBUTE_SELECTOR
    );
    expect(matches).toHaveLength(1);
  });
});

describe("WORKFLOW_RUN_ATTRIBUTE_SELECTOR", () => {
  it("selects the workflow runs", async () => {
    const matches = await getMatchesFor(
      "https://github.com/SpookSoftware/sandbox/actions",
      WORKFLOW_RUN_ATTRIBUTE_SELECTOR
    );
    expect(matches).toHaveLength(25);
  });
  it("does not select the parent element of the workflow runs", async () => {
    const matches = await getMatchesFor(
      "https://github.com/SpookSoftware/sandbox/actions",
      WORKFLOW_RUN_ATTRIBUTE_SELECTOR
    );
    expect(
      Array.from(matches).some(
        (match) => match.id === "partial-actions-workflow-runs"
      )
    ).toBeFalse();
  });
});

describe("SUCCESSFUL_ATTRIBUTE_SELECTOR", () => {
  it("selects successful workflow runs", async () => {
    const matches = await getMatchesFor(
      "https://github.com/SpookSoftware/sandbox/actions?query=is%3Asuccess",
      SUCCESSFUL_ATTRIBUTE_SELECTOR
    );
    expect(matches).toHaveLength(25);
  });
});

describe("CURRENTLY_RUNNING_ATTRIBUTE_SELECTOR", () => {
  it("selects currently running workflows", async () => {
    // Start a workflow and give it a little time to start up.
    await dispatchWorkflow();
    await Bun.sleep(10_000);

    const matches = await getMatchesFor(
      "https://github.com/SpookSoftware/sandbox/actions?query=is%3Ain_progress",
      CURRENTLY_RUNNING_ATTRIBUTE_SELECTOR
    );
    expect(matches.length).toBeGreaterThanOrEqual(1);
  }, 20_000);
});
