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

// Flag to track if we've already shown the welcome notification
let hasShownWelcomeNotification = false;

// On extension activation
self.addEventListener("activate", async (_event: Event) => {
  console.log("Extension activated");

  // Clear all old alarms for a clean start
  await browser.alarms.clearAll();
  console.log("Cleared all old alarms.");

  // Schedule a welcome notification check
  setTimeout(checkFirstRunAndShowWelcome, 2000);
});

// Modified message handler
browser.runtime.onMessage.addListener(async (request, sender) => {
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

      // Show a notification to inform the user
      browser.notifications.create(TOKEN_NOTIFICATION_ID, {
        type: "basic",
        title: "GitHub Token Required",
        message: "Please add a GitHub token to enable workflow monitoring.",
        iconUrl: "images/icon-128.png",
      });

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
        browser.notifications.create("alarm-limit-reached", {
          type: "basic",
          title: "Alarm Limit Reached",
          message:
            "You've reached the maximum number of workflows that can be monitored (500). Please remove some existing monitors.",
          iconUrl: "images/icon-128.png",
        });

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

    // Open options page on install to guide token setup
    browser.runtime.openOptionsPage();
  }
});
