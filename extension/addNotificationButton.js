import {
  WORKFLOW_RUN_ATTRIBUTE_SELECTOR,
  CURRENTLY_RUNNING_ATTRIBUTE_SELECTOR,
  QUEUED_ATTRIBUTE_SELECTOR,
  COMPLETED_ATTRIBUTE_SELECTOR,
  WORKFLOW_RUNS_CONTAINER_ATTRIBUTE_SELECTOR,
  specificWorkflowPageRegex,
  allWorkflowsPageRegex,
  prChecksPageRegex,
  PR_CHECKS_CONTAINER_SELECTOR,
  PR_CHECKS_ACTION_LINK_SELECTOR,
} from "./selectors";

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

// Todo: Handle error states. What happens if we don't provide some required args?
// https://todoist.com/showTask?id=7231923254
function addNotificationButton(element, { runId, jobId, owner, repository }) {
  const NOTIFICATION_BELL_PATH =
    "M12 1c3.681 0 7 2.565 7 6v4.539c0 .642.189 1.269.545 1.803l2.2 3.298A1.517 1.517 0 0 1 20.482 19H15.5a3.5 3.5 0 1 1-7 0H3.519a1.518 1.518 0 0 1-1.265-2.359l2.2-3.299A3.25 3.25 0 0 0 5 11.539V7c0-3.435 3.318-6 7-6ZM6.5 7v4.539a4.75 4.75 0 0 1-.797 2.635l-2.2 3.298-.003.01.001.007.004.006.006.004.007.001h16.964l.007-.001.006-.004.004-.006.001-.006a.017.017 0 0 0-.003-.01l-2.199-3.299a4.753 4.753 0 0 1-.798-2.635V7c0-2.364-2.383-4.5-5.5-4.5S6.5 4.636 6.5 7ZM14 19h-4a2 2 0 1 0 4 0Z";
  const NOTIFICATION_BELL_VIEW_BOX = "0 0 24 24";
  const NOTIFICATION_BELL_WIDTH = "24";
  const NOTIFICATION_BELL_HEIGHT = "24";

  if (jobId) {
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
    svgElement.setAttributeNS(null, "viewBox", NOTIFICATION_BELL_VIEW_BOX);
    svgElement.setAttributeNS(null, "width", NOTIFICATION_BELL_WIDTH);
    svgElement.setAttributeNS(null, "height", NOTIFICATION_BELL_HEIGHT);

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
        `Sent message to start monitoring for job ${jobId} with owner ${owner} and repository ${repository}`
      );
    });

    console.debug(
      "Successfully added button with callback to element",
      element
    );
  } else {
    // Create a new button to contain the SVG
    const svgButton = document.createElement("button");
    svgButton.dataset.runId = runId;
    svgButton.dataset.owner = owner;
    svgButton.dataset.repository = repository;

    const svgElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    svgElement.setAttributeNS(null, "viewBox", NOTIFICATION_BELL_VIEW_BOX);
    svgElement.setAttributeNS(null, "width", NOTIFICATION_BELL_WIDTH);
    svgElement.setAttributeNS(null, "height", NOTIFICATION_BELL_HEIGHT);

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
  }
}

function processElementsForAction(url) {
  const isSpecificWorkflowPage = specificWorkflowPageRegex.test(url);
  const isAllWorkflowsPage = allWorkflowsPageRegex.test(url);
  console.debug(`isSpecificWorkflowPage: ${isSpecificWorkflowPage}`);
  console.debug(`isAllWorkflowsPage: ${isAllWorkflowsPage}`);
  if (isSpecificWorkflowPage || isAllWorkflowsPage) {
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

      addNotificationButton(element, { runId, owner, repository });
    });
  }

  const isPrChecksPage = prChecksPageRegex.test(url);
  console.debug(`isPrChecksPage: ${isPrChecksPage}`);
  if (isPrChecksPage) {
    const linksContainer = document.querySelector(PR_CHECKS_CONTAINER_SELECTOR);
    const links = linksContainer.querySelectorAll(
      PR_CHECKS_ACTION_LINK_SELECTOR
    );

    links.forEach((link) => {
      const [_, _2, _3, owner, repository, _4, _5, runId] =
        link.href.split("/");

      // Prevent the button click from triggering the link
      const parent = link.parentElement;

      addNotificationButton(parent, { runId, owner, repository });
    });
  }
}

const PR_PAGE_CONTAINER_SELECTOR = "div.branch-action-body";
const PR_PAGE_JOB_SELECTOR = "div.merge-status-item";
const PR_PAGE_REGEX = /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/[^/]+\/?$/;

function processElementsForJob(url) {
  const isPrPage = PR_PAGE_REGEX.test(url);
  console.debug(`isPrPage: ${isPrPage}`);
  if (isPrPage) {
    console.debug("Processing elements for PR page");

    const container = document?.querySelector(PR_PAGE_CONTAINER_SELECTOR);
    const jobs = container?.querySelectorAll(PR_PAGE_JOB_SELECTOR);
    const inProgressJobs =
      jobs.length > 0 &&
      jobs.filter((job) => job.querySelector("svg.anim-rotate"));

    inProgressJobs.length > 0 &&
      inProgressJobs.forEach((job) => {
        const link = job.querySelector("a.status-actions");
        const [_, _2, _3, owner, repository, _4, _5, runId, _6, pollutedJobId] =
          link.href.split("/");
        const jobId = pollutedJobId.split("?")[0];
        console.log({ owner, repository, runId, jobId });

        addNotificationButton(job, { runId, jobId, owner, repository });
      });
  }
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
  const isPrPage = PR_PAGE_REGEX.test(url);
  const isJobPage = false;
  const isRunsPage = false;
  return isPrPage || isJobPage || isRunsPage;
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
  console.debug("Determined we should process elements for action");
  processElementsForAction(window.location.href);
  // const workflowObserver = new MutationObserver(processNewNodes);
  // workflowObserver.observe(workflowRunsContainer, config);
}
if (shouldAddJobNotificationButton(window.location.href)) {
  console.debug("Determined we should process elements for job");
  processElementsForJob(window.location.href);
}
