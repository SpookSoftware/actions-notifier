import { createOnAlarmCallback, encodeRequest } from "./helpers";

import type { MonitorRequest } from "../types";

self.addEventListener("activate", (_event) => {
  console.log("I'm active! Whee!");

  chrome.alarms.clearAll(() => {
    console.log("Cleared all old alarms.");
  });
});

function createAlarmForId(id: string, lengthInMinutes: number) {
  return chrome.alarms.create(id, {
    periodInMinutes: lengthInMinutes,
  });
}

function createOnMessageCallback({
  alarmCreatorFn,
}: {
  alarmCreatorFn: (id: string, lengthInMinutes: number) => Promise<void>;
}) {
  return (
    request: MonitorRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    const encoded = encodeRequest(request);

    console.debug(`Received request to monitor ${encoded}`);

    alarmCreatorFn(encoded, 0.1)
      .then((_res) => {
        console.debug(`Alarm ${encoded} created`);
        sendResponse({ status: "ok" });
      })
      .catch((err) => {
        sendResponse({ status: "error", error: err });
      });
    // This signals to chrome that the connection will remain open until sendResponse is called.
    return true;
  };
}

const onMessageCallback = createOnMessageCallback({
  alarmCreatorFn: createAlarmForId,
});

// ASYNC AWAIT NOT SUPPORTED
chrome.runtime.onMessage.addListener(onMessageCallback);

const onAlarmCallback = createOnAlarmCallback(
  async (alarm: chrome.alarms.Alarm, taskName: string) => {
    chrome.notifications.create(alarm.name, {
      type: "basic",
      title: "Job completed",
      message: `Item ${taskName} has completed. Click the notification to view the results.`,
      iconUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAGlJREFUWEftl9EKABAMRfnZfdR+lvcpa01GHa+S03G56a149OL92wIgImMHpapb6Oh6ADCAgf8NRO+9fWPSBgC4bsArL68r0hkAoNyAPePrIQTgOQM2lNFMpLsAAAxg4LgBr2xOz5f/jiczr9Ahlc1SawAAAABJRU5ErkJggg==",
    });
    console.debug(`Clearing alarm ${alarm.name}`);

    await chrome.alarms.clear(alarm.name);

    console.debug(`Alarm ${alarm.name} cleared`);
  }
);

chrome.alarms.onAlarm.addListener(onAlarmCallback);

// for testing
chrome.notifications.onClicked.addListener((notificationId) => {
  console.log(`Notification ${notificationId} clicked.`);
  // open a new tab with url notificationId
  chrome.tabs.create({
    url: `https://github.com/SpookSoftware/sandbox/actions/runs/${notificationId}`,
  });
});
