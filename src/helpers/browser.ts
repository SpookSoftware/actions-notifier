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
import { MonitorResponse, Encoded, MonitorRequest } from "@/types";

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

/**
 * Sends a message to the background script
 */
export async function sendMessageAsync(
  payload: unknown
): Promise<MonitorResponse> {
  return await browser.runtime.sendMessage(payload);
}

/**
 * Validates if a token exists and has proper permissions
 */
export async function validateGitHubToken(): Promise<TokenStatus> {
  try {
    // Check if token exists
    const data = await browser.storage.sync.get("githubToken");

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
 * Opens the token configuration page
 */
export function openTokenConfigPage(): void {
  browser.runtime.openOptionsPage();
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
        const startResponse = await sendMessageAsync(startMonitorPayload);

        if (startResponse.status === "ok") {
          setSVGColor(svg, "yellow");

          // Store timestamp when monitor was created
          const encoded = encode({ runId, jobId, owner, repository });
          await browser.storage.local.set({
            [encoded]: Date.now(),
          });
        } else {
          setSVGColor(svg, "red");
        }
      } else {
        // Stop monitoring
        const stopResponse = await sendMessageAsync(stopMonitorPayload);

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
      const result = await browser.storage.local.get(id);
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
  const token = await browser.storage.sync.get("githubToken");
  return token.githubToken;
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
  await browser.storage.local.set({ [id]: Date.now() });
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
  await browser.storage.local.remove(id);
}

export async function cancelAlarmForId(id: string): Promise<boolean> {
  return await browser.alarms.clear(id);
}

async function cancelMonitoring(id: string): Promise<[boolean, void]> {
  return await Promise.all([cancelAlarmForId(id), removeMonitoringStatus(id)]);
}

export async function onMessageCallback(
  request: unknown,
  _sender: browser.Runtime.MessageSender
): Promise<MonitorResponse> {
  if (isStartMonitoringRequest(request)) {
    const encoded = encodeRequest(request);

    console.debug(`Received request to monitor ${encoded}`);

    // Check token status first
    const tokenStatus = await validateGitHubToken();
    if (!tokenStatus.isValid) {
      console.error(`Monitoring setup failed: ${tokenStatus.errorMessage}`);
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
      return {
        status: "error",
        error: new Error(`Alarm limit reached (${alarmCount}/${MAX_ALARMS})`),
      };
    }

    try {
      await setupMonitoring(encoded, 0.1);
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
  if (!isProperlyEncoded(alarm.name)) {
    throw Error("Unexpected alarm name format: " + alarm.name);
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

    const { status, name: taskName } = await checkStatus({
      runId,
      owner,
      repository,
      jobId,
    });

    console.debug(`Alarm ${alarm.name} fired with status ${status}`);

    if (status === "completed") {
      await createCompletionNotification(alarm.name, taskName);
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
  await browser.storage.local.remove(alarmName);
  console.debug(`Monitoring status for ${alarmName} cleared from storage`);
}

export async function createCompletionNotification(
  alarmName: string,
  taskName: string
) {
  await browser.notifications.create(alarmName, {
    type: "basic",
    title: "Workflow Completed",
    message: `${taskName} has completed. Click to view the results.`,
    iconUrl: browser.runtime.getURL("images/icon-128.png"),
  });
  console.debug(`Successfully created notification with id ${alarmName}`);
}

export async function onNotificationClickedCallback(notificationId: string) {
  console.debug(`Notification ${notificationId} clicked.`);

  // Handle special notification IDs
  if (notificationId === TOKEN_NOTIFICATION_ID) {
    // Open token configuration page
    openTokenConfigPage();
    return;
  }

  if (notificationId === "alarm-limit-reached") {
    // Open management page
    browser.tabs.create({ url: browser.runtime.getURL("manage.html") });
    return;
  }

  if (!isProperlyEncoded(notificationId)) {
    console.error(`Unexpected notification ID format: ${notificationId}`);
    return;
  }

  // Handle normal workflow notifications
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
