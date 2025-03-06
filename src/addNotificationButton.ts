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
  createMonitorToggleHandler,
  ensureButtonHasHandler,
  isIdAlreadyMonitored,
  URLAwareMutationObserver,
} from "./helpers/browser";
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
  assertIsHTMLElement,
  setSVGColor,
  shouldMonitorPRs,
  getTargetPRElements,
  insertButtonBetweenStatusAndDetails,
  createPRRunCallback,
  shouldMonitorChecks,
  NOTIFICATION_BUTTON_CLASS,
  messageIsEnabledStatusChange,
  isGetExtensionEnabledResponse,
} from "./helpers/pure";
import browser from "webextension-polyfill";

// Import the notification component
import {
  NotificationType,
  showInPageNotification,
} from "./components/react/InPageNotification";

// Listen for messages from the background script or other parts of the extension
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.debug("Content script received message:", message);

  if (messageIsEnabledStatusChange(message)) {
    console.debug(`Extension state changed to: ${message.enabled}`);

    if (!message.enabled) {
      // If extension is disabled, don't add more buttons.
      cleanupObservers();
      console.debug("Extension disabled, observers cleaned up");
    } else {
      // If extension is re-enabled, restart the main process
      console.debug("Extension enabled, restarting main process");
      debouncedMain();
    }
  } else if (
    message &&
    typeof message === "object" &&
    "action" in message &&
    message.action === "showNotification" &&
    "type" in message &&
    message.type
  ) {
    // Handle notification requests
    console.debug(`Showing in-page notification: ${message.type}`);

    if (message.type === "token-expired") {
      showInPageNotification(NotificationType.TOKEN_EXPIRED);
    } else if (message.type === "alarm-limit-reached") {
      showInPageNotification(NotificationType.ALARM_LIMIT_REACHED);
    }
  }

  return true;
});

declare global {
  interface History {
    _patchedByNotifier?: boolean;
  }
}

// Global observers
let actionObserver: URLAwareMutationObserver | null = null;
let jobObserver: URLAwareMutationObserver | null = null;
let prObserver: URLAwareMutationObserver | null = null;
let checksObserver: URLAwareMutationObserver | null = null;

// URL change tracking
let currentUrl = window.location.href;
let isInitialized = false;
let pendingMainExecution = false;

// Debounce helper
function debounce(func: Function, wait: number) {
  let timeout: number | null = null;

  return function (...args: any[]) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      window.clearTimeout(timeout);
    }
    timeout = window.setTimeout(later, wait) as unknown as number;
  };
}

async function processElementsForActionRunPages() {
  const actionRunElements = document.querySelectorAll(ACTION_RUNS_SELECTOR);

  // Github will recreate the buttons on back/forward but will remove the event listeners.
  document
    .querySelectorAll(`button.${NOTIFICATION_BUTTON_CLASS}`)
    .forEach((button) => {
      if (button instanceof HTMLElement) {
        ensureButtonHasHandler(button);
      }
    });

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

    // Check if already monitored
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

  if (jobElements.length === 0) {
    console.debug("No job elements found");
    return;
  }

  // Github will recreate the buttons on back/forward but will remove the event listeners.
  document
    .querySelectorAll(`button.${NOTIFICATION_BUTTON_CLASS}`)
    .forEach((button) => {
      if (button instanceof HTMLElement) {
        ensureButtonHasHandler(button);
      }
    });

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

  // Github will recreate the buttons on back/forward but will remove the event listeners.
  document
    .querySelectorAll(`button.${NOTIFICATION_BUTTON_CLASS}`)
    .forEach((button) => {
      if (button instanceof HTMLElement) {
        ensureButtonHasHandler(button);
      }
    });

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

  if (runs.length === 0) {
    console.debug("No check elements found");
    return;
  }

  // Github will recreate the buttons on back/forward but will remove the event listeners.
  document
    .querySelectorAll(`button.${NOTIFICATION_BUTTON_CLASS}`)
    .forEach((button) => {
      if (button instanceof HTMLElement) {
        ensureButtonHasHandler(button);
      }
    });

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

    element.appendChild(button);
  }
}

