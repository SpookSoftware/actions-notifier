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
import { trialIsValid } from "./services/trial";

let extpay = ExtPay("cicd-workflow-notifications");
extpay.startBackground();

async function getPaymentStatus() {
  try {
    const user = await extpay.getUser();
    return {
      status: "ok",
      data: {
        paid: user.paid,
        trialStartedAt: user.trialStartedAt,
        trialIsValid: trialIsValid(user.trialStartedAt),
      },
    };
  } catch (error) {
    console.error("Error getting payment status:", error);
    return { status: "error", message: "Failed to get payment status" };
  }
}

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

    for (const tab of githubTabs) {
      const paidStatus = await getPaymentStatus();
      if (tab.id) {
        try {
          await browser.tabs.sendMessage(tab.id, {
            action: "paymentStatusChanged",
            data: paidStatus.data,
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

  // We're going to poll for extension enabled status every so often to account for tokens that expire.
  browser.alarms.create("pollExtensionValidity", { periodInMinutes: 10 });
  // Check the extension's validation state and enable/disable accordingly
  await checkAndUpdateExtensionState();
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
  const userPaid = user.paid;
  const userHasActiveTrial = trialIsValid(user.trialStartedAt);
  const userIsEligible = userPaid || userHasActiveTrial;

  // If token is invalid, alarm limit reached, or no valid payment, disable extension
  if (!tokenStatus.isValid || alarmCount >= MAX_ALARMS || !userIsEligible) {
    // Make sure state is set to disabled in storage
    await setExtensionEnabled(false);

    console.debug(
      `Automatically disabling extension due to: ${
        !tokenStatus.isValid
          ? "Invalid token"
          : alarmCount >= MAX_ALARMS
          ? "Alarm limit reached"
          : "Payment required"
      }`
    );

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
      // Use the same notification type whether the trial expired or was never started
      notificationType = "trial-expired";
    }

    // Check if the notification is about the trial
    if (notificationType === "trial-expired") {
      // Determine whether the trial was never started or actually expired
      const hasTrialStarted =
        user.trialStartedAt !== null && user.trialStartedAt !== undefined;

      // Send notification message to all GitHub tabs with additional context
      await sendIssueNotificationToTabs(notificationType, {
        hasTrialStarted: hasTrialStarted,
      });
    } else {
      // Send other notification types without additional context
      await sendIssueNotificationToTabs(notificationType);
    }

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
      return await getPaymentStatus();
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
browser.notifications.onClicked.addListener(onNotificationClickedCallback);

// Listen for installation events
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    browser.tabs.create({ url: browser.runtime.getURL("onboarding.html") });
  }
});
