/**
 * Service for handling browser storage operations
 */
import browser from "webextension-polyfill";

/**
 * Marks the onboarding as seen
 * @returns Promise that resolves when the setting is saved
 */
export async function markOnboardingSeen(): Promise<void> {
  try {
    await browser.storage.sync.set({ hasSeenOnboarding: true });
  } catch (error) {
    console.error("Error marking onboarding as seen:", error);
    throw error;
  }
}
