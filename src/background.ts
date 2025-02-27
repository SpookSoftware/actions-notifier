import browser from "webextension-polyfill";
import ExtPay from "extpay";
import {
  decode,
  isProperlyEncoded,
  createURL,
  onAlarmCallback,
  onMessageCallback,
} from "./helpers";

let extpay = ExtPay("cicd-workflow-notifications");
extpay.startBackground();

self.addEventListener("activate", async (_event: Event) => {
  console.log("I'm active! Whee!");

  await browser.alarms.clearAll();
  console.log("Cleared all old alarms.");
});

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
