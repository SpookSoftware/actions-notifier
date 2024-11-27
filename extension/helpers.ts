import partial from "lodash/partial";
import {
  CURRENTLY_RUNNING_ATTRIBUTE_SELECTOR,
  QUEUED_ATTRIBUTE_SELECTOR,
} from "./selectors";
import { MonitorRequest } from "../types";

export function shouldAddActionNotificationButton(url: string) {
  // This is black magic. Basically, this regex matches the following kinds of URLs:
  // - https://github.com/SpookSoftware/github-actions-browser-notifications/actions
  // - https://github.com/SpookSoftware/github-actions-browser-notifications/pull/22932/checks
  // - https://github.com/SpookSoftware/github-actions-browser-notifications/actions/workflows/waitAMinute.yml
  const pattern =
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/(actions|actions\/workflows\/[^/]+|pull\/[^/]+\/checks)$/;
  return pattern.test(url);
}

export function createNotificationButton({
  runId,
  jobId,
  owner,
  repository,
}: {
  runId?: string;
  jobId?: string;
  owner: string;
  repository: string;
}) {
  const button = document.createElement("button");
  button.classList.add("Button");
  button.dataset.runId = runId;
  button.dataset.jobId = jobId;
  button.dataset.owner = owner;
  button.dataset.repository = repository;
  return button;
}

export function createNotificationSVG() {
  const NOTIFICATION_BELL_PATH =
    "M12 1c3.681 0 7 2.565 7 6v4.539c0 .642.189 1.269.545 1.803l2.2 3.298A1.517 1.517 0 0 1 20.482 19H15.5a3.5 3.5 0 1 1-7 0H3.519a1.518 1.518 0 0 1-1.265-2.359l2.2-3.299A3.25 3.25 0 0 0 5 11.539V7c0-3.435 3.318-6 7-6ZM6.5 7v4.539a4.75 4.75 0 0 1-.797 2.635l-2.2 3.298-.003.01.001.007.004.006.006.004.007.001h16.964l.007-.001.006-.004.004-.006.001-.006a.017.017 0 0 0-.003-.01l-2.199-3.299a4.753 4.753 0 0 1-.798-2.635V7c0-2.364-2.383-4.5-5.5-4.5S6.5 4.636 6.5 7ZM14 19h-4a2 2 0 1 0 4 0Z";
  const NOTIFICATION_BELL_VIEW_BOX = "0 0 24 24";
  const NOTIFICATION_BELL_WIDTH = "24";
  const NOTIFICATION_BELL_HEIGHT = "24";
  const svgElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  svgElement.setAttributeNS(null, "viewBox", NOTIFICATION_BELL_VIEW_BOX);
  svgElement.setAttributeNS(null, "width", NOTIFICATION_BELL_WIDTH);
  svgElement.setAttributeNS(null, "height", NOTIFICATION_BELL_HEIGHT);

  svgElement.classList.add("octicon");
  svgElement.classList.add("color-fg-muted");

  const pathElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  pathElement.setAttributeNS(null, "d", NOTIFICATION_BELL_PATH);

  svgElement.appendChild(pathElement);
  return svgElement;
}

export function selectorMatches(selector: string, item: Element) {
  return item.matches(selector);
}

export function selectorHasChildren(selector: string, item: Element) {
  return item.querySelector(selector) !== null;
}

const isQueued = partial(selectorHasChildren, QUEUED_ATTRIBUTE_SELECTOR);
const isRunning = partial(
  selectorHasChildren,
  CURRENTLY_RUNNING_ATTRIBUTE_SELECTOR
);
export const isQueuedOrRunning = (x: Element): Boolean =>
  isQueued(x) || isRunning(x);

export function getCurrentlyRunningOrQueuedWorkflowElements(
  divs: NodeListOf<Element>
) {
  return [...divs].filter(isQueuedOrRunning);
}

