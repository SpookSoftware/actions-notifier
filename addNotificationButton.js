// ------------------------- CONSTANTS ------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
const WORKFLOW_RUN_ATTRIBUTE_SELECTOR = "[data-url*='workflow-run']";

const CURRENTLY_RUNNING_ATTRIBUTE_SELECTOR =
  "svg[aria-label='currently running']";
const QUEUED_ATTRIBUTE_SELECTOR = "svg[aria-label='queued']";
const COMPLETED_ATTRIBUTE_SELECTOR = "svg[aria-label='completed successfully']";

const NOTIFICATION_BELL_PATH =
  "M12 1c3.681 0 7 2.565 7 6v4.539c0 .642.189 1.269.545 1.803l2.2 3.298A1.517 1.517 0 0 1 20.482 19H15.5a3.5 3.5 0 1 1-7 0H3.519a1.518 1.518 0 0 1-1.265-2.359l2.2-3.299A3.25 3.25 0 0 0 5 11.539V7c0-3.435 3.318-6 7-6ZM6.5 7v4.539a4.75 4.75 0 0 1-.797 2.635l-2.2 3.298-.003.01.001.007.004.006.006.004.007.001h16.964l.007-.001.006-.004.004-.006.001-.006a.017.017 0 0 0-.003-.01l-2.199-3.299a4.753 4.753 0 0 1-.798-2.635V7c0-2.364-2.383-4.5-5.5-4.5S6.5 4.636 6.5 7ZM14 19h-4a2 2 0 1 0 4 0Z";
const NOTIFICATION_BELL_VIEW_BOX = "0 0 24 24";
const NOTIFICATION_BELL_WIDTH = "24";
const NOTIFICATION_BELL_HEIGHT = "24";

// This is ripped from the DOM "copy selector" option and will surely need to be refactored
const WORKFLOW_RUNS_CONTAINER_ATTRIBUTE_SELECTOR =
  "#repo-content-pjax-container > split-page-layout > div > div > div.PageLayout-region.PageLayout-content > div > div > div.Box.Box--responsive.mt-3";

// Action URLs
// https://github.com/kory-smith/github-actions-browser-notifications/actions/workflows/waitAMinute.yml
const specificWorkflowPageRegex =
  /https:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+\/actions\/workflows\/.*/;
// https://github.com/kory-smith/github-actions-browser-notifications/actions
const allWorkflowsPageRegex =
  /https:\/\/github\.com\/[a-zA-Z0-9]+\/[a-zA-Z0-9]+\/actions/;
// https://github.com/krogertechnology/esperanto/pull/22932/checks
const prChecksPageRegex =
  /https:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+\/pull\/[a-zA-Z0-9-]+\/checks/;
// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------


// ------------------------- Specific-workflow page tools ----------------------------------------
// -----------------------------------------------------------------------------------------------
// https://github.com/kory-smith/github-actions-browser-notifications/actions/workflows/waitAMinute.yml

function isWorkflowRunDOMNode(node) {
  return (
    node.id &&
    node.id.startsWith("check_suite") &&
    node.querySelector(COMPLETED_ATTRIBUTE_SELECTOR) === null
  );
}

function processSpecificWorkflowPageNodes(mutationsList) {
  mutationsList.forEach((mutation) => {
    if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
      for (const addedNode of mutation.addedNodes) {
        if (isWorkflowRunDOMNode(addedNode)) {
          console.debug("Added node is workflow run: ", addedNode);

          console.debug(
            "Processing elements because a relevant change was detected in the page"
          );

          processElementsForAction(window.location.href);
        }
      }
    }
  });
}
// -----------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------

function processElementsForAction(url) {
  const isSpecificWorkflowPage = specificWorkflowPageRegex.test(url);
  if (isSpecificWorkflowPage) {
    const workflowRunElements = document.querySelectorAll(
      WORKFLOW_RUN_ATTRIBUTE_SELECTOR
    );

    const filteredDivs = Array.from(workflowRunElements).filter((div) => {
      const isCurrentlyRunning =
        div.querySelector(CURRENTLY_RUNNING_ATTRIBUTE_SELECTOR) !== null;
      const isQueued = div.querySelector(QUEUED_ATTRIBUTE_SELECTOR) !== null;
      const isWorkflowRun = div.id.startsWith("check_suite");
      return (isCurrentlyRunning || isQueued) && isWorkflowRun;
    });

    filteredDivs.forEach((element) => {
      const link = element.querySelector("a");
      const [_, _2, _3, owner, repository, _4, _5, runId] =
        link.href.split("/");

      // Create a new button to contain the SVG
      const svgButton = document.createElement("button");
      svgButton.dataset.runId = runId;
      svgButton.dataset.owner = owner;
      svgButton.dataset.repository = repository;

      const svgElement = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      svgElement.setAttributeNS(null, "viewBox", "0 0 24 24");
      svgElement.setAttributeNS(null, "width", "24");
      svgElement.setAttributeNS(null, "height", "24");

      const pathElement = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      pathElement.setAttributeNS(null, "d", NOTIFICATION_BELL_PATH);

      svgElement.appendChild(pathElement);
      svgButton.appendChild(svgElement);
      element.appendChild(svgButton);

      svgButton.addEventListener("click", function (event) {
        const runId = event.currentTarget.dataset.runId;
        const owner = event.currentTarget.dataset.owner;
        const repository = event.currentTarget.dataset.repository;

        chrome.runtime.sendMessage({
          action: "startMonitoring",
          runId,
          owner,
          repository,
          type: "action",
        });

        console.debug(
          `Sent message to start monitoring for ${runId} with owner ${owner} and repository ${repository}`
        );
      });

      console.debug(
        "Successfully added button with callback to element",
        element
      );
    });
  }

  const isAllWorkflowsPage = allWorkflowsPageRegex.test(url);
  if (isAllWorkflowsPage) {
  }

  const isPrChecksPage = prChecksPageRegex.test(url);
  if (isPrChecksPage) {
  }
}

