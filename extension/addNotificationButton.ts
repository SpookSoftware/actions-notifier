import {
  WORKFLOW_RUN_ATTRIBUTE_SELECTOR,
  SUCCESSFUL_ATTRIBUTE_SELECTOR,
  specificWorkflowPageRegex,
  allWorkflowsPageRegex,
  prChecksPageRegex,
  PR_CHECKS_CONTAINER_SELECTOR,
  PR_CHECKS_ACTION_LINK_SELECTOR,
} from "./selectors";
import {
  shouldAddActionNotificationButton,
  createNotificationButton,
  createNotificationSVG,
  extractActionDataFromURL,
  getCurrentlyRunningOrQueuedWorkflowElements,
} from "./helpers";

// ------------------------- Specific-workflow page tools ----------------------------------------
// -----------------------------------------------------------------------------------------------
// https://github.com/SpookSoftware/github-actions-browser-notifications/actions/workflows/waitAMinute.yml

function isWorkflowRunDOMNode(node) {
  return (
    node.id &&
    node.id.startsWith("check_suite") &&
    node.querySelector(SUCCESSFUL_ATTRIBUTE_SELECTOR) === null
  );
}

// function processSpecificWorkflowPageNodes(mutationsList) {
//   mutationsList.forEach((mutation) => {
//     if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
//       for (const addedNode of mutation.addedNodes) {
//         if (isWorkflowRunDOMNode(addedNode)) {
//           console.debug("Added node is workflow run: ", addedNode);

//           console.debug(
//             "Processing elements because a relevant change was detected in the page"
//           );

//           processElementsForAction(window.location.href);
//         }
//       }
//     }
//   });
// }
// -----------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------

// is this my "doer" script? It should just call other things, I think.
function processElementsForAction(url: string) {
  const isSpecificWorkflowPage = specificWorkflowPageRegex.test(url);
  const isAllWorkflowsPage = allWorkflowsPageRegex.test(url);
  console.debug(`isSpecificWorkflowPage: ${isSpecificWorkflowPage}`);
  console.debug(`isAllWorkflowsPage: ${isAllWorkflowsPage}`);

  if (isSpecificWorkflowPage || isAllWorkflowsPage) {
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

      // Maybe we can select the nth child instead of doing this?
      // Or maybe this is a function too? Again, this is logic, not glue.
      const childDiv = element.children[0];
      const betweenBranchAndTime = childDiv.children[2];

      // I think this is much too much logic and that this should be its own thing.
      // I also don't know if it behaves properly on response failure
      button.onclick = (_event) => {
        chrome.runtime.sendMessage(
          {
            action: "startMonitoring",
            runId,
            owner,
            repository,
            type: "action",
          },
          (response) => {
            const { status } = response;
            if (status === "ok") {
              svg.style.color = "yellow";
              svg.classList.remove("color-fg-muted");
              console.debug("successfully set svg color to yellow");
            } else {
              svg.style.color = "red";
              svg.classList.remove("color-fg-muted");
              console.debug("successfully set svg color to red");
            }
          }
        );
      };

      console.assert(
        betweenBranchAndTime,
        "Couldn't find proper place to insert notification button"
      );
      if (!betweenBranchAndTime) {
        continue;
      }

      childDiv.insertBefore(button, betweenBranchAndTime);
    }
  }

  const isPrChecksPage = prChecksPageRegex.test(url);
  console.debug(`isPrChecksPage: ${isPrChecksPage}`);
  if (isPrChecksPage) {
  }
}

const PR_PAGE_CONTAINER_SELECTOR = "div.branch-action-body";
const PR_PAGE_JOB_SELECTOR = "div.merge-status-item";
const PR_PAGE_REGEX = /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/[^/]+\/?$/;

// function processElementsForJob(url) {
//   const isPrPage = PR_PAGE_REGEX.test(url);
//   console.debug(`isPrPage: ${isPrPage}`);
//   if (isPrPage) {
//     console.debug("Processing elements for PR page");

//     const container = document?.querySelector(PR_PAGE_CONTAINER_SELECTOR);
//     const jobs = container?.querySelectorAll(PR_PAGE_JOB_SELECTOR);
//     const inProgressJobs =
//       jobs.length > 0 &&
//       jobs.filter((job) => job.querySelector("svg.anim-rotate"));

//     inProgressJobs.length > 0 &&
//       inProgressJobs.forEach((job) => {
//         const link = job.querySelector("a.status-actions");
//         const [_, _2, _3, owner, repository, _4, _5, runId, _6, pollutedJobId] =
//           link.href.split("/");
//         const jobId = pollutedJobId.split("?")[0];
//         console.log({ owner, repository, runId, jobId });

//         addNotificationButton(job, { runId, jobId, owner, repository });
//       });
//   }
// }

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
//     if (shouldAddActionNotificationButton(request.url)) {
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

if (shouldAddActionNotificationButton(window.location.href)) {
  console.debug("Determined we should process elements for action");
  processElementsForAction(window.location.href);
  // const workflowObserver = new MutationObserver(processNewNodes);
  // workflowObserver.observe(workflowRunsContainer, config);
}
// if (shouldAddJobNotificationButton(window.location.href)) {
//   console.debug("Determined we should process elements for job");
//   processElementsForJob(window.location.href);
// }
