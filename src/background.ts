import browser from "webextension-polyfill";
import {
  onAlarmCallback,
  onMessageCallback,
  onNotificationClickedCallback,
} from "@/helpers/browser";
import { UNINSTALL_FEEDBACK_URL } from "@constants";

// On extension activation
self.addEventListener("activate", async (_event: Event) => {
  console.log("Extension activated");

  // Clear all old alarms for a clean start
  await browser.alarms.clearAll();
  console.log("Cleared all old alarms.");
});

browser.runtime.onMessage.addListener(onMessageCallback);

browser.alarms.onAlarm.addListener(onAlarmCallback);

browser.notifications.onClicked.addListener(onNotificationClickedCallback);

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    browser.tabs.create({ url: browser.runtime.getURL("onboarding.html") });
  }
});

browser.runtime.setUninstallURL(UNINSTALL_FEEDBACK_URL);
