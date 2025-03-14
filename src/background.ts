import browser from "webextension-polyfill";
import ExtPay from "extpay";
import {
  onAlarmCallback,
  onMessageCallback,
  onNotificationClickedCallback,
} from "@/helpers/browser";

let extpay = ExtPay("cicd-workflow-notifications");
extpay.startBackground();

// On extension activation
self.addEventListener("activate", async (_event: Event) => {
  console.log("Extension activated");

  // Clear all old alarms for a clean start
  await browser.alarms.clearAll();
  console.log("Cleared all old alarms.");

  // We're going to poll for extension enabled status every so often to account for tokens and trials that expire.
  browser.alarms.create("pollExtensionValidity", { periodInMinutes: 10 });
});

browser.runtime.onMessage.addListener(onMessageCallback);

browser.alarms.onAlarm.addListener(onAlarmCallback);

browser.notifications.onClicked.addListener(onNotificationClickedCallback);

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    browser.tabs.create({ url: browser.runtime.getURL("onboarding.html") });
  }
});
