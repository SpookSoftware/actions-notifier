import browser from "webextension-polyfill";
import ExtPay from "extpay";
import {
  onAlarmCallback,
  onMessageCallback,
  onNotificationClickedCallback,
  isExtensionEnabled,
} from "@/helpers/browser";

let extpay = ExtPay("cicd-workflow-notifications");
extpay.startBackground();

/**
 * Send issue notification to all GitHub tabs
 * @param type The notification type
 * @param metadata Optional additional metadata to send with the notification
 */
async function sendIssueNotificationToTabs(
  type: "token-expired" | "alarm-limit-reached" | "trial-expired",
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const githubTabs = await browser.tabs.query({
      url: "https://github.com/*",
    });

    console.log(
      `Sending ${type} notification to ${githubTabs.length} GitHub tabs`
    );

    for (const tab of githubTabs) {
      if (tab.id) {
        try {
          await browser.tabs.sendMessage(tab.id, {
            action: "showNotification",
            type: type,
            metadata: metadata,
          });
          console.log(`Notification sent to tab ${tab.id}`);
        } catch (error) {
          console.error(`Error sending notification to tab ${tab.id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Error sending notifications to tabs:", error);
  }
}

// On extension activation
self.addEventListener("activate", async (_event: Event) => {
  console.log("Extension activated");

  // Clear all old alarms for a clean start
  await browser.alarms.clearAll();
  console.log("Cleared all old alarms.");

  // We're going to poll for extension enabled status every so often to account for tokens and trials that expire.
  browser.alarms.create("pollExtensionValidity", { periodInMinutes: 10 });
});

// Modified message handler
browser.runtime.onMessage.addListener(async (request, sender) => {
  let extpay = ExtPay("cicd-workflow-notifications");
  console.debug("Background script received message:", request);

  // Special case for extension management
  if (request && typeof request === "object" && "action" in request) {
    // Handle direct background script actions
    if (request.action === "openOptionsPage") {
      browser.runtime.openOptionsPage();
      return { status: "ok" };
    }

    if (request.action === "openManagePage") {
      browser.tabs.create({ url: browser.runtime.getURL("manage.html") });
      return { status: "ok" };
    }

    if (request.action === "openPaymentPage") {
      try {
        await extpay.openPaymentPage();
        return { status: "ok" };
      } catch (error) {
        console.error("Error opening payment page:", error);
        return { status: "error", message: "Failed to open payment page" };
      }
    }

    // Probably can remove this
    if (request.action === "getExtensionEnabled") {
      const enabled = await isExtensionEnabled();
      console.debug(`Background returning extension state: ${enabled}`);
      return { status: "ok", data: { enabled } };
    }
  }

  // Use our enhanced onMessageCallback for other message types
  return onMessageCallback(request, sender);
});

browser.alarms.onAlarm.addListener(onAlarmCallback);

browser.notifications.onClicked.addListener(onNotificationClickedCallback);

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    browser.tabs.create({ url: browser.runtime.getURL("onboarding.html") });
  }
});
