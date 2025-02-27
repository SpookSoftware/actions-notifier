import {
  CURRENTLY_RUNNING_SELECTOR,
  IN_PROGRESS_SELECTOR,
  PR_CHECKS_CONTAINER_PARENT_SELECTOR,
  QUEUED_SELECTOR,
} from "@/selectors";

import type {
  Encoded,
  MonitorRequest,
  MonitorRequestType,
  MonitorResponse,
  StartMonitorRequest,
  StopMonitorRequest,
} from "@/types";

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

export function setSVGColor(svg: SVGElement, color: string) {
  svg.style.color = color;
  svg.classList.remove("color-fg-muted");
}

export function resetSVGColor(svg: SVGElement) {
  svg.style.color = "";
  svg.classList.add("color-fg-muted");
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
