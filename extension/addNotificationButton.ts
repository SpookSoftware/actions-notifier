import {
  JOB_RUN_SELECTOR,
  JOB_RUNS_CONTAINER_SELECTOR,
  PR_PAGE_CONTAINER_SELECTOR,
  PR_PAGE_JOB_SELECTOR,
  ACTION_RUNS_SELECTOR,
  ACTION_RUNS_CONTAINER_SELECTOR,
} from "./selectors";
import {
  shouldMonitorActions,
  shouldAddJobNotificationButton,
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
  isButtoned,
  setSVGColor,
  isIdAlreadyMonitored,
  AutoDisconnectingMutationObserver,
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

async function main() {
  console.debug("Running main()");

  if (shouldMonitorActions(window.location.href)) {
    await processElementsForActionRunPages();

    const actionRunsContainer = document.querySelector(
      ACTION_RUNS_CONTAINER_SELECTOR
    );

    if (actionRunsContainer) {
      console.debug("Attaching action observer");

      const actionRunCallback = createActionRunCallback(() =>
        processElementsForActionRunPages()
      );

      new AutoDisconnectingMutationObserver(actionRunCallback, "debug").observe(
        actionRunsContainer
      );
    }
  } else if (shouldAddJobNotificationButton(window.location.href)) {
    await processElementsForJobPages();

    const jobRunsContainer = document.querySelector(
      JOB_RUNS_CONTAINER_SELECTOR
    );

    if (jobRunsContainer) {
      console.debug("Attaching job observer");

      const jobRunCallback = createActionRunCallback(() =>
        processElementsForJobPages()
      );

      new AutoDisconnectingMutationObserver(jobRunCallback, "debug").observe(
        jobRunsContainer
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
