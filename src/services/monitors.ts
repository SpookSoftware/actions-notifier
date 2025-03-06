/**
 * Service for handling monitors (tracked workflows)
 */
import browser from 'webextension-polyfill';
import { decode, createURL } from "../helpers/pure";
import { Monitor } from '../types';

/**
 * Loads monitors from browser alarms and storage
 * @returns Promise resolving to an array of Monitor objects
 */
export async function loadMonitors(): Promise<Monitor[]> {
  try {
    // Get all alarms (active monitors)
    const alarms = await browser.alarms.getAll();

    // Get details for each encoded alarm name from storage
    const monitorDetails: Monitor[] = [];

    for (const alarm of alarms) {
      try {
        // Get alarm details
        const encodedId = alarm.name;
        const decodedData = decode(encodedId);

        // Get time when monitor was created
        const storageData = await browser.storage.local.get(encodedId);
        const createdTime =
          storageData[encodedId] === true
            ? new Date().toLocaleString() // fallback if no timestamp stored
            : new Date(storageData[encodedId]).toLocaleString();

        monitorDetails.push({
          id: encodedId,
          owner: decodedData.owner,
          repository: decodedData.repository,
          runId: decodedData.runId,
          jobId: decodedData.jobId,
          type: decodedData.jobId ? "Job" : "Workflow",
          createdAt: createdTime,
          url: createURL(decodedData),
        });
      } catch (error) {
        console.error(`Error processing alarm ${alarm.name}:`, error);
        // Skip this alarm if it's not properly formatted
        continue;
      }
    }

    // Sort by creation time (newest first)
    return monitorDetails.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } catch (error) {
    console.error("Error loading monitors:", error);
    throw error;
  }
}

/**
 * Removes a specific monitor
 * @param id The ID of the monitor to remove
 * @returns Promise resolving to boolean indicating success
 */
export async function removeMonitor(id: string): Promise<boolean> {
  try {
    // Clear alarm
    await browser.alarms.clear(id);

    // Remove from storage
    await browser.storage.local.remove(id);

    return true;
  } catch (error) {
    console.error(`Error removing monitor ${id}:`, error);
    return false;
  }
}

/**
 * Clears all monitors
 * @returns Promise resolving to boolean indicating success
 */
export async function clearAllMonitors(): Promise<boolean> {
  if (
    window.confirm(
      "Are you sure you want to remove all workflow monitors? This action cannot be undone."
    )
  ) {
    try {
      // Get current monitors
      const monitors = await loadMonitors();
      
      // Clear all alarms
      await browser.alarms.clearAll();

      // Get all keys from storage that are monitor IDs
      const monitorKeys = monitors.map((monitor) => monitor.id);

      // Remove all monitor keys from storage
      if (monitorKeys.length > 0) {
        await browser.storage.local.remove(monitorKeys);
      }

      return true;
    } catch (error) {
      console.error("Error clearing all monitors:", error);
      return false;
    }
  }
  return false;
}

/**
 * Format time for display
 * @param timeString The time string to format
 * @returns Formatted time string
 */
export function formatTime(timeString: string): string {
  try {
    const date = new Date(timeString);

    // If it's today, show only time
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }

    // If it's yesterday, show "Yesterday"
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }

    // Otherwise show date
    return (
      date.toLocaleDateString() +
      ", " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  } catch (error) {
    // Fallback if date parsing fails
    return timeString;
  }
}