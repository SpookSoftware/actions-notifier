import { createOnAlarmCallback, createOnMessageCallback } from "./helpers";

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

function storeMonitoringStatus(id: string) {
  return chrome.storage.local.set({ [id]: true });
}

const onMessageCallback = createOnMessageCallback((id, lengthInMinutes) => {
  return Promise.all([
    createAlarmForId(id, lengthInMinutes),
    storeMonitoringStatus(id),
  ]);
});

chrome.runtime.onMessage.addListener(onMessageCallback);

const onAlarmCallback = createOnAlarmCallback(
  async (alarm: chrome.alarms.Alarm, taskName: string) => {
    chrome.notifications.create(alarm.name, {
      type: "basic",
      title: "Action/job completed",
      message: `Item ${taskName} has completed. Click the notification to view the results.`,
      iconUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAGlJREFUWEftl9EKABAMRfnZfdR+lvcpa01GHa+S03G56a149OL92wIgImMHpapb6Oh6ADCAgf8NRO+9fWPSBgC4bsArL68r0hkAoNyAPePrIQTgOQM2lNFMpLsAAAxg4LgBr2xOz5f/jiczr9Ahlc1SawAAAABJRU5ErkJggg==",
    }, (id) => {
      console.debug(`Successfully created notification with id ${id}`)
    });
    console.debug(`Clearing alarm ${alarm.name}`);

    await chrome.alarms.clear(alarm.name);
    console.debug(`Alarm ${alarm.name} cleared`);

    await chrome.storage.local.remove(alarm.name);
    console.debug(`Monitoring status for ${alarm.name} cleared from storage`);
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
