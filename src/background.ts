import browser from "webextension-polyfill";
import {
  createOnMessageCallback,
  decode,
  isProperlyEncoded,
  createURL,
  onAlarmCallback,
} from "./helpers";

import ExtPay from "extpay";

let extpay = ExtPay("cicd-workflow-notifications");
extpay.startBackground();

self.addEventListener("activate", async (_event: Event) => {
  console.log("I'm active! Whee!");

  await browser.alarms.clearAll();
  console.log("Cleared all old alarms.");
});

async function createAlarmForId(
  id: string,
  lengthInMinutes: number
): Promise<void> {
  browser.alarms.create(id, {
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
