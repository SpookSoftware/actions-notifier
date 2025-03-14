/**
 * Service for handling extension-specific operations
 */
import browser from "webextension-polyfill";

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
