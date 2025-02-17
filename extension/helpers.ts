import { CURRENTLY_RUNNING_SELECTOR, QUEUED_SELECTOR } from "./selectors";

import type {
  Encoded,
  MonitorRequest,
  MonitorRequestType,
  MonitorResponse,
  StartMonitorRequest,
  StopMonitorRequest,
} from "../types";

export function sendMessageAsync(payload: unknown): Promise<MonitorResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(payload, resolve);
  });
}

export function shouldMonitorActions(url: string) {
  // This is black magic. Basically, this regex matches the following kinds of URLs:
  // - https://github.com/SpookSoftware/github-actions-browser-notifications/actions
  // - https://github.com/SpookSoftware/github-actions-browser-notifications/pull/22932/checks
  // - https://github.com/SpookSoftware/github-actions-browser-notifications/actions/workflows/waitAMinute.yml
  const pattern =
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/(actions|actions\/workflows\/[^/]+|pull\/[^/]+\/checks)$/;
  return pattern.test(url);
}

export function shouldAddJobNotificationButton(url: string) {
  const runsPattern =
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/\d+$/;
  const specificJobPattern =
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/\d+\/job\/\d+$/;
  const specificJobPatternWithOptionalQueryParams =
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/\d+\/job\/\d+\?/;
  return (
    runsPattern.test(url) ||
    specificJobPattern.test(url) ||
    specificJobPatternWithOptionalQueryParams.test(url)
  );
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
  button.classList.add("gh-action-notifier-button");
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

export function selectorMatches<
  HasMatches extends {
    matches: Function;
  }
>(selector: string, item: HasMatches) {
  return item.matches(selector);
}

export function selectorHasChildren<
  HasQuerySelector extends {
    querySelector: Function;
  }
>(selector: string, item: HasQuerySelector) {
  return item.querySelector(selector) !== null;
}

const isQueued = (el: any) => {
  return selectorHasChildren(QUEUED_SELECTOR, el);
};
const isRunning = (el: any) => {
  return selectorHasChildren(CURRENTLY_RUNNING_SELECTOR, el);
};
export function isQueuedOrRunning<
  HasQuerySelector extends {
    querySelector: Function;
  }
>(x: HasQuerySelector) {
  return isQueued(x) || isRunning(x);
}

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
    //  https://github.com/SpookSoftware/sandbox/actions/runs/12447719676
    //                         owner      repo                 runId
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

export function extractJobDataFromURL(url: string) {
  const isValidURL = URL.canParse(url);
  if (isValidURL) {
    const [_, _2, _3, owner, repository, _4, _5, runId, _6, jobId] =
      url.split("/");
    //  https://github.com/SpookSoftware/sandbox/actions/runs/12447719676/job/34751516975
    //                         owner      repo                 runId            jobId
    [
      { property: owner, key: "owner" },
      { property: repository, key: "repository" },
      { property: runId, key: "runId" },
      { property: jobId, key: "jobId" },
    ].forEach(({ property, key }) => {
      if (!property) {
        throw Error(`Missing ${key}`);
      }
    });
    return { owner, repository, runId, jobId };
  }
  throw Error("Invalid URL: " + url);
}

export function buildMonitoringPayloads({
  runId,
  jobId,
  owner,
  repository,
}: {
  runId: string;
  jobId?: string;
  owner: string;
  repository: string;
}): { start: StartMonitorRequest; stop: StopMonitorRequest } {
  const base: StartMonitorRequest = {
    runId,
    owner,
    repository,
    task: "start-monitoring",
    type: "action",
  };

  const start = jobId
    ? { ...base, jobId, type: "job" as MonitorRequestType }
    : base;

  const stop: StopMonitorRequest = {
    ...start,
    task: "stop-monitoring",
  };

  return { start, stop };
}

/**
 * Creates a callback function that sends a message to the background script to start monitoring a given run.
 * @returns A function that sends a message to the background script to start or stop monitoring the given run.
 */
export function createMonitorToggleHandler({
  runId,
  jobId,
  owner,
  repository,
  svg,
}: {
  runId: string;
  jobId?: string;
  owner: string;
  repository: string;
  svg: SVGElement;
}) {
  const { start: startMonitorPayload, stop: stopMonitorPayload } =
    buildMonitoringPayloads({
      runId,
      jobId,
      owner,
      repository,
    });

  // In case future me forgets, all the dynamic "runtime-y" stuff has to happen here, because this is what's actually getting called when the function gets clicked.
  async function sendMonitoringMessage(_event: MouseEvent) {
    const isAlreadyMonitored = await isIdAlreadyMonitored({
      runId,
      jobId,
      owner,
      repository,
    });
    if (!isAlreadyMonitored) {
      const startResponse = await sendMessageAsync(startMonitorPayload);
      if (startResponse.status === "ok") {
        setSVGColor(svg, "yellow");
      } else {
        setSVGColor(svg, "red");
      }
    } else {
      const stopResponse = await sendMessageAsync(stopMonitorPayload);
      if (stopResponse.status === "ok") {
        resetSVGColor(svg);
      } else {
        setSVGColor(svg, "red");
      }
    }
  }

  return sendMonitoringMessage;
}

export function isIdAlreadyMonitored(
  id:
    | Encoded
    | { runId: string; jobId?: string; owner: string; repository: string }
) {
  if (typeof id === "string") {
    return new Promise((resolve) => {
      chrome.storage.local.get(id, (result) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error occurred while checking if id was already monitored",
            chrome.runtime.lastError
          );
          resolve(false);
        }
        resolve(Object.keys(result).length > 0);
      });
    });
  } else {
    return isIdAlreadyMonitored(encode(id));
  }
}

