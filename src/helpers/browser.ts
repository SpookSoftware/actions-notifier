// This file is for all functions that make use of the browser polyfill.
import browser from "webextension-polyfill";
import {
  buildMonitoringPayloads,
  decode,
  encode,
  setSVGColor,
  resetSVGColor,
  isValidGithubResponse,
  encodeRequest,
  createURL,
  isProperlyEncoded,
  isStartMonitoringRequest,
  isStopMonitoringRequest,
  hasClickHandler,
} from "@/helpers/pure";
import { getPaymentStatus } from "@/services/payment";
import type { MonitorResponse, Encoded, MonitorRequest } from "@/types";
import ExtPay from "extpay";
import { trialIsValid } from "@/services/trial";
const extpay = ExtPay("cicd-workflow-notifications");

// Token validation error types
export type TokenValidationError =
  | "NO_TOKEN_FOUND"
  | "INVALID_TOKEN"
  | "NETWORK_ERROR"
  | "PERMISSION_ERROR";

// Token status information
export type TokenStatus = {
  isValid: boolean;
  errorType?: TokenValidationError;
  errorMessage?: string;
};

// Constants
export const MAX_ALARMS = 500;
const TOKEN_NOTIFICATION_ID = "github-token-required";
const EXTENSION_ENABLED_KEY = "extensionEnabled";
const GITHUB_TOKEN_KEY = "githubToken";

/**
 * Sends a message to the background script
 */
export async function sendStructuredMessage(
  payload: MonitorRequest
): Promise<MonitorResponse> {
  return await browser.runtime.sendMessage(payload);
}

/**
 * Get the current extension enabled state
 */
export async function isExtensionEnabled(): Promise<boolean> {
  try {
    // Get from storage first to avoid circular dependency
    const data = await browser.storage.sync.get(EXTENSION_ENABLED_KEY);
    if (EXTENSION_ENABLED_KEY in data) {
      return Boolean(data[EXTENSION_ENABLED_KEY]);
    }

    // If not in storage, calculate based on conditions
    // Get token first to check if it exists
    const tokenData = await browser.storage.sync.get(GITHUB_TOKEN_KEY);
    if (!tokenData.githubToken) {
      return false; // No token = disabled
    }

    const tooManyAlarms = (await getActiveAlarmCount()) >= MAX_ALARMS;
    const paymentStatus = await getPaymentStatus();
    const userHasPaid = paymentStatus.paid;
    const userHasValidTrial = paymentStatus.trialIsValid;

    // Validate token directly to avoid circular reference
    const tokenIsValid = await validateTokenDirectly(
      String(tokenData.githubToken)
    );

    const extensionEnabled =
      tokenIsValid && !tooManyAlarms && (userHasPaid || userHasValidTrial);

    return extensionEnabled;
  } catch (error) {
    console.error("Error checking extension enabled state:", error);
    return false; // Default to disabled on error for safety
  }
}

