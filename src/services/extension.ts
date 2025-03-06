/**
 * Service for handling extension-specific operations
 */
import browser from 'webextension-polyfill';

/**
 * Gets the extension enabled state
 * @returns Promise resolving to a boolean indicating if the extension is enabled
 */
export async function getExtensionEnabledState(): Promise<boolean> {
  try {
    const response = await browser.runtime.sendMessage({
      action: "getExtensionEnabled",
    });

    if (response.status === "ok" && response.data) {
      return response.data.enabled;
    }
    return true; // Default to enabled if there's an issue
  } catch (error) {
    console.error("Error loading extension state:", error);
    return true; // Default to enabled
  }
}

/**
 * Sets the extension enabled state
 * @param enabled Boolean indicating if the extension should be enabled
 * @returns Promise that resolves when the state is set
 */
export async function setExtensionEnabledState(enabled: boolean): Promise<void> {
  try {
    console.debug(`Sending request to set extension state to: ${enabled}`);

    const response = await browser.runtime.sendMessage({
      action: "setExtensionEnabled",
      enabled: enabled,
    });

    console.debug("Response from setting extension state:", response);

    // If we're enabling, trigger a check for any issues
    if (enabled) {
      await browser.runtime.sendMessage({
        action: "checkAndUpdateExtensionState",
      });
    }
  } catch (error) {
    console.error("Error setting extension state:", error);
    throw error;
  }
}

/**
 * Gets the count of active alarms (monitors)
 * @returns Promise resolving to the count of active alarms
 */
export async function getAlarmCount(): Promise<number> {
  try {
    // Get all active alarms
    const alarms = await browser.alarms.getAll();
    return alarms.length;
  } catch (error) {
    console.error("Error getting alarm count:", error);
    return 0;
  }
}

/**
 * Sends a test notification to a GitHub tab
 * @param notificationType The type of notification to show
 * @returns Promise resolving when the notification is sent
 */
export async function sendTestNotification(notificationType: 'token-expired' | 'alarm-limit-reached'): Promise<void> {
  // Find any open GitHub tabs
  const githubTabs = await browser.tabs.query({
    url: "https://github.com/*",
  });

  if (githubTabs.length > 0) {
    // Send notification message to the first GitHub tab
    const tab = githubTabs[0];
    await browser.tabs.sendMessage(tab.id!, {
      action: "showNotification",
      type: notificationType,
    });

    // Focus the tab to see the notification
    await browser.tabs.update(tab.id!, { active: true });
  } else {
    // If no GitHub tab is open, open one and then show notification
    const newTab = await browser.tabs.create({
      url: "https://github.com",
    });

    // Wait a bit for the page and content script to load
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          await browser.tabs.sendMessage(newTab.id!, {
            action: "showNotification",
            type: notificationType,
          });
          resolve();
        } catch (error) {
          reject(error);
        }
      }, 2000);
    });
  }
}