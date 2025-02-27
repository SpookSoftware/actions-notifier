import browser from "webextension-polyfill";
import {
  CURRENTLY_RUNNING_SELECTOR,
  IN_PROGRESS_SELECTOR,
  PR_CHECKS_CONTAINER_PARENT_SELECTOR,
  QUEUED_SELECTOR,
} from "./selectors";

import type {
  Encoded,
  MonitorRequest,
  MonitorRequestType,
  MonitorResponse,
  StartMonitorRequest,
  StopMonitorRequest,
} from "./types";

export async function sendMessageAsync(
  payload: unknown
): Promise<MonitorResponse> {
  return await browser.runtime.sendMessage(payload);
}

export function shouldMonitorActions(url: string) {
  // Normalize the URL by removing query parameters for pattern matching
  const cleanUrl = url.split("?")[0];

  // Matches URLs for all actions pages, like:
  // - https://github.com/SpookSoftware/github-actions-browser-notifications/actions
  // - https://github.com/SpookSoftware/github-actions-browser-notifications/actions?query=blah
  const allActionsPagePattern =
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/actions$/;

  // Matches specific workflow run pages, like:
  // - https://github.com/SpookSoftware/github-actions-browser-notifications/actions/workflows/waitAMinute.yml
  // - https://github.com/SpookSoftware/github-actions-browser-notifications/actions/workflows/waitAMinute.yml?query=blah
  const specificActionPagePattern =
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/workflows\/[^/]+$/;

  return (
    allActionsPagePattern.test(cleanUrl) ||
    specificActionPagePattern.test(cleanUrl)
  );
}

export function shouldMonitorJobs(url: string) {
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

export function shouldMonitorPRs(url: string) {
  const prPattern = /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+(?:\?.*)?$/;

  return prPattern.test(url);
}

export function shouldMonitorChecks(url: string) {
  const checksPattern =
    /^https:\/\/github\.com\/[\w-]+\/[\w-]+\/pull\/\d+\/checks(?:\?.*)?$/;
  return checksPattern.test(url);
}

export const NOTIFICATION_BUTTON_CLASS = "gh-action-notifier-button";

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
  button.classList.add(NOTIFICATION_BUTTON_CLASS);
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
  return (
    selectorHasChildren(CURRENTLY_RUNNING_SELECTOR, el) ||
    selectorHasChildren(IN_PROGRESS_SELECTOR, el)
  );
};
export function isButtoned(element: any) {
  return element.querySelector(`.${NOTIFICATION_BUTTON_CLASS}`);
}
export function isQueuedRunningAndNotButtoned<
  HasQuerySelector extends {
    querySelector: Function;
  }
>(x: HasQuerySelector) {
  return (isQueued(x) || isRunning(x)) && !isButtoned(x);
}

export function getTargetElements(divs: NodeListOf<Element>) {
  return [...divs].filter(isQueuedRunningAndNotButtoned);
}

const isQueuedPR = (el: any) => {
  return selectorHasChildren(
    ".merge-status-item .octicon-dot-fill.hx_dot-fill-pending-icon",
    el
  );
};
const isRunningPR = (el: any) => {
  return selectorHasChildren(".merge-status-item .anim-rotate", el);
};
export function isQueuedRunningAndNotButtonedPR<
  HasQuerySelector extends {
    querySelector: Function;
  }
