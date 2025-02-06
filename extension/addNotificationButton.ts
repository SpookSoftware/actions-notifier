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

//   const isPrPage = PR_PAGE_REGEX.test(url);
//   const isJobPage = false;
//   const isRunsPage = false;
//   return isPrPage || isJobPage || isRunsPage;
// }

//   if (request && request.type === "page-rendered") {
//     console.debug(
//       "Received request to refresh notification buttons because of a url change. URL: ",
//       request.url
//     );
//     if (shouldMonitorActions(request.url)) {
//       console.debug("Heading down the action path");
//       processElementsForAction(request.url);
//       const workflowObserver = new MutationObserver(
//         processSpecificWorkflowPageNodes
//       );
//     } else if (shouldAddJobNotificationButton(request.url)) {
//       console.debug("Heading down the job path");
//       processElementsForJob(request.url);
//     }
//   }
// });

// if (window) {
//   switch(window.location.href) {

//   }
// }

// Reminder to self: This runs on every full page nav, but not every spa nav. We might need a global observer?
(async () => {
  const observerConfig = { childList: true, subtree: true };
  if (shouldMonitorActions(window.location.href)) {
    await processElementsForWorkflowRunPages();

    // Idea: Instead of reprocessing for everything, we just do the work for a single element at a time! And this function
    // Would simply process the element for the action on the one element instead of everything.
    const workflowRunsContainer = document.querySelector(
      WORKFLOW_RUNS_CONTAINER_ATTRIBUTE_SELECTOR
    )!;

    // Is there a way to group this into its own function or whatever?
    const workflowRunCallback = createWorkflowRunCallback(() =>
      processElementsForWorkflowRunPages()
    );
    // I need to be careful to disconnect this when appropriate
    const workflowObserver = new MutationObserver(workflowRunCallback);
    workflowObserver.observe(workflowRunsContainer, observerConfig);
  } else if (shouldAddJobNotificationButton(window.location.href)) {
    await processElementsForJobPages();
  }
  // if (shouldAddJobNotificationButton(window.location.href)) {
  //   console.debug("Determined we should process elements for job");
  //   processElementsForJob(window.location.href);
  // }
})();