async function main(): Promise<void> {
  // If there's already a pending execution, don't create another one
  if (pendingMainExecution) {
    console.debug("Main execution already pending, skipping duplicate call");
    return;
  }

  pendingMainExecution = true;

  try {
    console.debug(`Running main() for URL: ${window.location.href}`);

    // First check if the extension is enabled
    try {
      const response = await browser.runtime.sendMessage({
        action: "getExtensionEnabled",
      });
      if (
        isGetExtensionEnabledResponse(response) &&
        response.status === "ok" &&
        response.data &&
        response.data.enabled === false
      ) {
        console.debug("Extension is disabled, not attaching observers");
        return;
      }
    } catch (error) {
      console.error("Error checking extension state:", error);
      // Continue anyway in case of error
    }

    // Track current URL
    currentUrl = window.location.href;

    // First clean up any existing observers
    cleanupObservers();

    if (shouldMonitorActions(window.location.href)) {
      console.debug("Determined we are in the action monitoring path");
      await processElementsForActionRunPages();

      const actionRunsContainer = document.querySelector(
        ACTION_RUNS_CONTAINER_SELECTOR
      );

      if (actionRunsContainer) {
        console.debug("Attaching action observer");

        const actionRunCallback = createActionRunCallback(
          async () => await processElementsForActionRunPages()
        );

        actionObserver = new URLAwareMutationObserver(
          actionRunCallback,
          "debug"
        );
        actionObserver.observe(actionRunsContainer);
      } else
        console.debug(
          "No action runs container found. This likely indicates an error"
        );
    } else if (shouldMonitorJobs(window.location.href)) {
      console.debug("Determined we are in the jobs monitoring path");
      await processElementsForJobPages();

      const jobRunsContainer = document.querySelector(
        JOB_RUNS_CONTAINER_SELECTOR
      );

      if (jobRunsContainer) {
        console.debug("Attaching job observer");

        const jobRunCallback = createActionRunCallback(
          async () => await processElementsForJobPages()
        );

        jobObserver = new URLAwareMutationObserver(jobRunCallback, "debug");
        jobObserver.observe(jobRunsContainer);
      } else {
        console.debug(
          "No job runs container found. This likely indicates an error"
        );
      }
    } else if (shouldMonitorPRs(window.location.href)) {
      console.debug("Determined we are in the PR monitoring path");
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

        prObserver = new URLAwareMutationObserver(prRunCallback, "debug");
        prObserver.observe(prRunsContainer);
      } else {
        console.debug(
          "No PR runs container found. This likely indicates an error"
        );
      }
    } else if (shouldMonitorChecks(window.location.href)) {
      console.debug("Determined we are in the checks monitoring path");
      await processElementForChecksPages();

      const checksContainer = document.querySelector(
        CHECKS_PAGE_CONTAINER_SELECTOR
      );

      if (checksContainer) {
        console.debug("Attaching checks observer");

        const checksRunCallback = createActionRunCallback(
          async () => await processElementForChecksPages()
        );

        checksObserver = new URLAwareMutationObserver(
          checksRunCallback,
          "debug"
        );
        checksObserver.observe(checksContainer);
      } else {
        console.debug(
          "No checks container found. This likely indicates an error"
        );
      }
    } else {
      console.debug("Current URL doesn't match any monitoring paths");
    }

    isInitialized = true;
  } finally {
    pendingMainExecution = false;
  }
}

// Clean up all observers
function cleanupObservers() {
  console.debug("Cleaning up all observers");

  // Clean up individual observers
  if (actionObserver) {
    actionObserver.destroy();
    actionObserver = null;
  }
  if (jobObserver) {
    jobObserver.destroy();
    jobObserver = null;
  }
  if (prObserver) {
    prObserver.destroy();
    prObserver = null;
  }
  if (checksObserver) {
    checksObserver.destroy();
    checksObserver = null;
  }

  // Just to be extra safe, destroy any leftover instances
  URLAwareMutationObserver.destroyAll();
}

// Debounced version of main to prevent multiple rapid executions
const debouncedMain = debounce(main, 150);

// Track URL changes using the History API
function patchHistoryAPI() {
  if (window.history._patchedByNotifier) {
    console.debug("History API already patched, skipping");
    return;
  }

  // Save original methods
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  // Patch pushState
  window.history.pushState = function (...args) {
    // Call original method
    const result = originalPushState.apply(this, args);

    // Check if URL actually changed
    if (window.location.href !== currentUrl) {
      console.debug(
        `pushState: URL changed from ${currentUrl} to ${window.location.href}`
      );
      debouncedMain();
    }

    return result;
  };

  // Patch replaceState
  window.history.replaceState = function (...args) {
    // Call original method
    const result = originalReplaceState.apply(this, args);

    // Check if URL actually changed
    if (window.location.href !== currentUrl) {
      console.debug(
        `replaceState: URL changed from ${currentUrl} to ${window.location.href}`
      );
      debouncedMain();
    }

    return result;
  };

  window.history._patchedByNotifier = true;
  console.debug("History API patched to detect URL changes");
}

