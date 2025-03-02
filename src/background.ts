import browser from "webextension-polyfill";
import ExtPay from "extpay";
import {
  onAlarmCallback,
  onMessageCallback,
  onNotificationClickedCallback,
  sendStructuredMessage,
  validateGitHubToken,
  setExtensionEnabled,
  MAX_ALARMS,
  getActiveAlarmCount,
  isExtensionEnabled,
} from "@/helpers/browser";

let extpay = ExtPay("cicd-workflow-notifications");
extpay.startBackground();

// Constants
const TOKEN_NOTIFICATION_ID = "github-token-required";

// Flag to track if we've already shown the welcome notification
let hasShownWelcomeNotification = false;

// On extension activation
self.addEventListener("activate", async (_event: Event) => {
  console.log("Extension activated");

  // Clear all old alarms for a clean start
  await browser.alarms.clearAll();
  console.log("Cleared all old alarms.");

  // Check the extension's validation state and enable/disable accordingly
  await checkAndUpdateExtensionState();

  // Schedule a welcome notification check
  setTimeout(checkFirstRunAndShowWelcome, 2000);
});

/**
 * Check token validity and alarm count, update extension state if needed
 */
async function checkAndUpdateExtensionState() {
  // Check token validity
  const tokenStatus = await validateGitHubToken();

  // Check alarm count
  const alarmCount = await getActiveAlarmCount();

  // If token is invalid or we're at alarm limit, disable the extension
  if (!tokenStatus.isValid || alarmCount >= MAX_ALARMS) {
    console.debug(
      `Automatically disabling extension due to: ${
        !tokenStatus.isValid ? "Invalid token" : "Alarm limit reached"
      }`
    );
    await setExtensionEnabled(false);
    return false;
  }

  // Otherwise ensure it's enabled
  await setExtensionEnabled(true);
  return true;
}

// Modified message handler
browser.runtime.onMessage.addListener(async (request, sender) => {
  console.debug("Background script received message:", request);

  // Special case for extension management
  if (request && typeof request === "object" && "action" in request) {
    // Handle direct background script actions
    if (request.action === "openOptionsPage") {
      browser.runtime.openOptionsPage();
      return { status: "ok" };
    }

    if (request.action === "checkAndUpdateExtensionState") {
      const result = await checkAndUpdateExtensionState();
      return { status: "ok", data: { enabled: result } };
    }

    // Handle extension state management
    if (
      request.action === "setExtensionEnabled" &&
      request.enabled !== undefined
    ) {
      console.debug(
        `Background received request to set extension state to: ${request.enabled}`
      );
      await setExtensionEnabled(request.enabled);
      return { status: "ok" };
    }

    if (request.action === "getExtensionEnabled") {
      const enabled = await isExtensionEnabled();
      console.debug(`Background returning extension state: ${enabled}`);
      return { status: "ok", data: { enabled } };
    }
  }

  // Use our enhanced onMessageCallback for other message types
  return onMessageCallback(request, sender);
});

// Alarm handler
browser.alarms.onAlarm.addListener(onAlarmCallback);

// Notification click handler
browser.notifications.onClicked.addListener((notificationId) => {
  // Handle special notification IDs
  if (notificationId === TOKEN_NOTIFICATION_ID) {
    // Open extension popup to configure token
    browser.runtime.openOptionsPage();
    return;
  }

  if (notificationId === "welcome-notification") {
    // Open extension popup on welcome notification click
    browser.runtime.openOptionsPage();
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

// Function to check if this is first run and show welcome
async function checkFirstRunAndShowWelcome() {
  // Avoid showing multiple welcome notifications
  if (hasShownWelcomeNotification) return;

  try {
    const data = await browser.storage.local.get("hasSeenOnboarding");

    // If this is first run, show welcome notification
    if (!data.hasSeenOnboarding) {
      browser.notifications.create("welcome-notification", {
        type: "basic",
        title: "CI/CD Workflow Notifications",
        message:
          "Thanks for installing! Please configure your GitHub token to start monitoring workflows.",
        iconUrl: "images/icon-128.png",
      });

      hasShownWelcomeNotification = true;
    }
  } catch (error) {
    console.error("Error checking first run status:", error);
  }
}

// Listen for installation events
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Set first run flag
    browser.storage.local.set({ hasSeenOnboarding: false });

    browser.tabs.create({ url: browser.runtime.getURL("onboarding.html") });
  }
});

async function sendInvalidateSignal() {
  try {
    const githubTabs = await browser.tabs.query({
      url: "https://github.com/*",
    });

    console.log(`Found ${githubTabs.length} GitHub tabs to refresh`);

    for (const tab of githubTabs) {
      if (tab.id) {
        try {
          await browser.tabs.sendMessage(tab.id, { action: "invalidate" });
          console.log(`Refresh message sent to tab ${tab.id}`);
        } catch (error) {
          console.error(`Error sending message to tab ${tab.id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Error querying tabs:", error);
  }
}

// POC
setTimeout(async () => {
  try {
    const githubTabs = await browser.tabs.query({
      url: "https://github.com/*",
    });

    console.log(`Found ${githubTabs.length} GitHub tabs to refresh`);

    // Send messages to each tab with error handling
    for (const tab of githubTabs) {
      if (tab.id) {
        try {
          await browser.tabs.sendMessage(tab.id, { action: "invalidate" });
          console.log(`Refresh message sent to tab ${tab.id}`);
        } catch (error) {
          console.error(`Error sending message to tab ${tab.id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Error querying tabs:", error);
  }
}, 1500);