// Helper to validate token without circular dependency
async function validateTokenDirectly(token: string): Promise<boolean> {
  try {
    // Test token with GitHub API
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    // Check for unauthorized
    if (response.status === 401) {
      return false;
    }

    // Test if token has repo scope with a sample repo request
    const repoResponse = await fetch(
      "https://api.github.com/repos/octocat/hello-world",
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (repoResponse.status === 403) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error validating token directly:", error);
    return false;
  }
}

/**
 * Set the extension enabled state
 */
export async function setExtensionEnabled(enabled: boolean): Promise<void> {
  try {
    await browser.storage.sync.set({ [EXTENSION_ENABLED_KEY]: enabled });
    console.debug(`Extension enabled state set to: ${enabled}`);
  } catch (error) {
    console.error("Error setting extension enabled state:", error);
  }
}

export async function validateGitHubToken(): Promise<TokenStatus> {
  try {
    // Check if token exists
    const data = await browser.storage.sync.get(GITHUB_TOKEN_KEY);

    if (!data.githubToken) {
      return {
        isValid: false,
        errorType: "NO_TOKEN_FOUND",
        errorMessage: "No GitHub token configured",
      };
    }

    // Test token with GitHub API
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${data.githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    // Check for unauthorized
    if (response.status === 401) {
      return {
        isValid: false,
        errorType: "INVALID_TOKEN",
        errorMessage: "Invalid GitHub token",
      };
    }

    // Test if token has repo scope with a sample repo request
    const repoResponse = await fetch(
      "https://api.github.com/repos/octocat/hello-world",
      {
        headers: {
          Authorization: `token ${data.githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (repoResponse.status === 403) {
      return {
        isValid: false,
        errorType: "PERMISSION_ERROR",
        errorMessage: "Token lacks required 'repo' permissions",
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      errorType: "NETWORK_ERROR",
      errorMessage: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Gets the current number of active alarms
 */
export async function getActiveAlarmCount(): Promise<number> {
  try {
    const alarms = await browser.alarms.getAll();
    return alarms.length;
  } catch (error) {
    console.error("Error getting alarm count:", error);
    return 0;
  }
}

/**
 * Creates a callback function that sends a message to the background script to start/stop monitoring
 */
export function createMonitorToggleHandler({
  runId,
  jobId,
  owner,
  repository,
  svg,
}: {
  runId: string;
  jobId?: string;
  owner: string;
  repository: string;
  svg: SVGElement;
}) {
  const { start: startMonitorPayload, stop: stopMonitorPayload } =
    buildMonitoringPayloads({
      runId,
      jobId,
      owner,
      repository,
    });

  async function sendMonitoringMessage(_event: MouseEvent) {
    try {
      const isAlreadyMonitored = await isIdAlreadyMonitored({
        runId,
        jobId,
        owner,
        repository,
      });

      if (!isAlreadyMonitored) {
        // Start monitoring
        const startResponse = await sendStructuredMessage(startMonitorPayload);

        if (startResponse.status === "ok") {
          setSVGColor(svg, "yellow");

          // Store timestamp when monitor was created
          const encoded = encode({ runId, jobId, owner, repository });
          await browser.storage.sync.set({
            [encoded]: Date.now(),
          });
        } else {
          setSVGColor(svg, "red");
        }
      } else {
        // Stop monitoring
        const stopResponse = await sendStructuredMessage(stopMonitorPayload);

        if (stopResponse.status === "ok") {
          resetSVGColor(svg);
        } else {
          setSVGColor(svg, "red");
        }
      }
    } catch (error) {
      console.error("Error in monitor toggle handler:", error);
      setSVGColor(svg, "red");
    }
  }

  return sendMonitoringMessage;
}

export async function isIdAlreadyMonitored(
  id:
    | Encoded
    | { runId: string; jobId?: string; owner: string; repository: string }
): Promise<boolean> {
  if (typeof id === "string") {
    try {
      const result = await browser.storage.sync.get(id);
      return Object.keys(result).length > 0;
    } catch (error) {
      console.error(
        "Error occurred while checking if id was already monitored",
        error
      );
      return false;
    }
  } else {
    return isIdAlreadyMonitored(encode(id));
  }
}

export async function assertGithubToken() {
  const tokenStatus = await validateGitHubToken();

  if (!tokenStatus.isValid) {
    throw Error(tokenStatus.errorMessage || "GitHub token validation failed");
  }

  // Get the token if valid
  const { githubToken } = await browser.storage.sync.get(GITHUB_TOKEN_KEY);
  return githubToken;
}

export async function checkActionStatus({
  runId,
  owner,
  repository,
}: {
  runId: string;
  owner: string;
  repository: string;
}) {
  const token = await assertGithubToken();
  const url = `https://api.github.com/repos/${owner}/${repository}/actions/runs/${runId}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  const data = await response.json();

  if (!isValidGithubResponse(data)) {
    throw new Error(
      "Expected response to contain data.status and data.name. Unexpected response from GitHub API: " +
        JSON.stringify(data)
    );
  }

  return {
    status: data.status,
    name: data.name,
    conclusion: data.conclusion,
  };
}

export async function checkJobStatus({
  jobId,
  owner,
  repository,
}: {
  jobId: string;
  owner: string;
  repository: string;
}) {
  const token = await assertGithubToken();
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repository}/actions/jobs/${jobId}`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  const data = await response.json();

  if (!isValidGithubResponse(data)) {
    throw new Error(
      "Expected response to contain data.status and data.name. Unexpected response from GitHub API: " +
        JSON.stringify(data)
    );
  }

  return {
    status: data.status,
    name: data.name,
    conclusion: data.conclusion,
  };
}

async function createAlarmForId(
  id: string,
  lengthInMinutes: number
): Promise<void> {
  browser.alarms.create(id, {
    periodInMinutes: lengthInMinutes,
  });
}

export async function storeMonitoringStatus(id: string): Promise<void> {
  await browser.storage.sync.set({ [id]: Date.now() });
}

async function setupMonitoring(
  id: string,
  lengthInMinutes: number
): Promise<void[]> {
  return await Promise.all([
    createAlarmForId(id, lengthInMinutes),
    storeMonitoringStatus(id),
  ]);
}

async function removeMonitoringStatus(id: string): Promise<void> {
  await browser.storage.sync.remove(id);
}

export async function cancelAlarmForId(id: string): Promise<boolean> {
  return await browser.alarms.clear(id);
}

async function cancelMonitoring(id: string): Promise<[boolean, void]> {
  return await Promise.all([cancelAlarmForId(id), removeMonitoringStatus(id)]);
}

// todo: How much of this is necessary now?
export async function onMessageCallback(
  request: unknown,
  _sender: browser.Runtime.MessageSender
): Promise<MonitorResponse> {
  // Handle extension state change requests
  if (request && typeof request === "object" && "action" in request) {
    const req = request as { action: string; enabled?: boolean };

    if (req.action === "getExtensionEnabled") {
      const enabled = await isExtensionEnabled();
      console.debug(`Getting extension enabled state: ${enabled}`);
      return { status: "ok", data: { enabled } };
    }
  }

  // First check if the extension is enabled
  const enabled = await isExtensionEnabled();
  if (!enabled) {
    console.debug("Extension is disabled, ignoring request");
    return {
      status: "error",
      error: new Error("Extension is disabled"),
    };
  }

  if (isStartMonitoringRequest(request)) {
    const encoded = encodeRequest(request);

    console.debug(`Received request to monitor ${encoded}`);

    // Check token status first
    const tokenStatus = await validateGitHubToken();
    if (!tokenStatus.isValid) {
      console.error(`Monitoring setup failed: ${tokenStatus.errorMessage}`);

      // Automatically disable the extension on token issues
      await setExtensionEnabled(false);

      return {
        status: "error",
        error: new Error(tokenStatus.errorMessage || "Token validation failed"),
      };
    }

    // Check alarm count
    const alarmCount = await getActiveAlarmCount();
    if (alarmCount >= MAX_ALARMS) {
      console.error(
        `Monitoring setup failed: Alarm limit reached (${alarmCount}/${MAX_ALARMS})`
      );
      // Automatically disable the extension when alarm limit is reached
      await setExtensionEnabled(false);

      return {
        status: "error",
        error: new Error(`Alarm limit reached (${alarmCount}/${MAX_ALARMS})`),
      };
    }

    try {
      await setupMonitoring(encoded, 1);
      console.debug(`Started monitoring for id ${encoded}`);
      return { status: "ok" };
    } catch (err) {
      console.error(`Monitoring setup failed for id ${encoded}`);
      return { status: "error", error: err as Error };
    }
  } else if (isStopMonitoringRequest(request)) {
    const encoded = encodeRequest(request);

    console.debug(`Received request to stop monitoring ${encoded}`);

    try {
      await cancelMonitoring(encoded);
      console.debug(`Stopped monitoring for id ${encoded}`);
      return { status: "ok" };
    } catch (err) {
      console.error(`Monitoring cancellation failed for id ${encoded}`);
      return { status: "error", error: err as Error };
    }
  } else {
    throw Error(`Unexpected request: ${JSON.stringify(request)}`);
  }
}

export const onAlarmCallback = async (alarm: browser.Alarms.Alarm) => {
  if (alarm.name === "pollExtensionValidity") {
    console.log("Running pollExtensionValidity alarm callback");
    const { githubToken } = await browser.storage.sync.get(GITHUB_TOKEN_KEY);
    if (!githubToken) {
      console.debug("Disabling extension due to missing token");
      await browser.storage.sync.set({ [EXTENSION_ENABLED_KEY]: false });
      return;
    }
    const tokenIsValid = await validateTokenDirectly(String(githubToken));

    const user = await extpay.getUser();
    const isPaid = user.paid;
    const isTrialed = trialIsValid(user.trialStartedAt);

    const extensionIsValid = tokenIsValid && (isPaid || isTrialed);
    if (!extensionIsValid) {
      console.debug("Disabling extension due to invalid state");
      console.debug(`Token valid: ${tokenIsValid}`);
      console.debug(`User paid: ${isPaid}`);
      console.debug(`User trialed: ${isTrialed}`);
      await browser.storage.sync.set({ [EXTENSION_ENABLED_KEY]: false });
    } else {
      console.debug("Enabling extension due to valid state");
      await browser.storage.sync.set({ [EXTENSION_ENABLED_KEY]: true });
    }
    return;
  } else if (!isProperlyEncoded(alarm.name)) {
    throw Error("Unexpected alarm name format: " + alarm.name);
  }

  // First check if the extension is enabled
  const enabled = await isExtensionEnabled();
  if (!enabled) {
    console.debug("Extension is disabled, ignoring alarm callback");
    return;
  }

  try {
    const decoded = decode(alarm.name);
    const runId = decoded.runId;
    const owner = decoded.owner;
    const repository = decoded.repository;
    const jobId = decoded.jobId;

    // Validate token before making API calls
    const tokenStatus = await validateGitHubToken();
    if (!tokenStatus.isValid) {
      console.error(`Alarm callback failed: ${tokenStatus.errorMessage}`);

      // Don't cancel monitoring yet - the user might fix their token
      return;
    }

    const {
      status,
      name: taskName,
      conclusion,
    } = await checkStatus({
      runId,
      owner,
      repository,
      jobId,
    });

    console.debug(
      `Alarm ${alarm.name} fired with status ${status}, conclusion ${conclusion}`
    );

    if (status === "completed") {
      await createCompletionNotification(alarm.name, taskName, conclusion);
      await teardown(alarm.name);
    }
  } catch (error) {
    console.error(`Error in alarm callback for ${alarm.name}:`, error);
    // Consider cleaning up the alarm if it's consistently failing
  }
};

export async function teardown(alarmName: string) {
  await browser.alarms.clear(alarmName);
  console.debug(`Alarm ${alarmName} cleared`);
  await browser.storage.sync.remove(alarmName);
  console.debug(`Monitoring status for ${alarmName} cleared from storage`);
}

export async function createCompletionNotification(
  alarmName: string,
  taskName: string,
  conclusion?: string
) {
  // Determine if this is a job or an action based on the alarm name
  if (isProperlyEncoded(alarmName)) {
    const decoded = decode(alarmName);
    const isJob = !!decoded.jobId;

    // Format conclusion for display - capitalize first letter and handle undefined
    let formattedConclusion = conclusion || "unknown";
    formattedConclusion =
      formattedConclusion.charAt(0).toUpperCase() +
      formattedConclusion.slice(1);

    await browser.notifications.create(alarmName, {
      type: "basic",
      title: isJob ? "Job Completed" : "Action Completed",
      message: `${taskName} has completed with result: ${formattedConclusion}. Click to view the details.`,
      iconUrl: browser.runtime.getURL("images/icon-128.png"),
    });
    console.debug(
      `Successfully created notification for ${
        isJob ? "job" : "action"
      } with id ${alarmName} (conclusion: ${conclusion})`
    );
  } else {
    console.error(`Unexpected alarm name format: ${alarmName}`);
  }
}

export async function onNotificationClickedCallback(notificationId: string) {
  console.debug(`Notification ${notificationId} clicked.`);

  if (!isProperlyEncoded(notificationId)) {
    console.error(`Unexpected notification ID format: ${notificationId}`);
    return;
  }
  try {
    const decoded = decode(notificationId);
    await browser.tabs.create({
      url: createURL(decoded),
    });
  } catch (error) {
    console.error(
      `Error handling notification click for ${notificationId}:`,
      error
    );
  }
}

export async function checkStatus({
  runId,
  owner,
  repository,
  jobId,
}: {
  runId: string;
  owner: string;
  repository: string;
  jobId?: string;
}) {
  if (jobId) {
    return await checkJobStatus({ jobId, owner, repository });
  } else {
    return await checkActionStatus({ runId, owner, repository });
  }
}

export class URLAwareMutationObserver {
  private observer: MutationObserver;
  private activeTarget: Element | null = null;
  private currentUrl: string;

  // Store bound handler references for proper removal
  private boundHandleUrlChange: () => void;

  public mode: "normal" | "debug";
  private id: string; // Unique ID for this observer instance

  // Track all observer instances to prevent duplicates
  private static instances: Set<URLAwareMutationObserver> = new Set();
  private static instanceCounter = 0;

  constructor(callback: MutationCallback, mode: "normal" | "debug" = "normal") {
    this.observer = new MutationObserver(callback);
    this.currentUrl = window.location.href;
    this.mode = mode;
    this.id = `observer-${++URLAwareMutationObserver.instanceCounter}`;

    // Bind event handlers once
    this.boundHandleUrlChange = this.handleUrlChange.bind(this);

    if (this.mode === "debug") {
      console.debug(`[${this.id}] New URLAwareMutationObserver created`);
    }

    // Add to instance tracking
    URLAwareMutationObserver.instances.add(this);

    if (this.mode === "debug") {
      console.debug(
        `Active observer count: ${URLAwareMutationObserver.instances.size}`
      );
    }
  }

  observe(target: Element) {
    if (this.activeTarget) {
      if (this.mode === "debug") {
        console.debug(
          `[${this.id}] Disconnecting previous observer before attaching to new target`
        );
      }
      this.disconnect();
    }

    this.observer.observe(target, {
      childList: true,
      subtree: true,
    });

    this.activeTarget = target;

    if (this.mode === "debug") {
      console.debug(`[${this.id}] MutationObserver attached to:`, target);
    }
  }

  disconnect() {
    if (this.activeTarget) {
      if (this.mode === "debug") {
        console.debug(`[${this.id}] MutationObserver disconnected`);
      }

      this.observer.disconnect();
      this.activeTarget = null;
    }
  }

  destroy() {
    if (this.mode === "debug") {
      console.debug(`[${this.id}] Destroying observer instance`);
    }

    this.disconnect();

    // Remove from instance tracking
    URLAwareMutationObserver.instances.delete(this);

    if (this.mode === "debug") {
      console.debug(
        `Active observer count after destroy: ${URLAwareMutationObserver.instances.size}`
      );
    }
  }

  private handleUrlChange() {
    const newUrl = window.location.href;

    if (this.currentUrl === newUrl) return;

    if (this.mode === "debug") {
      console.debug(
        `[${this.id}] URL changed from ${this.currentUrl} to ${newUrl}`
      );
    }

    // Disconnect the current observer
    this.disconnect();

    // Update current URL
    this.currentUrl = newUrl;
  }

  // Static method to destroy all observer instances
  static destroyAll() {
    console.debug(
      `Destroying all ${URLAwareMutationObserver.instances.size} observer instances`
    );

    // Create a new array to avoid issues with modifying the set during iteration
    [...URLAwareMutationObserver.instances].forEach((instance) => {
      instance.destroy();
    });

    URLAwareMutationObserver.instances.clear();
    console.debug("All observers destroyed");
  }
}

export function ensureButtonHasHandler(button: HTMLElement): void {
  if (!hasClickHandler(button)) {
    console.debug("Fixing button with missing click handler");

    // Extract data from button attributes
    const runId = button.dataset.runId;
    const jobId = button.dataset.jobId;
    const owner = button.dataset.owner;
    const repository = button.dataset.repository;

    // Find the SVG
    const svg = button.querySelector("svg");

    if (runId && owner && repository && svg instanceof SVGElement) {
      // Create a new handler and attach it
      const handleMonitoringClickFn = createMonitorToggleHandler({
        runId,
        jobId,
        owner,
        repository,
        svg,
      });

      // Re-attach the handler
      button.onclick = handleMonitoringClickFn;

      // Update color if needed
      const encoded = encode({
        runId,
        jobId,
        owner,
        repository,
      });

      isIdAlreadyMonitored(encoded).then((isMonitored) => {
        if (isMonitored) {
          setSVGColor(svg, "yellow");
        } else {
          resetSVGColor(svg);
        }
      });

      console.debug("Successfully restored button handler");
    } else {
      console.debug("Couldn't restore button - missing data attributes or SVG");
    }
  }
}

export function debounce(func: Function, wait: number) {
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

/**
 * Creates and shows a tooltip near a button element
 */
export function showButtonTooltip(button: HTMLElement, message: string): void {
  // First, remove any existing tooltips
  removeExistingTooltips();

  // Create tooltip container
  const tooltip = document.createElement("div");
  tooltip.className = "cicd-workflow-tooltip";
  tooltip.style.position = "absolute";
  tooltip.style.zIndex = "9999";
  tooltip.style.backgroundColor = "#24292e";
  tooltip.style.color = "white";
  tooltip.style.padding = "8px 12px";
  tooltip.style.borderRadius = "6px";
  tooltip.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.2)";
  tooltip.style.fontSize = "12px";
  tooltip.style.maxWidth = "250px";
  tooltip.style.whiteSpace = "normal";
  tooltip.style.textAlign = "left";

  // Create content container
  const content = document.createElement("div");
  content.style.display = "flex";
  content.style.alignItems = "flex-start";
  content.style.gap = "8px";

  // Add message
  const messageSpan = document.createElement("span");
  messageSpan.textContent = message;
  messageSpan.style.flexGrow = "1";

  // Add close button
  const closeButton = document.createElement("button");
  closeButton.innerHTML = "&times;";
  closeButton.style.background = "none";
  closeButton.style.border = "none";
  closeButton.style.color = "#959da5";
  closeButton.style.fontSize = "16px";
  closeButton.style.cursor = "pointer";
  closeButton.style.padding = "0 0 0 8px";
  closeButton.style.lineHeight = "1";
  closeButton.style.flexShrink = "0";
  closeButton.title = "Dismiss";

  // Add event listener to close button
  closeButton.addEventListener("click", (e) => {
    e.stopPropagation();
    if (document.body.contains(tooltip)) {
      document.body.removeChild(tooltip);
    }
  });

  // Add close on outside click
  document.addEventListener(
    "click",
    (e) => {
      if (
        !tooltip.contains(e.target as Node) &&
        document.body.contains(tooltip)
      ) {
        document.body.removeChild(tooltip);
      }
    },
    { once: true }
  );

  // Create arrow element
  const arrow = document.createElement("div");
  arrow.style.position = "absolute";
  arrow.style.bottom = "-5px";
  arrow.style.left = "50%";
  arrow.style.marginLeft = "-5px";
  arrow.style.borderWidth = "5px 5px 0";
  arrow.style.borderStyle = "solid";
  arrow.style.borderColor = "#24292e transparent transparent";

  // Assemble the tooltip
  content.appendChild(messageSpan);
  content.appendChild(closeButton);
  tooltip.appendChild(content);
  tooltip.appendChild(arrow);

  // Add auto-dismiss timer
  setTimeout(() => {
    if (document.body.contains(tooltip)) {
      document.body.removeChild(tooltip);
    }
  }, 5000);

  // Position the tooltip - above the button
  document.body.appendChild(tooltip);

  // Get button position
  const buttonRect = button.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();

  // Position tooltip centered above button
  const top = buttonRect.top + window.scrollY - tooltipRect.height - 10;
  const left =
    buttonRect.left +
    window.scrollX +
    buttonRect.width / 2 -
    tooltipRect.width / 2;

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;

  // Ensure the tooltip stays within viewport boundaries
  const rightEdge = left + tooltipRect.width;
  const viewportWidth = window.innerWidth;

  if (rightEdge > viewportWidth - 10) {
    tooltip.style.left = `${viewportWidth - tooltipRect.width - 10}px`;
    // Adjust arrow position
    arrow.style.left = `${
      buttonRect.left +
      buttonRect.width / 2 -
      (viewportWidth - tooltipRect.width - 10)
    }px`;
  } else if (left < 10) {
    tooltip.style.left = "10px";
    // Adjust arrow position
    arrow.style.left = `${buttonRect.left + buttonRect.width / 2 - 10}px`;
  }
}

/**
 * Removes any existing tooltips from the DOM
 */
export function removeExistingTooltips(): void {
  const existingTooltips = document.querySelectorAll(".cicd-workflow-tooltip");
  existingTooltips.forEach((tooltip) => {
    if (tooltip.parentElement) {
      tooltip.parentElement.removeChild(tooltip);
    }
  });
}