// Setup URL change tracking
function setupURLChangeTracking() {
  // Patch History API
  patchHistoryAPI();

  // Handle browser back/forward navigation
  window.addEventListener("popstate", () => {
    if (window.location.href !== currentUrl) {
      console.debug(
        `popstate: URL changed from ${currentUrl} to ${window.location.href}`
      );
      debouncedMain();
    }
  });

  document.addEventListener("turbo:render", () => {
    debouncedMain();
  });

  console.debug("URL change tracking initialized");
}

// Check if first run and show welcome notification if needed
async function checkFirstRun() {
  try {
    const data = await browser.storage.local.get("hasSeenOnboarding");

    if (!data.hasSeenOnboarding) {
      console.debug("First run detected, showing welcome message");

      // Subtle notification at the bottom of the page
      const welcomeMessage = document.createElement("div");
      welcomeMessage.style.position = "fixed";
      welcomeMessage.style.bottom = "20px";
      welcomeMessage.style.right = "20px";
      welcomeMessage.style.backgroundColor = "#0366d6";
      welcomeMessage.style.color = "white";
      welcomeMessage.style.padding = "12px 16px";
      welcomeMessage.style.borderRadius = "6px";
      welcomeMessage.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
      welcomeMessage.style.zIndex = "9999";
      welcomeMessage.style.maxWidth = "320px";
      welcomeMessage.style.display = "flex";
      welcomeMessage.style.alignItems = "center";
      welcomeMessage.style.gap = "12px";

      // Icon
      const icon = document.createElement("img");
      icon.src = browser.runtime.getURL("images/icon-48.png");
      icon.style.width = "24px";
      icon.style.height = "24px";

      // Message text
      const text = document.createElement("div");
      text.innerHTML = `<b>CI/CD Workflow Notifications</b><br>Please configure your GitHub token to enable notifications.`;

      // Close button
      const closeBtn = document.createElement("button");
      closeBtn.innerHTML = "×";
      closeBtn.style.background = "none";
      closeBtn.style.border = "none";
      closeBtn.style.color = "white";
      closeBtn.style.fontSize = "20px";
      closeBtn.style.padding = "0";
      closeBtn.style.cursor = "pointer";
      closeBtn.style.marginLeft = "auto";
      closeBtn.style.lineHeight = "1";

      // Configure button
      const configBtn = document.createElement("button");
      configBtn.textContent = "Configure";
      configBtn.style.background = "white";
      configBtn.style.color = "#0366d6";
      configBtn.style.border = "none";
      configBtn.style.borderRadius = "4px";
      configBtn.style.padding = "4px 8px";
      configBtn.style.cursor = "pointer";
      configBtn.style.fontWeight = "bold";
      configBtn.style.fontSize = "12px";

      welcomeMessage.appendChild(icon);
      welcomeMessage.appendChild(text);
      welcomeMessage.appendChild(configBtn);
      welcomeMessage.appendChild(closeBtn);

      // Event listeners
      closeBtn.addEventListener("click", () => {
        document.body.removeChild(welcomeMessage);
      });

      configBtn.addEventListener("click", () => {
        browser.runtime.sendMessage({ action: "openOptionsPage" });
        document.body.removeChild(welcomeMessage);
      });

      // Add to page
      document.body.appendChild(welcomeMessage);

      // Auto-close after 15 seconds
      setTimeout(() => {
        if (document.body.contains(welcomeMessage)) {
          document.body.removeChild(welcomeMessage);
        }
      }, 15000);

      // Mark as seen
      await browser.storage.local.set({ hasSeenOnboarding: true });
    }
  } catch (error) {
    console.error("Error checking first run:", error);
  }
}

// Initialize if this hasn't been done already
if (!isInitialized) {
  console.debug("Initializing extension");
  setupURLChangeTracking();
  checkFirstRun(); // Check if this is first run
  main();
}

// Cleanup on unload
window.addEventListener("unload", () => {
  console.debug("Page unloading, cleaning up observers");
  cleanupObservers();
});
