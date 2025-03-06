/**
 * Service for handling browser storage operations
 */
import browser from 'webextension-polyfill';

/**
 * Loads the GitHub token from browser storage
 * @returns Promise resolving to the token or null if not found
 */
export async function loadGitHubToken(): Promise<string | null> {
  try {
    const data = await browser.storage.sync.get("githubToken");
    return data.githubToken || null;
  } catch (error) {
    console.error("Error loading GitHub token:", error);
    return null;
  }
}

/**
 * Saves a GitHub token to browser storage
 * @param token Token to save
 * @returns Promise that resolves when the token is saved
 */
export async function saveGitHubToken(token: string): Promise<void> {
  try {
    await browser.storage.sync.set({ githubToken: token });
  } catch (error) {
    console.error("Error saving GitHub token:", error);
    throw error;
  }
}

/**
 * Checks if this is the first run of the extension
 * @returns Promise resolving to a boolean indicating if it's the first run
 */
export async function checkFirstRun(): Promise<boolean> {
  try {
    const data = await browser.storage.local.get("hasSeenOnboarding");
    return !data.hasSeenOnboarding;
  } catch (error) {
    console.error("Error checking first run:", error);
    return false;
  }
}

/**
 * Marks the onboarding as seen
 * @returns Promise that resolves when the setting is saved
 */
export async function markOnboardingSeen(): Promise<void> {
  try {
    await browser.storage.local.set({ hasSeenOnboarding: true });
  } catch (error) {
    console.error("Error marking onboarding as seen:", error);
    throw error;
  }
}