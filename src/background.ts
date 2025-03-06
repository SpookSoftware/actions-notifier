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
import { isSetExtensionEnabledRequest, trialIsValid } from "./helpers/pure";

let extpay = ExtPay("cicd-workflow-notifications");
extpay.startBackground();

// Set up payment listeners
extpay.onPaid.addListener((user) => {
  console.log("Purchase completed:", user);
  // Re-enable extension if it was disabled due to trial expiration
  checkAndUpdateExtensionState();

  // Broadcast payment status to all GitHub tabs
  sendPaymentStatusUpdateToTabs();
});

// Check payment status periodically
setInterval(() => {
  checkAndUpdateExtensionState();
}, 60 * 60 * 1000); // Check every hour

// Constants
const TOKEN_NOTIFICATION_ID = "github-token-required";

// Flag to track if we've already shown the welcome notification
let hasShownWelcomeNotification = false;

/**
 * Send issue notification to all GitHub tabs
 */
async function sendIssueNotificationToTabs(
  type: "token-expired" | "alarm-limit-reached" | "trial-expired"
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

/**
 * Send payment status update to all GitHub tabs
 */
async function sendPaymentStatusUpdateToTabs(): Promise<void> {
  try {
    const githubTabs = await browser.tabs.query({
      url: "https://github.com/*",
    });

    console.log(
      `Sending payment status update to ${githubTabs.length} GitHub tabs`
    );

    // Get current user data from ExtPay
    const user = await extpay.getUser();

    for (const tab of githubTabs) {
      if (tab.id) {
        try {
          await browser.tabs.sendMessage(tab.id, {
            action: "paymentStatusChanged",
            data: {
              paid: user.paid,
              trialActive: trialIsValid(user.trialStartedAt),
              trialStarted: user.trialStartedAt,
            },
          });
          console.log(`Payment update sent to tab ${tab.id}`);
        } catch (error) {
          console.error(
            `Error sending payment update to tab ${tab.id}:`,
            error
          );
        }
      }
    }
  } catch (error) {
    console.error("Error sending payment updates to tabs:", error);
  }
}

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
 * Check token validity, alarm count, and payment status; update extension state if needed
 */
async function checkAndUpdateExtensionState() {
  // Check token validity
  const tokenStatus = await validateGitHubToken();

  // Check alarm count
  const alarmCount = await getActiveAlarmCount();

  // Check payment status using ExtPay's built-in methods
  const user = await extpay.getUser();
  const hasValidPayment = user.paid || trialIsValid(user.trialStartedAt);

  // If token is invalid, alarm limit reached, or no valid payment, disable extension
  if (!tokenStatus.isValid || alarmCount >= MAX_ALARMS || !hasValidPayment) {
    console.debug(
      `Automatically disabling extension due to: ${
        !tokenStatus.isValid
          ? "Invalid token"
          : alarmCount >= MAX_ALARMS
          ? "Alarm limit reached"
          : "Payment required"
      }`
    );
    await setExtensionEnabled(false);

    // Determine notification type
    let notificationType:
      | "token-expired"
      | "alarm-limit-reached"
      | "trial-expired";
    if (!tokenStatus.isValid) {
      notificationType = "token-expired";
    } else if (alarmCount >= MAX_ALARMS) {
      notificationType = "alarm-limit-reached";
    } else {
      notificationType = "trial-expired";
    }

    // Send notification message to all GitHub tabs
    await sendIssueNotificationToTabs(notificationType);

    return false;
  }

  // Otherwise ensure it's enabled
  await setExtensionEnabled(true);
  return true;
}

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
        // Open ExtPay payment page
        await extpay.openPaymentPage();
        return { status: "ok" };
      } catch (error) {
        console.error("Error opening payment page:", error);
        return { status: "error", message: "Failed to open payment page" };
      }
    }

    if (request.action === "checkAndUpdateExtensionState") {
      const result = await checkAndUpdateExtensionState();
      return { status: "ok", data: { enabled: result } };
    }

    if (request.action === "getPaymentStatus") {
      try {
        const user = await extpay.getUser();
        return {
          status: "ok",
          data: {
            paid: user.paid,
            trialActive: trialIsValid(user.trialStartedAt),
            trialStarted: user.trialStartedAt,
          },
        };
      } catch (error) {
        console.error("Error getting payment status:", error);
        return { status: "error", message: "Failed to get payment status" };
      }
    }

    // Handle extension state management
    if (
      isSetExtensionEnabledRequest(request) &&
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