function processElementsForJob() {
  // Find the anchor tag with a link to #logs
  const logsTarget = document.querySelector("a[href='#logs']");

  // add a button next to it
  const [_, _2, _3, owner, repository, _4, _5, runId, _6, maybePollutedJobId] =
    window.location.href.split("/");

  // remove all non-numeric characters from the job id
  const jobId = maybePollutedJobId.replace(/\D/g, "");

  // Create a new button to contain the SVG
  const svgButton = document.createElement("button");
  svgButton.dataset.runId = runId;
  svgButton.dataset.jobId = jobId;
  svgButton.dataset.owner = owner;
  svgButton.dataset.repository = repository;

  const svgElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  svgElement.setAttributeNS(null, "viewBox", "0 0 24 24");
  svgElement.setAttributeNS(null, "width", "24");
  svgElement.setAttributeNS(null, "height", "24");

  const pathElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  pathElement.setAttributeNS(null, "d", NOTIFICATION_BELL_PATH);

  svgElement.appendChild(pathElement);
  svgButton.appendChild(svgElement);
  logsTarget.appendChild(svgButton);

  svgButton.addEventListener("click", function (event) {
    const runId = event.currentTarget.dataset.runId;
    const jobId = event.currentTarget.dataset.jobId;
    const owner = event.currentTarget.dataset.owner;
    const repository = event.currentTarget.dataset.repository;

    chrome.runtime.sendMessage({
      action: "startMonitoring",
      runId,
      jobId,
      owner,
      repository,
      type: "job",
    });

    console.debug(
      `Sent message to start monitoring for job ${jobId} under action ${runId} with owner ${owner} and repository ${repository}`
    );
  });
}

const workflowRunsContainer = document.querySelector(
  WORKFLOW_RUNS_CONTAINER_ATTRIBUTE_SELECTOR
);

const config = { attributes: true, childList: true, subtree: true };

function shouldAddActionNotificationButton(url) {
  // This is black magic. Basically, this regex matches the following kinds of URLs:
  // - https://github.com/kory-smith/github-actions-browser-notifications/actions
  // - https://github.com/kory-smith/github-actions-browser-notifications/pull/22932/checks
  // - https://github.com/kory-smith/github-actions-browser-notifications/actions/workflows/waitAMinute.yml
  const pattern =
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/(actions|actions\/workflows\/[^/]+|pull\/[^/]+\/checks)$/;
  return pattern.test(url);
}

function shouldAddJobNotificationButton(url) {
  // This is black magic. Basically, this regex matches the following kinds of URLs:
  // - https://github.com/kory-smith/github-actions-browser-notifications/pull/22932
  // - https://github.com/krogertechnology/esperanto/actions/runs/5868323719/job/16080910446
  // - https://github.com/krogertechnology/esperanto/actions/runs/5868323719
  const pattern =
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/(pull\/[^/]+|actions\/runs\/[^/]+(\/job\/[^/]+)?)$/;
  return pattern.test(url);
}

chrome.runtime.onMessage.addListener(function (request) {
  if (request && request.type === "page-rendered") {
    console.debug(
      "Received request to refresh notification buttons because of a url change. URL: ",
      request.url
    );
    if (shouldAddActionNotificationButton(request.url)) {
      console.debug("Heading down the action path");
      processElementsForAction(request.url);
      const workflowObserver = new MutationObserver(
        processSpecificWorkflowPageNodes
      );
      workflowObserver.observe(workflowRunsContainer, config);
    } else if (shouldAddJobNotificationButton(request.url)) {
      console.debug("Heading down the job path");
      processElementsForJob(request.url);
    }
  }
});

console.debug(`Processing elements because of page refresh`);
if (shouldAddActionNotificationButton(window.location.href)) {
  processElementsForAction(window.location.href);
  const workflowObserver = new MutationObserver(processNewNodes);
  workflowObserver.observe(workflowRunsContainer, config);
}
if (shouldAddJobNotificationButton(window.location.href)) {
}
