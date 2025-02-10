import {
  JOB_RUN_ATTRIBUTE_SELECTOR,
  PR_PAGE_CONTAINER_SELECTOR,
  PR_PAGE_JOB_SELECTOR,
  WORKFLOW_RUN_ATTRIBUTE_SELECTOR,
  WORKFLOW_RUNS_CONTAINER_ATTRIBUTE_SELECTOR,
} from "./selectors";
import {
  shouldMonitorActions,
  shouldAddJobNotificationButton,
  createNotificationButton,
  createNotificationSVG,
  extractActionDataFromURL,
  getCurrentlyRunningOrQueuedWorkflowElements,
  createWorkflowRunCallback,
  magicallyInsertButtonInRightPlace,
  encode,
  extractJobDataFromURL,
  insertButtonIntoJob,
  createMonitoringHandler,
} from "./helpers";

import type { Encoded } from "../types";

function isIdAlreadyMonitored(id: Encoded) {
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
}

async function processElementsForWorkflowRunPages() {
  const workflowRunElements = document.querySelectorAll(
    WORKFLOW_RUN_ATTRIBUTE_SELECTOR
  );

  const currentlyRunningOrQueuedElements =
    getCurrentlyRunningOrQueuedWorkflowElements(workflowRunElements);

  for (const element of currentlyRunningOrQueuedElements) {
    const link = element.querySelector("a");

    console.assert(
      link,
      "Expected link to exist on currently running or queued element"
    );
    if (!link) {
      continue;
    }

    const { owner, repository, runId } = extractActionDataFromURL(link.href);

    const button = createNotificationButton({ runId, owner, repository });
    const svg = createNotificationSVG();

    button.appendChild(svg);

    const startMonitoring = createMonitoringHandler({
      runId,
      owner,
      repository,
      svg,
    });
    button.onclick = startMonitoring;

    const encoded = encode({ runId, owner, repository });

    // Maybe we make this a function that is like await turnSVGYellowIfAlreadyMonitored(encoded, svg) that's more clearly side-effect-y
    const isAlreadyMonitored = await isIdAlreadyMonitored(encoded);
    if (isAlreadyMonitored) {
      svg.style.fill = "yellow";
    }

    magicallyInsertButtonInRightPlace({
      button,
      workflowRunElement: element,
    });
  }
}

async function processElementsForJobPages() {
  const jobElements = document.querySelectorAll(JOB_RUN_ATTRIBUTE_SELECTOR);

  console.assert(jobElements.length > 0, "Expected job elements to exist");

  const currentlyRunningOrQueued =
    getCurrentlyRunningOrQueuedWorkflowElements(jobElements);

  console.log({ currentlyRunningOrQueued });

  for (const element of currentlyRunningOrQueued) {
    const link = element.querySelector("a");

    console.assert(
      link,
      "Expected link to exist on currently running or queued element"
    );
    if (!link) {
      continue;
    }

    const { owner, repository, runId, jobId } = extractJobDataFromURL(
      link.href
    );

    const button = createNotificationButton({
      runId,
      owner,
      repository,
      jobId,
    });

    const svg = createNotificationSVG();

    button.appendChild(svg);

    const startMonitoring = createMonitoringHandler({
      runId,
      jobId,
      owner,
      repository,
      svg,
    });
    button.onclick = startMonitoring;

    const encoded = encode({ runId, jobId, owner, repository });

    // Maybe we make this a function that is like await turnSVGYellowIfAlreadyMonitored(encoded, svg) that's more clearly side-effect-y
    const isAlreadyMonitored = await isIdAlreadyMonitored(encoded);
    if (isAlreadyMonitored) {
      svg.style.fill = "yellow";
    }

    // addDisplayFlex(element);
    // // start
    element.style.display = "flex";
    // // end

    insertButtonIntoJob(button, element);
  }
}

let workflowObserver: MutationObserver | null;
let jobObserver: MutationObserver | null;

async function main() {
  console.debug("Running main()");
  cleanupObservers();

  const observerConfig = { childList: true, subtree: true };

  if (shouldMonitorActions(window.location.href)) {
    await processElementsForWorkflowRunPages();

    const workflowRunsContainer = document.querySelector(
      WORKFLOW_RUNS_CONTAINER_ATTRIBUTE_SELECTOR
    );

    if (workflowRunsContainer) {
      console.debug("Attaching workflow observer");

      const workflowRunCallback = createWorkflowRunCallback(() =>
        processElementsForWorkflowRunPages()
      );

      workflowObserver = new MutationObserver(workflowRunCallback);
      workflowObserver.observe(workflowRunsContainer, observerConfig);
    }
  } else if (shouldAddJobNotificationButton(window.location.href)) {
    await processElementsForJobPages();
  }
}

function cleanupObservers() {
  if (workflowObserver) {
    workflowObserver.disconnect();
    console.debug("Disconnected workflow observer");
    workflowObserver = null;
  }
  if (jobObserver) {
    jobObserver.disconnect();
    console.debug("Disconnected job observer");
    jobObserver = null;
  }
}

document.removeEventListener("turbo:render", main);
document.addEventListener("turbo:render", async () => {
  console.debug("turbo:render triggered");
  await main();
});

main();
