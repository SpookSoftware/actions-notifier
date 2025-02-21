import {
  JOB_RUN_SELECTOR,
  JOB_RUNS_CONTAINER_SELECTOR,
  ACTION_RUNS_SELECTOR,
  ACTION_RUNS_CONTAINER_SELECTOR,
  PR_CHECKS_CONTAINER_IS_OPEN_SELECTOR,
  PR_CHECKS_CONTAINER_SELECTOR,
} from "./selectors";
import {
  shouldMonitorActions,
  shouldMonitorJobs,
  createNotificationButton,
  createNotificationSVG,
  extractActionDataFromURL,
  getTargetElements,
  createActionRunCallback,
  magicallyInsertButtonInRightPlace,
  encode,
  extractJobDataFromURL,
  insertButtonIntoJob,
  createMonitorToggleHandler,
  assertIsHTMLElement,
  setSVGColor,
  isIdAlreadyMonitored,
  AutoDisconnectingMutationObserver,
  shouldMonitorPRs,
  isQueuedRunningAndNotButtoned,
  getTargetPRElements,
  insertButtonBetweenStatusAndDetails,
} from "./helpers";

async function processElementsForActionRunPages() {
  const actionRunElements = document.querySelectorAll(ACTION_RUNS_SELECTOR);

  const currentlyRunningOrQueuedElements = getTargetElements(actionRunElements);

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

    const handleMonitoringClickFn = createMonitorToggleHandler({
      owner,
      repository,
      runId,
      svg,
    });

    button.onclick = handleMonitoringClickFn;

    const encoded = encode({ runId, owner, repository });
    const isAlreadyMonitored = await isIdAlreadyMonitored(encoded);
    if (isAlreadyMonitored) {
      setSVGColor(svg, "yellow");
    }

    magicallyInsertButtonInRightPlace({
      button,
      actionRunElement: element,
    });
  }
}

async function processElementsForJobPages() {
  const jobElements = document.querySelectorAll(JOB_RUN_SELECTOR);

  console.assert(jobElements.length > 0, "Expected job elements to exist");

  const currentlyRunningOrQueued = getTargetElements(jobElements);

  for (const element of currentlyRunningOrQueued) {
    assertIsHTMLElement(element);

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

    const handleMonitoringClickFn = createMonitorToggleHandler({
      runId,
      jobId,
      owner,
      repository,
      svg,
    });
    button.onclick = handleMonitoringClickFn;

    const encoded = encode({ runId, jobId, owner, repository });
    const isAlreadyMonitored = await isIdAlreadyMonitored(encoded);
    if (isAlreadyMonitored) {
      svg.style.fill = "yellow";
    }

    element.style.display = "flex";

    insertButtonIntoJob(button, element);
  }
}

async function processElementsForPRPages() {
  console.log("inside processElementsForPRPages");
  const checksPanelIsOpen =
    document.querySelector(PR_CHECKS_CONTAINER_IS_OPEN_SELECTOR) !== null;

  if (!checksPanelIsOpen) {
    console.debug(
      "Checks panel isn't open yet. There is nothing to look at. Returning early"
    );
    return;
  }

  const runSelector = "div.merge-status-item";

  const runs = document.querySelectorAll(runSelector);

  const currentlyRunningOrQueued = getTargetPRElements(runs);

  for (const element of currentlyRunningOrQueued) {
    const link = element.querySelector("a.status-actions");

    console.assert(
      link,
      "Expected link to exist on currently running or queued element"
    );
    if (!link) {
      continue;
    }
    if (!(link instanceof HTMLAnchorElement)) {
      console.error("Expected link to be an HTMLAnchorElement");
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

    const handleMonitoringClickFn = createMonitorToggleHandler({
      runId,
      jobId,
      owner,
      repository,
      svg,
    });
    button.onclick = handleMonitoringClickFn;

    const encoded = encode({ runId, jobId, owner, repository });
    const isAlreadyMonitored = await isIdAlreadyMonitored(encoded);
    if (isAlreadyMonitored) {
      svg.style.fill = "yellow";
    }

    insertButtonBetweenStatusAndDetails(button, element);
  }
}

async function main() {
  console.debug("Running main()");

  if (shouldMonitorActions(window.location.href)) {
    await processElementsForActionRunPages();

    const actionRunsContainer = document.querySelector(
      ACTION_RUNS_CONTAINER_SELECTOR
    );

    if (actionRunsContainer) {
      console.debug("Attaching action observer");

      const actionRunCallback = createActionRunCallback(
        async () => await processElementsForActionRunPages()
      );

      new AutoDisconnectingMutationObserver(actionRunCallback, "debug").observe(
        actionRunsContainer
      );
    }
  } else if (shouldMonitorJobs(window.location.href)) {
    await processElementsForJobPages();

    const jobRunsContainer = document.querySelector(
      JOB_RUNS_CONTAINER_SELECTOR
    );

    if (jobRunsContainer) {
      console.debug("Attaching job observer");

      const jobRunCallback = createActionRunCallback(
        async () => await processElementsForJobPages()
      );

      new AutoDisconnectingMutationObserver(jobRunCallback, "debug").observe(
        jobRunsContainer
      );
    }
  } else if (shouldMonitorPRs(window.location.href)) {
    await processElementsForPRPages();

    // As far as I can tell right now, PRs are different: Any time a single element inside the PR checks container changes, the whole container is replaced.
    const prRunsContainer = document.querySelector(
      "div.discussion-timeline-actions"
    );

    if (prRunsContainer) {
      console.debug("Attaching PR actions observer");

      // Inside here, we'll need to verify that the container has indeed been replaced and iterate through all of its children.
      const prRunCallback = async (mutationsList: MutationRecord[]) => {
        for (const mutation of mutationsList) {
          if (mutation.type === "childList") {
            console.log("A child node has been added or removed.");
            for (const addedNode of mutation.addedNodes) {
              if (addedNode instanceof Element) {
                console.debug("A new element was added:", addedNode);
                // If it is in fact the container we are expecting
                if (addedNode.matches("div#partial-pull-merging")) {
                  console.log("The PR checks container was replaced");
                  await processElementsForPRPages();
                } else {
                  console.log("it was something else");
                }
                console.groupEnd();
              }
            }
          }
        }
      };
      new AutoDisconnectingMutationObserver(prRunCallback, "debug").observe(
        prRunsContainer
      );
    }
  }
}

document.removeEventListener("turbo:render", main);
document.addEventListener("turbo:render", async () => {
  console.debug("turbo:render triggered");
  await main();
});

main();
