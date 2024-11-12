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
