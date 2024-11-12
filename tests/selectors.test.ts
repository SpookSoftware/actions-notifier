import { expect, describe, it } from "bun:test";
import { writeFile, mkdir, unlink, readFile, access } from "node:fs/promises";
import pMemoize from "p-memoize";
import filenamify from "filenamify";
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

const fsCache = {
  async get(path: string): Promise<string | undefined> {
    try {
      const value = await readFile(path, "utf8");
      return value;
    } catch {
      return undefined;
    }
  },
  async set(path: string, contents: string): Promise<void> {
    await mkdir("./tests/.cache", { recursive: true });
    await writeFile(path, contents);
  },
  async has(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  },
  async delete(path: string): Promise<void> {
    await unlink(path);
  },
} as const;

const fetchDocument = pMemoize(
  async (url: string): Promise<string> => {
    const request = await fetch(url, {
      headers: {
        Accept: "text/html",
      },
    });
    return request.text();
  },
  {
    cacheKey: ([url]) =>
      `./tests/.cache/${filenamify(
        url.replace("https://github.com", "")
      )}.html`,
    cache: fsCache,
  }
);

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
