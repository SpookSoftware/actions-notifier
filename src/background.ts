import browser from "webextension-polyfill";
import ExtPay from "extpay";
import {
  onAlarmCallback,
  onMessageCallback,
  onNotificationClickedCallback,
} from "@/helpers/browser";

let extpay = ExtPay("cicd-workflow-notifications");
extpay.startBackground();

// Constants
const TOKEN_NOTIFICATION_ID = "github-token-required";
const MAX_ALARMS = 500; // Chrome's limit

// On extension activation
self.addEventListener("activate", async (_event: Event) => {
  console.log("Extension activated");

  // Clear all old alarms for a clean start
  await browser.alarms.clearAll();
  console.log("Cleared all old alarms.");
});

// Modified message handler
browser.runtime.onMessage.addListener(async (request, sender) => {
  // Special action handlers
  if (request.action === "openOptionsPage") {
    browser.runtime.openOptionsPage();
    return;
  }

  if (request.action === "openOnboarding") {
    browser.tabs.create({ url: browser.runtime.getURL("onboarding.html") });
    return;
  }

  // Check if this is a monitoring request that requires a token
  if (
    request &&
    (request.task === "start-monitoring" || request.task === "stop-monitoring")
  ) {
    // Verify token exists before proceeding
    const tokenData = await browser.storage.sync.get("githubToken");

    if (!tokenData.githubToken) {
      console.warn(
        "Monitoring request received but no GitHub token is configured"
      );

      // Show the onboarding page instead of a notification
      browser.tabs.create({ url: browser.runtime.getURL("onboarding.html") });

      return {
        status: "error",
        error: { message: "GitHub token not configured" },
      };
    }

    // If we have too many alarms, reject the request
    if (request.task === "start-monitoring") {
      const alarms = await browser.alarms.getAll();
      if (alarms.length >= MAX_ALARMS) {
        console.warn(`Alarm limit reached (${alarms.length}/${MAX_ALARMS})`);

        // Show a notification about the alarm limit
        browser.tabs.create({ url: browser.runtime.getURL("manage.html") });

        return { status: "error", error: { message: "Alarm limit reached" } };
      }
    }

    // Pass to original handler if all checks pass
    return onMessageCallback(request, sender);
  }

  // Handle other message types
  return onMessageCallback(request, sender);
});

// Alarm handler
browser.alarms.onAlarm.addListener(onAlarmCallback);

// Notification click handler
browser.notifications.onClicked.addListener((notificationId) => {
  // Handle special notification IDs
  if (notificationId === TOKEN_NOTIFICATION_ID) {
    // Open onboarding page instead of options
    browser.tabs.create({ url: browser.runtime.getURL("onboarding.html") });
    return;
  }

  if (notificationId === "alarm-limit-reached") {
    // Open management page when alarm limit notification is clicked
    browser.tabs.create({ url: browser.runtime.getURL("manage.html") });
    return;
  }

  // Handle regular workflow notifications
  onNotificationClickedCallback(notificationId);
});

// Listen for installation events
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Set first run flag
    browser.storage.local.set({ hasCompletedOnboarding: false });

    // Open onboarding page on install
    browser.tabs.create({ url: browser.runtime.getURL("onboarding.html") });
  } else if (details.reason === "update") {
    // When updating, check if user has ever completed onboarding
    browser.storage.local.get(["hasCompletedOnboarding"], (data) => {
      // If no record of completed onboarding, show it
      if (!data.hasCompletedOnboarding) {
        browser.tabs.create({ url: browser.runtime.getURL("onboarding.html") });
      }
    });
  }
});

// Add context menu item for debugging/testing (development only)
if (process.env.NODE_ENV === "development") {
  browser.contextMenus.create({
    id: "open-onboarding",
    title: "Open Onboarding (Dev)",
    contexts: ["browser_action"],
  });

  browser.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === "open-onboarding") {
      browser.tabs.create({ url: browser.runtime.getURL("onboarding.html") });
    }
  });
}
