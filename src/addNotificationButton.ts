import browser from "./browserPolyfill";
import {
  JOB_RUN_SELECTOR,
  JOB_RUNS_CONTAINER_SELECTOR,
  ACTION_RUNS_SELECTOR,
  ACTION_RUNS_CONTAINER_SELECTOR,
  PR_CHECKS_CONTAINER_IS_OPEN_SELECTOR,
  PR_RUN_SELECTOR,
  PR_RUN_LINK_SELECTOR,
  PR_CHECKS_CONTAINER_GRANDPARENT_SELECTOR,
  CHECKS_PAGE_CONTAINER_SELECTOR,
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
  createPRRunCallback,
  shouldMonitorChecks,
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
      setSVGColor(svg, "yellow");
    }

    element.style.display = "flex";

    insertButtonIntoJob(button, element);
  }
}

async function processElementsForPRPages() {
  const checksPanelIsOpen =
    document.querySelector(PR_CHECKS_CONTAINER_IS_OPEN_SELECTOR) !== null;

  if (!checksPanelIsOpen) {
    console.debug(
      "Checks panel isn't open yet. There is nothing to look at. Returning early"
    );
    return;
  }

  const runs = document.querySelectorAll(PR_RUN_SELECTOR);

  const currentlyRunningOrQueued = getTargetPRElements(runs);

  for (const element of currentlyRunningOrQueued) {
    const link = element.querySelector(PR_RUN_LINK_SELECTOR);

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

    // PRs show runs by job.
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
      setSVGColor(svg, "yellow");
    }

    insertButtonBetweenStatusAndDetails(button, element);
  }
}

async function processElementForChecksPages(): Promise<void> {
  const runs = document.querySelectorAll("div.checks-list-item");

  console.assert(runs.length > 0, "Expected run elements to exist");

  const currentlyRunningOrQueued = getTargetElements(runs);

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
      setSVGColor(svg, "yellow");
    }

    // element.style.display = "flex";

    element.appendChild(button);
  }
}

async function main(): Promise<void> {
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

    // Any time a job status changes, the entire PR checks container is re-rendered. So we have to select a higher-up element than normal.
    const prRunsContainer = document.querySelector(
      PR_CHECKS_CONTAINER_GRANDPARENT_SELECTOR
    );

    if (prRunsContainer) {
      console.debug("Attaching PR actions observer");

      const prRunCallback = createPRRunCallback(
        async () => await processElementsForPRPages()
      );

      new AutoDisconnectingMutationObserver(prRunCallback, "debug").observe(
        prRunsContainer
      );
    }
  } else if (shouldMonitorChecks(window.location.href)) {
    await processElementForChecksPages();

    const checksContainer = document.querySelector(
      CHECKS_PAGE_CONTAINER_SELECTOR
    );

    if (checksContainer) {
      console.debug("Attaching checks observer");

      const checksRunCallback = createActionRunCallback(
        async () => await processElementForChecksPages()
      );

      new AutoDisconnectingMutationObserver(checksRunCallback, "debug").observe(
        checksContainer
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