export function setSVGColor(svg: SVGElement, color: string) {
  svg.style.color = color;
  svg.classList.remove("color-fg-muted");
}

export function resetSVGColor(svg: SVGElement) {
  svg.style.color = "";
  svg.classList.add("color-fg-muted");
}

export async function assertGithubToken() {
  const token = await chrome.storage.sync.get("githubToken");

  if (!token) {
    throw Error("Expected Github token to be available");
  }

  return token.githubToken;
}

export async function checkStatus({
  runId,
  owner,
  repository,
  jobId,
}: {
  runId: string;
  owner: string;
  repository: string;
  jobId?: string;
}) {
  if (jobId) {
    return await checkJobStatus({ jobId, owner, repository });
  } else {
    return await checkActionStatus({ runId, owner, repository });
  }
}

export async function checkActionStatus({ runId, owner, repository }) {
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

export async function checkJobStatus({ jobId, owner, repository }) {
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

export const createWorkflowRunCallback = (onObservationChange: Function) => {
  return function (mutationsList: MutationRecord[]) {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        for (const addedNode of mutation.addedNodes) {
          if (addedNode instanceof Element) {
            console.debug("A new element was added:", addedNode);
            if (isQueuedOrRunning(addedNode)) {
              console.debug("It is a queued or running workflow run DOM node");
              onObservationChange();
            } else {
              console.debug("It's not a workflow run DOM node");
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

// todo: turn this into a real type, since I use it everywhere.
export function encode({
  runId,
  jobId,
  owner,
  repository,
}: {
  runId: string;
  jobId?: string;
  owner: string;
  repository: string;
}): Encoded {
  if (jobId) {
    return `${runId}|${jobId}|${owner}|${repository}`;
  } else {
    return `${runId}|${owner}|${repository}`;
  }
}

export function encodeRequest(request: MonitorRequest): Encoded {
  if (request.type === "action") {
    const { runId, owner, repository } = request;
    return encode({ runId, owner, repository });
  } else if (request.type === "job") {
    const { runId, jobId, owner, repository } = request;
    return encode({ runId, jobId, owner, repository });
  }
  throw Error(
    `Request was in a format not recognized: ${JSON.stringify(request)}`
  );
}

export function decode(name: Encoded) {
  const split = name.split("|");
  if (split.length === 3) {
    const [runId, owner, repository] = split;
    return { runId, owner, repository };
  } else if (split.length === 4) {
    const [runId, jobId, owner, repository] = split;
    return { runId, jobId, owner, repository };
  }
  throw Error("Unexpected name format: " + name);
}

export function isProperlyEncoded(string: string): string is Encoded {
  const parts = string.split("|");
  return parts.length === 3 || parts.length === 4;
}

export function createActionURL({
  runId,
  owner,
  repository,
}: {
  runId: string;
  owner: string;
  repository: string;
}) {
  return `https://github.com/${owner}/${repository}/actions/runs/${runId}`;
}

export function createJobURL({
  runId,
  jobId,
  owner,
  repository,
}: {
  runId: string;
  jobId?: string;
  owner: string;
  repository: string;
}) {
  return `https://github.com/${owner}/${repository}/actions/runs/${runId}/job/${jobId}`;
}

export function createURL({
  runId,
  jobId,
  owner,
  repository,
}: {
  runId: string;
  jobId?: string;
  owner: string;
  repository: string;
}) {
  if (jobId) {
    return createJobURL({ runId, jobId, owner, repository });
  } else {
    return createActionURL({ runId, owner, repository });
  }
}

const GENERATE_TOKEN_URL =
  "https://github.com/settings/tokens/new?description=Github%20Browser%20Notifications&scopes=repo";

// Must be dispatcher because it is an action! Logicless!
export function createOnAlarmCallback(
  whenStatusIsCompleteCallback: (
    alarm: chrome.alarms.Alarm,
    taskName: string
  ) => Promise<void>
) {
  return async (alarm: chrome.alarms.Alarm) => {
    if (!isProperlyEncoded(alarm.name)) {
      throw Error("Unexpected alarm name format: " + alarm.name);
    }
    const decoded = decode(alarm.name);
    const runId = decoded.runId;
    const owner = decoded.owner;
    const repository = decoded.repository;
    const jobId = decoded.jobId;

    const { status, name: taskName } = await checkStatus({
      runId,
      owner,
      repository,
      jobId,
    });

    console.debug(`Alarm ${alarm.name} fired with status ${status}`);

    if (status === "completed") {
      whenStatusIsCompleteCallback(alarm, taskName);
    }
  };
}

function isStartMonitoringRequest(
  request: MonitorRequest
): request is StartMonitorRequest {
  return request.task === "start-monitoring";
}

function isStopMonitoringRequest(
  request: MonitorRequest
): request is StopMonitorRequest {
  return request.task === "stop-monitoring";
}

// Using promises here is necessary because of the chrome runtime's poor async support.
export function createOnMessageCallback(
  setupMonitoring: (id: string, lengthInMinutes: number) => Promise<void[]>,
  cancelMonitoring: (id: string) => Promise<[boolean, void]>
) {
  return (
    request: MonitorRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: MonitorResponse) => void
  ) => {
    if (isStartMonitoringRequest(request)) {
      const encoded = encodeRequest(request);

      console.debug(`Received request to monitor ${encoded}`);

      setupMonitoring(encoded, 0.1)
        .then((_res) => {
          console.debug(`Started monitoring for id ${encoded}`);
          sendResponse({ status: "ok" });
        })
        .catch((err) => {
          console.error(`Monitoring setup failed for id ${encoded}`);
          sendResponse({ status: "error", error: err });
        });
    } else if (isStopMonitoringRequest(request)) {
      const encoded = encodeRequest(request);

      console.debug(`Received request to stop monitoring ${encoded}`);

      cancelMonitoring(encoded)
        .then((_res) => {
          console.debug(`Stopped monitoring for id ${encoded}`);
          sendResponse({ status: "ok" });
        })
        .catch((err) => {
          console.error(`Monitoring cancellation failed for id ${encoded}`);
          sendResponse({ status: "error", error: err });
        });
    } else {
      throw Error(
        `Unexpected request task ${
          request.task
        }. Full request for debugging: ${JSON.stringify(request)}`
      );
    }
    // This signals to chrome that the connection will remain open until sendResponse is called.
    return true;
  };
}

/**
 * Given a workflow run div, grabs the div that's between the branch name and the "this was last run on" icons.
 */
// Todo: maybe we test this with actual selectors?
export function getElementToInsertNotificationButtonInto(
  workflowRunElement: Element
) {
  const childDiv = workflowRunElement.children[0];
  if (!childDiv) {
    throw Error("Expected children to be present");
  }
  const betweenBranchAndTime = childDiv.children[2];
  if (!betweenBranchAndTime) {
    throw Error(
      "Element does not have the expected structure of a workflow run element"
    );
  }
  return betweenBranchAndTime;
}

/**
 * On workflow run pages, like https://github.com/SpookSoftware/sandbox/actions/workflows/waitXMinutes.yml, inserts the supplied button
 * between the branch name and the "this was last run on" icons.
 */
export function magicallyInsertButtonInRightPlace({
  button,
  workflowRunElement,
}: {
  button: HTMLButtonElement;
  workflowRunElement: Element;
}) {
  const betweenBranchAndTime =
    getElementToInsertNotificationButtonInto(workflowRunElement);
  const childDiv = workflowRunElement.children[0];
  childDiv.insertBefore(button, betweenBranchAndTime);
}

export function insertButtonIntoJob(button: Element, jobLi: Element) {
  jobLi.insertAdjacentElement("beforeend", button);
}

export function assertIsHTMLElement(
  element: Element
): asserts element is HTMLElement {
  const isHTMLElement = element instanceof HTMLElement;
  console.assert(isHTMLElement, "Expected element to be an HTMLElement");
  if (!isHTMLElement) {
    throw Error("Expected element to be an HTMLElement");
  }
}

export function isAlreadyButtoned(element: Element) {
  return element.querySelector(".gh-action-notifier-button");
}

export class AutoDisconnectingMutationObserver {
  private observer: MutationObserver;
  private activeTarget: Element | null;
  public mode: "normal" | "debug";

  constructor(callback: MutationCallback, mode: "normal" | "debug" = "normal") {
    this.observer = new MutationObserver(callback);
    this.activeTarget = null;
    this.mode = mode;

    if (this.mode === "debug") {
      console.group("[ScopedMutationObserver]");
    }
    // Handle normal full-page navigations
    window.addEventListener("pagehide", () => {
      if (this.mode === "debug") {
        console.debug(
          "[ScopedMutationObserver] Disconnecting due to: pagehide event (standard navigation)"
        );
      }
      this.disconnect();
    });

    // Handle TurboDrive SPA-style navigation (GitHub, Hotwire, etc.)
    document.addEventListener("turbo:before-render", () => {
      if (this.mode === "debug") {
        console.debug(
          "[ScopedMutationObserver] Disconnecting due to: turbo:before-render (TurboDrive navigation)"
        );
      }
      this.disconnect();
    });
    document.addEventListener("turbo:before-cache", () => {
      if (this.mode === "debug") {
        console.debug(
          "[ScopedMutationObserver] Disconnecting due to: turbo:before-cache (TurboDrive caching)"
        );
      }
      this.disconnect();
    });
  }

  observe(target: Element) {
    this.observer.observe(target, {
      childList: true,
      subtree: true,
    });

    this.activeTarget = target;
    if (this.mode === "debug") {
      console.debug(
        "[ScopedMutationObserver] MutationObserver attached to:",
        target
      );
    }
  }

  disconnect() {
    if (this.activeTarget) {
      if (this.mode === "debug") {
        console.debug("[ScopedMutationObserver] MutationObserver disconnected");
        console.groupEnd();
      }
      this.observer.disconnect();
      this.activeTarget = null;
    }
  }
}
