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
} from "@/helpers/pure";
import { MonitorResponse, Encoded, MonitorRequest } from "@/types";

export async function sendMessageAsync(
  payload: unknown
): Promise<MonitorResponse> {
  return await browser.runtime.sendMessage(payload);
}

/**
 * Creates a callback function that sends a message to the background script to start monitoring a given run.
 * @returns A function that sends a message to the background script to start or stop monitoring the given run.
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

  // In case future me forgets, all the dynamic "runtime-y" stuff has to happen here, because this is what's actually getting called when the function gets clicked.
  async function sendMonitoringMessage(_event: MouseEvent) {
    const isAlreadyMonitored = await isIdAlreadyMonitored({
      runId,
      jobId,
      owner,
      repository,
    });
    if (!isAlreadyMonitored) {
      const startResponse = await sendMessageAsync(startMonitorPayload);
      if (startResponse.status === "ok") {
        setSVGColor(svg, "yellow");
      } else {
        setSVGColor(svg, "red");
      }
    } else {
      const stopResponse = await sendMessageAsync(stopMonitorPayload);
      if (stopResponse.status === "ok") {
        resetSVGColor(svg);
      } else {
        setSVGColor(svg, "red");
      }
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
  const token = await browser.storage.sync.get("githubToken");

  if (!token) {
    throw Error("Expected Github token to be available");
  }

  return token.githubToken;
}

export async function checkActionStatus({ runId, owner, repository }) {
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

export async function checkJobStatus({ jobId, owner, repository }) {
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
  await browser.storage.local.set({ [id]: true });
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
  const decoded = decode(alarm.name);
  const runId = decoded.runId;
  const owner = decoded.owner;
  const repository = decoded.repository;
  const jobId = decoded.jobId;

  const { status, name: taskName } = await checkStatus({
    runId,
    owner,
    repository,
    jobId,
  });

  console.debug(`Alarm ${alarm.name} fired with status ${status}`);

  if (status === "completed") {
    await createCompletionNotification(alarm.name, taskName);
    // Is this a failure point? Should I be doing something to handle any potential failures here?
    await teardown(alarm.name);
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
    title: "Action/job completed",
    message: `Item ${taskName} has completed. Click the notification to view the results.`,
    // todo: change this to a relevant icon.
    iconUrl:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAGlJREFUWEftl9EKABAMRfnZfdR+lvcpa01GHa+S03G56a149OL92wIgImMHpapb6Oh6ADCAgf8NRO+9fWPSBgC4bsArL68r0hkAoNyAPePrIQTgOQM2lNFMpLsAAAxg4LgBr2xOz5f/jiczr9Ahlc1SawAAAABJRU5ErkJggg==",
  });
  console.debug(`Successfully created notification with id ${alarmName}`);
}

export async function onNotificationClickedCallback(notificationId: string) {
  console.debug(`Notification ${notificationId} clicked.`);
  if (!isProperlyEncoded(notificationId)) {
    throw new Error(
      `Unexpected id format:  ${notificationId}. Should be in the format string|string|string or string|string|string|string`
    );
  }
  const decoded = decode(notificationId);
  await browser.tabs.create({
    url: createURL(decoded),
  });
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