>(x: HasQuerySelector) {
  return (isQueuedPR(x) || isRunningPR(x)) && !isButtoned(x);
}
export function getTargetPRElements(divs: NodeListOf<Element>) {
  return [...divs].filter(isQueuedRunningAndNotButtonedPR);
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
  const urlWithoutQueryParams = url.split("?")[0];
  if (!isValidURL) {
    throw new Error("Invalid URL: " + url);
  }
  const [_, _2, _3, owner, repository, _4, _5, runId] =
    urlWithoutQueryParams.split("/");
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

export function extractJobDataFromURL(url: string) {
  const isValidURL = URL.canParse(url);
  const urlWithoutQueryParams = url.split("?")[0];
  if (isValidURL) {
    const [_, _2, _3, owner, repository, _4, _5, runId, _6, jobId] =
      urlWithoutQueryParams.split("/");
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

export async function isIdAlreadyMonitored(
  id:
    | Encoded
    | { runId: string; jobId?: string; owner: string; repository: string }
): Promise<boolean> {
  if (typeof id === "string") {
    try {
      const result = await browser.storage.local.get(id);
      return Object.keys(result).length > 0;
    } catch (error) {
      console.error(
        "Error occurred while checking if id was already monitored",
        error
      );
      return false;
    }
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
  const token = await browser.storage.sync.get("githubToken");

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

export function isValidGithubResponse(
  data: unknown
): data is { status: string; name: string } {
  return (
    typeof data === "object" &&
    data != undefined &&
    "status" in data &&
    "name" in data
  );
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

  if (!isValidGithubResponse(data)) {
    throw new Error(
      "Expected response to contain data.status and data.name. Unexpected response from GitHub API: " +
        JSON.stringify(data)
    );
  }

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

  if (!isValidGithubResponse(data)) {
    throw new Error(
      "Expected response to contain data.status and data.name. Unexpected response from GitHub API: " +
        JSON.stringify(data)
    );
  }

  return {
    status: data.status,
    name: data.name,
  };
}

export const createActionRunCallback = (onObservationChange: Function) => {
  return function (mutationsList: MutationRecord[]) {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        for (const addedNode of mutation.addedNodes) {
          if (addedNode instanceof Element) {
            console.debug("A new element was added:", addedNode);
            if (isQueuedRunningAndNotButtoned(addedNode)) {
              console.debug("It is a queued or running action run DOM node");
              onObservationChange();
            } else {
              console.debug("It's not a action run DOM node");
            }
            console.groupEnd();
          }
        }
      }
    }
  };
};

export const createPRRunCallback = (
  onObservationChange: Function
): ((mutationsList: MutationRecord[]) => void) => {
  return (mutationsList: MutationRecord[]) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        for (const addedNode of mutation.addedNodes) {
          if (addedNode instanceof Element) {
            console.debug("A new element was added:", addedNode);
            // If it is in fact the container we are expecting
            if (addedNode.matches(PR_CHECKS_CONTAINER_PARENT_SELECTOR)) {
              console.debug("The PR checks container was replaced");
              onObservationChange();
            }
          }
        }
      }
    }
  };
};

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
  "https://github.com/settings/tokens/new?description=CICD%20Workflow%20Notifications&scopes=repo";

function isStartMonitoringRequest(
  request: unknown
): request is StartMonitorRequest {
  return (
    typeof request === "object" &&
    request !== null &&
    "task" in request &&
    request.task === "start-monitoring"
  );
}

function isStopMonitoringRequest(
  request: unknown
): request is StopMonitorRequest {
  return (
    typeof request === "object" &&
    request !== null &&
    "task" in request &&
    request.task === "stop-monitoring"
  );
}

async function createAlarmForId(
  id: string,
  lengthInMinutes: number
): Promise<void> {
  browser.alarms.create(id, {
    periodInMinutes: lengthInMinutes,
  });
}

export async function storeMonitoringStatus(id: string): Promise<void> {
  await browser.storage.local.set({ [id]: true });
}

async function setupMonitoring(
  id: string,
  lengthInMinutes: number
): Promise<void[]> {
  return await Promise.all([
    createAlarmForId(id, lengthInMinutes),
    storeMonitoringStatus(id),
  ]);
}

async function removeMonitoringStatus(id: string): Promise<void> {
  await browser.storage.local.remove(id);
}

export async function cancelAlarmForId(id: string): Promise<boolean> {
  return await browser.alarms.clear(id);
}

async function cancelMonitoring(id: string): Promise<[boolean, void]> {
  return await Promise.all([cancelAlarmForId(id), removeMonitoringStatus(id)]);
}