/**
 * Extracts action data from a given GitHub Actions URL.
 *
 * @param url - The URL string to extract data from.
 * @returns An object containing the owner, repository, and runId extracted from the URL.
 * @throws Will throw an error if the URL is invalid or if any of the expected parts (owner, repository, runId) are missing.
 * 
 * @example
const exampleURL = "https://github.com/SpookSoftware/sandbox/actions/runs/11883722967";
try {
  const actionData = extractActionDataFromURL(exampleURL);
  console.log(actionData) // -> { owner: 'SpookSoftware', repository: 'sandbox', runId: '11883722967' }
} catch (error) {
  console.error(error.message);
}
 */
export function extractActionDataFromURL(url: string) {
  const isValidURL = URL.canParse(url);
  if (isValidURL) {
    const [_, _2, _3, owner, repository, _4, _5, runId] = url.split("/");
    [
      { property: owner, key: "owner" },
      { property: repository, key: "repository" },
      { property: runId, key: "runId" },
    ].forEach(({ property, key }) => {
      if (!property) {
        throw Error(`Missing ${key}`);
      }
    });
    return { owner, repository, runId };
  }
  throw Error("Invalid URL: " + url);
}

/**
 * Creates a callback function that sends a message to the background script to start monitoring a given run.
 * @returns A function that sends a message to the background script to start monitoring the given run.
 */
export function createMonitoringHandler({
  runId,
  owner,
  repository,
  svg,
}: {
  runId: string;
  owner: string;
  repository: string;
  svg: SVGElement;
}) {
  return (_event: MouseEvent) => {
    const message: MonitorRequest = {
      runId,
      owner,
      repository,
      type: "action",
    };
    chrome.runtime.sendMessage(message, (response) => {
      const status = response?.status;
      if (status) {
        if (status === "ok") {
          svg.style.color = "yellow";
          svg.classList.remove("color-fg-muted");
        } else {
          svg.style.color = "red";
          svg.classList.remove("color-fg-muted");
        }
      }
    });
  };
}

async function assertGithubToken() {
  const token = await chrome.storage.sync.get("githubToken");

  if (!token) {
    throw Error("Expected Github token to be available");
  }

  return token.githubToken;
}

export async function checkActionStatus(runId, owner, repository) {
  const token = await assertGithubToken();
  const url = `https://api.github.com/repos/${owner}/${repository}/actions/runs/${runId}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  const data = await response.json();

  return {
    status: data.status,
    name: data.name,
  };
}

export async function checkJobStatus(jobId, owner, repository) {
  const token = await assertGithubToken();
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repository}/actions/jobs/${jobId}`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  const data = await response.json();

  return {
    status: data.status,
    name: data.name,
  };
}

export const createWorkflowRunCallback = (callback: Function) => {
  return function (mutationsList: MutationRecord[]) {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        for (const addedNode of mutation.addedNodes) {
          if (addedNode.nodeType === Node.ELEMENT_NODE) {
            console.group();
            console.debug("A new element was added:", addedNode);
            if (isQueuedOrRunning(addedNode as Element)) {
              console.debug("It's a workflow run dom node");
              callback();
            } else {
              console.debug("It's not a workflow run dom node");
            }
            console.groupEnd();
          }
        }
      }
    }
  };
};

export function parseRequest(request: MonitorRequest) {
  try {
    if (request.type === "action") {
      const { runId, owner, repository } = request;
      return {
        runId,
        owner,
        repository,
      };
    } else if (request.type === "job") {
      const { runId, jobId, owner, repository } = request;
      return {
        runId,
        jobId,
        owner,
        repository,
      };
    }
  } catch (error) {
    throw Error(
      `Error parsing request: ${error.message}. It's likely that one of runId, jobId, owner, or repository is missing.`
    );
  }
  throw Error(
    `Request was in a format not recognized: ${JSON.stringify(request)}`
  );
}

export function encodeRequest(
  request: MonitorRequest
): `${string}|${string}|${string}` | `${string}|${string}|${string}|${string}` {
  if (request.type === "action") {
    const { runId, owner, repository } = parseRequest(request);
    return `${runId}|${owner}|${repository}`;
  } else if (request.type === "job") {
    const { runId, jobId, owner, repository } = parseRequest(request);
    return `${runId}|${jobId}|${owner}|${repository}`;
  }
  throw Error(
    `Request was in a format not recognized: ${JSON.stringify(request)}`
  );
}
