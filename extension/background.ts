import { checkActionStatus, checkJobStatus } from "./helpers";

self.addEventListener("activate", (_event) => {
  console.log("I'm active! Whee!");

  chrome.alarms.clearAll(() => {
    console.log("Cleared all old alarms.");
  });
});

// ASYNC AWAIT NOT SUPPORTED
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "testNotification") {
    const { runId, owner, repository } = request;
    chrome.notifications.create(runId, {
      type: "basic",
      title: `This is a notification for run ${runId}`,
      message: "Click this icon to learn more about the run",
      iconUrl: "images/notification-24.png",
    });
  }
  if (request.type === "action" && request.action === "startMonitoring") {
    console.debug(
      `Received request to monitor action ${request.runId} for ${request.owner}/${request.repository}`
    );

    const { runId, owner, repository } = request;

    // Let's be fancy so we don't have to use any storage
    const encoded = `${runId}|${owner}|${repository}`;
    console.debug(`Creating alarm with name ${encoded}`);

    chrome.alarms
      .create(encoded, {
        periodInMinutes: 1,
      })
      .then((_res) => {
        console.debug(`Alarm ${encoded} created`);
        sendResponse({ status: "ok" });
      })
      .catch((err) => {
        sendResponse({ status: "error", error: err });
      });
  } else if (request.type === "job" && request.action === "startMonitoring") {
    console.debug(
      `Received request to monitor job ${request.jobId} in action action ${request.runId} for ${request.owner}/${request.repository}`
    );

    const { runId, jobId, owner, repository } = request;

    const encoded = `${runId}|${jobId}|${owner}|${repository}`;
    console.debug(`Creating alarm with name ${encoded}`);

    chrome.alarms
      .create(encoded, {
        periodInMinutes: 1,
      })
      .then((_res) => {
        console.debug(`Alarm ${encoded} created`);
        sendResponse({ status: "ok" });
      })
      .catch((err) => {
        sendResponse({ status: "error", error: err });
      });
  }
  // This signals to chrome that the connection will remain open until sendResponse is called.
  return true;
});

// I think this is allowed to be async?
chrome.alarms.onAlarm.addListener(async (alarm) => {
  const isActionRun = alarm.name.split("|").length === 3;
  if (isActionRun) {
    const [runId, owner, repository] = alarm.name.split("|");

    const { status, name } = await checkActionStatus(runId, owner, repository);

    console.debug(`Alarm ${alarm.name} fired with status ${status}`);

    if (status === "completed") {
      chrome.notifications.create(alarm.name, {
        type: "basic",
        title: "Action Completed",
        message: `Action ${name} has completed. Click the notification to view the results.`,
        iconUrl: "images/notification-24.png",
        requireInteraction: true,
      });

      console.debug(`Clearing alarm ${alarm.name}`);

      await chrome.alarms.clear(alarm.name);

      console.debug(`Alarm ${alarm.name} cleared`);
    }
  } else {
    const [runId, jobId, owner, repository] = alarm.name.split("|");

    const { status, name } = await checkJobStatus(jobId, owner, repository);

    console.debug(`Alarm ${alarm.name} fired with status ${status}`);

    if (status === "completed") {
      chrome.notifications.create(alarm.name, {
        type: "basic",
        title: "Job completed",
        message: `Job ${name} has completed. Click the notification to view the results.`,
        iconUrl: "images/notification-24.png",
        requireInteraction: true,
      });

      console.debug(`Clearing alarm ${alarm.name}`);

      await chrome.alarms.clear(alarm.name);

      console.debug(`Alarm ${alarm.name} cleared`);
    }
  }
});

// for testing
chrome.notifications.onClicked.addListener((notificationId) => {
  console.log(`Notification ${notificationId} clicked.`);
  // open a new tab with url notificationId
  chrome.tabs.create({
    url: `https://github.com/SpookSoftware/sandbox/actions/runs/${notificationId}`,
  });
});