export async function onMessageCallback(
  request: unknown,
  _sender: browser.Runtime.MessageSender
): Promise<MonitorResponse> {
  if (isStartMonitoringRequest(request)) {
    const encoded = encodeRequest(request);

    console.debug(`Received request to monitor ${encoded}`);

    try {
      await setupMonitoring(encoded, 0.1);
      console.debug(`Started monitoring for id ${encoded}`);
      return { status: "ok" };
    } catch (err) {
      console.error(`Monitoring setup failed for id ${encoded}`);
      return { status: "error", error: err as Error };
    }
  } else if (isStopMonitoringRequest(request)) {
    const encoded = encodeRequest(request);

    console.debug(`Received request to stop monitoring ${encoded}`);

    try {
      await cancelMonitoring(encoded);
      console.debug(`Stopped monitoring for id ${encoded}`);
      return { status: "ok" };
    } catch (err) {
      console.error(`Monitoring cancellation failed for id ${encoded}`);
      return { status: "error", error: err as Error };
    }
  } else {
    throw Error(`Unexpected request: ${JSON.stringify(request)}`);
  }
}

export function createOnMessageCallback(
  setupMonitoring: (id: string, lengthInMinutes: number) => Promise<void[]>,
  cancelMonitoring: (id: string) => Promise<[boolean, void]>
) {
  return async (
    request: MonitorRequest,
    _sender: browser.Runtime.MessageSender
  ): Promise<MonitorResponse> => {
    if (isStartMonitoringRequest(request)) {
      const encoded = encodeRequest(request);

      console.debug(`Received request to monitor ${encoded}`);

      try {
        await setupMonitoring(encoded, 0.1);
        console.debug(`Started monitoring for id ${encoded}`);
        return { status: "ok" };
      } catch (err) {
        console.error(`Monitoring setup failed for id ${encoded}`);
        return { status: "error", error: err as Error };
      }
    } else if (isStopMonitoringRequest(request)) {
      const encoded = encodeRequest(request);

      console.debug(`Received request to stop monitoring ${encoded}`);

      try {
        await cancelMonitoring(encoded);
        console.debug(`Stopped monitoring for id ${encoded}`);
        return { status: "ok" };
      } catch (err) {
        console.error(`Monitoring cancellation failed for id ${encoded}`);
        return { status: "error", error: err as Error };
      }
    } else {
      throw Error(
        `Unexpected request task ${
          request.task
        }. Full request for debugging: ${JSON.stringify(request)}`
      );
    }
  };
}

/**
 * Given a action run div, grabs the div that's between the branch name and the "this was last run on" icons.
 */
