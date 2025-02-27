import browser from "webextension-polyfill";
import ExtPay from "extpay";
import {
  onAlarmCallback,
  onMessageCallback,
  onNotificationClickedCallback,
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

browser.notifications.onClicked.addListener(onNotificationClickedCallback);
