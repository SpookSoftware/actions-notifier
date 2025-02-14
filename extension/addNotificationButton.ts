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
  createMonitorToggleHandler,
  assertIsHTMLElement,
  isAlreadyButtoned,
  setSVGColor,
  isIdAlreadyMonitored,
  AutoDisconnectingMutationObserver,
} from "./helpers";

async function processElementsForWorkflowRunPages() {
  const workflowRunElements = document.querySelectorAll(
    WORKFLOW_RUN_ATTRIBUTE_SELECTOR
  );

  const currentlyRunningOrQueuedElements =
    getCurrentlyRunningOrQueuedWorkflowElements(workflowRunElements);

  for (const element of currentlyRunningOrQueuedElements) {
    // todo: incorporate this into the filter so that we just iterate through currently running && not already buttoned.
    if (!isAlreadyButtoned(element)) {
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
        workflowRunElement: element,
      });
    }
  }
}

async function processElementsForJobPages() {
  const jobElements = document.querySelectorAll(JOB_RUN_ATTRIBUTE_SELECTOR);

  console.assert(jobElements.length > 0, "Expected job elements to exist");

  const currentlyRunningOrQueued =
    getCurrentlyRunningOrQueuedWorkflowElements(jobElements);

  for (const element of currentlyRunningOrQueued) {
    if (!isAlreadyButtoned(element)) {
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
}

async function main() {
  console.debug("Running main()");

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

      new AutoDisconnectingMutationObserver(
        workflowRunCallback,
        "debug"
      ).observe(workflowRunsContainer);
    }
  } else if (shouldAddJobNotificationButton(window.location.href)) {
    await processElementsForJobPages();

    const jobRunsContainer = document.querySelector(
      "#repo-content-turbo-frame > div > div > split-page-layout > div > div.PageLayout-columns > div.PageLayout-region.PageLayout-pane.PageLayout-region--dividerNarrow-none-after.PageLayout-pane--sticky.border-right-0"
    );

    if (jobRunsContainer) {
      console.debug("Attaching job observer");

      const jobRunCallback = createWorkflowRunCallback(() =>
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
