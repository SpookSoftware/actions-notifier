import {
  CURRENTLY_RUNNING_SELECTOR,
  IN_PROGRESS_SELECTOR,
  NEW_PR_CHECKS_CONTAINER_PARENT_SELECTOR,
  NEW_PR_CURRENTLY_RUNNING_SELECTOR,
  PR_CHECKS_CONTAINER_PARENT_SELECTOR,
  PR_CURRENTLY_RUNNING_SELECTOR,
  PR_QUEUED_SELECTOR,
  QUEUED_SELECTOR,
} from "@/selectors";

import type {
  Encoded,
  MonitorRequest,
  MonitorRequestType,
  PaymentStatus,
  StartMonitorRequest,
  StopMonitorRequest,
} from "@/types";
import { ALARM_PREFIX } from "./constants";

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

export function createNotificationSVG() {
  // Updated path for a thicker notification bell using stroke instead of fill
  const NOTIFICATION_BELL_PATH =
    "M12 1.5c-4.2 0-7.5 3.3-7.5 7v3.25c0 1.1-0.4 2.1-1 3L1.7 17.4c-0.7 1.1 0.1 2.6 1.4 2.6h17.8c1.3 0 2.1-1.5 1.4-2.6l-1.8-2.7c-0.6-0.9-1-1.9-1-3V8.5c0-3.7-3.3-7-7.5-7z";
  const BELL_CLAPPER_PATH = "M14 20a2 2 0 1 1-4 0";
  const NOTIFICATION_BELL_VIEW_BOX = "0 0 24 24";
  const NOTIFICATION_BELL_WIDTH = "16";
  const NOTIFICATION_BELL_HEIGHT = "16";

  const svgElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  svgElement.setAttributeNS(null, "viewBox", NOTIFICATION_BELL_VIEW_BOX);
  svgElement.setAttributeNS(null, "width", NOTIFICATION_BELL_WIDTH);
  svgElement.setAttributeNS(null, "height", NOTIFICATION_BELL_HEIGHT);

  svgElement.classList.add("octicon");
  svgElement.classList.add("color-fg-muted");

  const strokeWidth = "2.33";

  // Create the main bell path
  const bellPathElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  bellPathElement.setAttributeNS(null, "d", NOTIFICATION_BELL_PATH);
  bellPathElement.setAttributeNS(null, "fill", "none");
  bellPathElement.setAttributeNS(null, "stroke", "currentColor");
  bellPathElement.setAttributeNS(null, "stroke-width", strokeWidth);
  bellPathElement.setAttributeNS(null, "stroke-linecap", "round");
  bellPathElement.setAttributeNS(null, "stroke-linejoin", "round");

  // Create the bell clapper path
  const clapperPathElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  clapperPathElement.setAttributeNS(null, "d", BELL_CLAPPER_PATH);
  clapperPathElement.setAttributeNS(null, "fill", "none");
  clapperPathElement.setAttributeNS(null, "stroke", "currentColor");
  clapperPathElement.setAttributeNS(null, "stroke-width", strokeWidth);
  clapperPathElement.setAttributeNS(null, "stroke-linecap", "round");
  clapperPathElement.setAttributeNS(null, "stroke-linejoin", "round");

  svgElement.appendChild(bellPathElement);
  svgElement.appendChild(clapperPathElement);
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
  // Look for a span with text mentioning "Queued"
  const maybeQueuedSpans = el.querySelectorAll("span");

  for (const span of maybeQueuedSpans) {
    if (span.textContent && span.textContent.toLowerCase().includes("queued")) {
      return true;
    }
  }

  return false;
};
const isRunningPR = (el: any) => {
  return selectorHasChildren(NEW_PR_CURRENTLY_RUNNING_SELECTOR, el);
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

export function setSVGColor(svg: SVGElement, color: string) {
  svg.style.color = color;
  svg.classList.remove("color-fg-muted");

  // Add a subtle transition effect
  svg.style.transition = "color 0.2s ease";

  // Add a small outline/glow when active
  if (color === "yellow") {
    svg.style.filter = "drop-shadow(0 0 2px rgba(255, 204, 0, 0.5))";
  } else if (color === "red") {
    svg.style.filter = "drop-shadow(0 0 2px rgba(255, 0, 0, 0.5))";
  }
}

export function resetSVGColor(svg: SVGElement) {
  svg.style.color = "";
  svg.style.filter = "";
  svg.classList.add("color-fg-muted");
}

export function isValidGithubResponse(
  data: unknown
): data is { status: string; name: string; conclusion?: string } {
  return (
    typeof data === "object" &&
    data != undefined &&
    "status" in data &&
    "name" in data
  );
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
  onObservationChange: Function,
  onWholeContainerChange: Function
): ((mutationsList: MutationRecord[]) => void) => {
  return function (mutationsList: MutationRecord[]) {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        for (const addedNode of mutation.addedNodes) {
          if (addedNode instanceof Element) {
            const wholeContainerChanged = addedNode.classList
              .entries()
              .some(([_idx, value]) => {
                return value.includes("MergeBox-module__mergePartialContainer");
              });

            const singleElementChanged =
              isQueuedRunningAndNotButtonedPR(addedNode) &&
              !(addedNode instanceof HTMLDivElement);

            // either we are seeing that a li got added or removed, or the entire container got replaced.
            if (singleElementChanged) {
              onObservationChange(addedNode);
            } else if (wholeContainerChanged) {
              onWholeContainerChange();
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
  const nameWithoutPrefix = name.split(ALARM_PREFIX)[1];
  const split = nameWithoutPrefix.split("|");
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

export function isStartMonitoringRequest(
  request: unknown
): request is StartMonitorRequest {
  return (
    typeof request === "object" &&
    request !== null &&
    "task" in request &&
    request.task === "start-monitoring"
  );
}

export function isStopMonitoringRequest(
  request: unknown
): request is StopMonitorRequest {
  return (
    typeof request === "object" &&
    request !== null &&
    "task" in request &&
    request.task === "stop-monitoring"
  );
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

export function assertIsHTMLElement(
  element: Element
): asserts element is HTMLElement {
  const isHTMLElement = element instanceof HTMLElement;
  console.assert(isHTMLElement, "Expected element to be an HTMLElement");
  if (!isHTMLElement) {
    throw Error("Expected element to be an HTMLElement");
  }
}

export function hasClickHandler(element: Element): boolean {
  // Check if the element is an HTMLElement and has an onclick property
  if (element instanceof HTMLElement) {
    return typeof element.onclick === "function" && element.onclick !== null;
  }
  return false;
}

/**
 * On workflow run pages, inserts the supplied button
 * between the branch name and the "this was last run on" icons.
 */
// For Actions page workflow run elements - aligned with three dots menu
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

  // Actions page specific styling
  button.style.padding = "3px";
  button.style.marginLeft = "4px";
  button.style.marginRight = "8px";
  button.style.width = "24px";
  button.style.height = "24px";
  button.style.verticalAlign = "middle";
  button.style.position = "relative";
  button.style.top = "12px"; // Increased to align with three dots

  // SVG specific styling for Actions page
  const svg = button.querySelector("svg");
  if (svg instanceof SVGElement) {
    svg.style.display = "block";
    svg.style.margin = "auto";
  }

  childDiv.insertBefore(button, betweenBranchAndTime);
}

export function insertButtonIntoJob(button: HTMLButtonElement, jobLi: Element) {
  if (jobLi instanceof HTMLElement) {
    jobLi.style.display = "flex";
    jobLi.style.alignItems = "center";
  }

  // Job page specific styling
  button.style.padding = "4px";
  button.style.marginLeft = "auto";
  button.style.marginRight = "8px";
  button.style.width = "28px";
  button.style.height = "28px";

  // SVG specific styling for Job page
  const svg = button.querySelector("svg");
  if (svg instanceof SVGElement) {
    svg.style.display = "block";
    svg.style.margin = "auto";
  }

  jobLi.appendChild(button);
}

export function insertButtonBetweenStatusAndDetails(
  button: HTMLButtonElement,
  element: Element
) {
  const referenceDiv = element.children[3];

  // Create a container with zero layout impact that can hold a larger SVG
  const buttonContainer = document.createElement("span");
  buttonContainer.style.display = "inline-block";
  buttonContainer.style.width = "0"; // Zero-width container
  buttonContainer.style.height = "0"; // Zero-height container
  buttonContainer.style.position = "relative"; // For positioning the button
  buttonContainer.style.overflow = "visible"; // Allow content to overflow
  buttonContainer.style.verticalAlign = "middle";
  buttonContainer.style.margin = "0 12px"; // Space on either side

  // Position the button absolutely inside the zero-sized container
  button.style.position = "absolute";
  button.style.top = "7px"; // Adjust vertical position slightly higher
  button.style.left = "50px"; // Adjust horizontal position
  button.style.width = "20px"; // Maintain good button size
  button.style.height = "20px";
  button.style.padding = "0";
  button.style.margin = "0";
  button.style.border = "none";
  button.style.background = "transparent";
  button.style.display = "flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";
  button.style.zIndex = "1";

  // SVG can now be a reasonable size but won't affect layout
  const svg = button.querySelector("svg");
  if (svg instanceof SVGElement) {
    svg.style.width = "16px";
    svg.style.height = "16px";
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.style.display = "block";

    // Ensure viewBox is properly set for scaling
    if (!svg.hasAttribute("viewBox")) {
      svg.setAttribute("viewBox", "0 0 24 24");
    }
  }

  // Add button to zero-sized container
  buttonContainer.appendChild(button);

  // Insert the container before the reference div
  if (referenceDiv) {
    element.insertBefore(buttonContainer, referenceDiv);
  } else {
    element.appendChild(buttonContainer);
  }
}

export function messageIsEnabledStatusChange(
  message: any
): message is { action: "extensionStateChanged"; enabled: boolean } {
  return (
    message.action === "extensionStateChanged" &&
    typeof message.enabled === "boolean"
  );
}

export function isGetExtensionEnabledResponse(response: unknown): response is {
  status: "ok";
  data: { enabled: boolean };
} {
  return Boolean(
    typeof response === "object" &&
      response !== null &&
      "status" in response &&
      response.status === "ok" &&
      "data" in response &&
      response.data !== null &&
      response.data &&
      typeof response.data === "object" &&
      "enabled" in response.data
  );
}

export function isPaymentStatusResponse(
  response: any
): response is { status: "ok"; data: PaymentStatus } {
  return response && response.status === "ok";
}