// Todo: maybe we test this with actual selectors?
export function getElementToInsertNotificationButtonInto(
  actionRunElement: Element
) {
  const childDiv = actionRunElement.children[0];
  if (!childDiv) {
    throw Error("Expected children to be present");
  }
  const betweenBranchAndTime = childDiv.children[2];
  if (!betweenBranchAndTime) {
    throw Error(
      "Element does not have the expected structure of a action run element"
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
  actionRunElement,
}: {
  button: HTMLButtonElement;
  actionRunElement: Element;
}) {
  const betweenBranchAndTime =
    getElementToInsertNotificationButtonInto(actionRunElement);
  const childDiv = actionRunElement.children[0];
  childDiv.insertBefore(button, betweenBranchAndTime);
}

export function insertButtonIntoJob(button: Element, jobLi: Element) {
  jobLi.insertAdjacentElement("beforeend", button);
}

export function insertButtonBetweenStatusAndDetails(
  button: Element,
  element: Element
) {
  const referenceDiv = element.children[3];
  element.insertBefore(button, referenceDiv);
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
export class AutoDisconnectingMutationObserver {
  private static instance: AutoDisconnectingMutationObserver | null = null;
  private observer: MutationObserver;
  private activeTarget: Element | null;
  public mode: "normal" | "debug";

  constructor(callback: MutationCallback, mode: "normal" | "debug" = "normal") {
    if (AutoDisconnectingMutationObserver.instance) {
      console.warn(
        "[AutoDisconnectingMutationObserver] Instance already exists. Reusing existing observer."
      );
      return AutoDisconnectingMutationObserver.instance;
    }

    this.observer = new MutationObserver(callback);
    this.activeTarget = null;
    this.mode = mode;

    if (this.mode === "debug") {
      console.group("[AutoDisconnectingMutationObserver]");
    }

    // Handle normal full-page navigations
    window.addEventListener("pagehide", this.handlePageHide.bind(this));

    // Handle TurboDrive SPA-style navigation (GitHub, Hotwire, etc.)
    document.addEventListener(
      "turbo:before-render",
      this.handleTurboRender.bind(this)
    );
    document.addEventListener(
      "turbo:before-cache",
      this.handleTurboCache.bind(this)
    );

    // Store instance globally
    AutoDisconnectingMutationObserver.instance = this;

    if (this.mode === "debug") {
      console.debug("[AutoDisconnectingMutationObserver] New instance created");
    }
  }

  private handlePageHide() {
    this.logAndDisconnect("pagehide event (standard navigation)");
  }

  private handleTurboRender() {
    this.logAndDisconnect("turbo:before-render (TurboDrive navigation)");
  }

  private handleTurboCache() {
    this.logAndDisconnect("turbo:before-cache (TurboDrive caching)");
  }

  observe(target: Element) {
    if (this.activeTarget) {
      this.logAndDisconnect("Switching observed target");
    }

    this.observer.observe(target, {
      childList: true,
      subtree: true,
    });

    this.activeTarget = target;
    if (this.mode === "debug") {
      console.debug(
        "[AutoDisconnectingMutationObserver] MutationObserver attached to:",
        target
      );
    }
  }

  private logAndDisconnect(reason: string) {
    if (this.mode === "debug") {
      console.debug(
        `[AutoDisconnectingMutationObserver] Disconnecting due to: ${reason}`
      );
    }
    this.disconnect();
  }

  disconnect() {
    if (this.activeTarget) {
      if (this.mode === "debug") {
        console.debug(
          "[AutoDisconnectingMutationObserver] MutationObserver disconnected"
        );
        console.groupEnd();
      }
      this.observer.disconnect();
      this.activeTarget = null;
    }
  }

  destroy() {
    if (this.mode === "debug") {
      console.debug(
        "[AutoDisconnectingMutationObserver] Destroying instance and removing event listeners"
      );
    }

    window.removeEventListener("pagehide", this.handlePageHide.bind(this));
    document.removeEventListener(
      "turbo:before-render",
      this.handleTurboRender.bind(this)
    );
    document.removeEventListener(
      "turbo:before-cache",
      this.handleTurboCache.bind(this)
    );

    this.disconnect();
    AutoDisconnectingMutationObserver.instance = null;
  }
}

export const onAlarmCallback = async (alarm: browser.Alarms.Alarm) => {
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
    await createCompletionNotification(alarm.name, taskName);
    // Is this a failure point? Should I be doing something to handle any potential failures here?
    await teardown(alarm.name);
  }
};

export async function teardown(alarmName: string) {
  await browser.alarms.clear(alarmName);
  console.debug(`Alarm ${alarmName} cleared`);
  await browser.storage.local.remove(alarmName);
  console.debug(`Monitoring status for ${alarmName} cleared from storage`);
}

export async function createCompletionNotification(
  alarmName: string,
  taskName: string
) {
  await browser.notifications.create(alarmName, {
    type: "basic",
    title: "Action/job completed",
    message: `Item ${taskName} has completed. Click the notification to view the results.`,
    // todo: change this
    iconUrl:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAGlJREFUWEftl9EKABAMRfnZfdR+lvcpa01GHa+S03G56a149OL92wIgImMHpapb6Oh6ADCAgf8NRO+9fWPSBgC4bsArL68r0hkAoNyAPePrIQTgOQM2lNFMpLsAAAxg4LgBr2xOz5f/jiczr9Ahlc1SawAAAABJRU5ErkJggg==",
  });
  console.debug(`Successfully created notification with id ${alarmName}`);
}

export async function onNotificationClickedCallback(notificationId: string) {
  console.debug(`Notification ${notificationId} clicked.`);
  if (!isProperlyEncoded(notificationId)) {
    throw new Error(
      `Unexpected id format:  ${notificationId}. Should be in the format string|string|string or string|string|string|string`
    );
  }
  const decoded = decode(notificationId);
  await browser.tabs.create({
    url: createURL(decoded),
  });
}
