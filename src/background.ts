import browser from "webextension-polyfill";
import {
  createOnAlarmCallback,
  createOnMessageCallback,
  decode,
  isProperlyEncoded,
  createURL,
} from "./helpers";

import ExtPay from "extpay";

let extpay = ExtPay("cicd-workflow-notifications");
extpay.startBackground();

self.addEventListener("activate", async (_event) => {
  console.log("I'm active! Whee!");

  await browser.alarms.clearAll();
  console.log("Cleared all old alarms.");
});

async function createAlarmForId(
  id: string,
  lengthInMinutes: number
): Promise<void> {
  await browser.alarms.create(id, {
    periodInMinutes: lengthInMinutes,
  });
}

async function cancelAlarmForId(id: string): Promise<boolean> {
  return await browser.alarms.clear(id);
}

async function storeMonitoringStatus(id: string): Promise<void> {
  await browser.storage.local.set({ [id]: true });
}

async function performAllStartMonitoringTasks(
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

async function performAllStopMonitoringTasks(
  id: string
): Promise<[boolean, void]> {
  return await Promise.all([cancelAlarmForId(id), removeMonitoringStatus(id)]);
}

const onMessageCallback = createOnMessageCallback(
  performAllStartMonitoringTasks,
  performAllStopMonitoringTasks
);

browser.runtime.onMessage.addListener(onMessageCallback);

const onAlarmCallback = createOnAlarmCallback(
  async (alarm: browser.Alarms.Alarm, taskName: string) => {
    await browser.notifications.create(alarm.name, {
      type: "basic",
      title: "Action/job completed",
      message: `Item ${taskName} has completed. Click the notification to view the results.`,
      iconUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAGlJREFUWEftl9EKABAMRfnZfdR+lvcpa01GHa+S03G56a149OL92wIgImMHpapb6Oh6ADCAgf8NRO+9fWPSBgC4bsArL68r0hkAoNyAPePrIQTgOQM2lNFMpLsAAAxg4LgBr2xOz5f/jiczr9Ahlc1SawAAAABJRU5ErkJggg==",
    });
    console.debug(`Successfully created notification with id ${alarm.name}`);
    console.debug(`Clearing alarm ${alarm.name}`);

    await browser.alarms.clear(alarm.name);
    console.debug(`Alarm ${alarm.name} cleared`);

    await browser.storage.local.remove(alarm.name);
    console.debug(`Monitoring status for ${alarm.name} cleared from storage`);
  }
);

browser.alarms.onAlarm.addListener(onAlarmCallback);

browser.notifications.onClicked.addListener(async (notificationId) => {
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
});
