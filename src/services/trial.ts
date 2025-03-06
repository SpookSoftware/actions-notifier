/**
 * Service for handling trial-related operations
 */
import browser from 'webextension-polyfill';
import ExtPay from 'extpay';

// Initialize ExtPay
const extpay = ExtPay("cicd-workflow-notifications");

/**
 * Checks if trial is valid (still active)
 * @param trialStart Date when trial started
 * @returns Boolean indicating if trial is still active
 */
export function trialIsValid(trialStart: Date | null): boolean {
  if (!trialStart) {
    return false;
  }
  const trialStartedLessThanSevenDaysAgo =
    Date.now() - trialStart.getTime() <= 7 * 24 * 60 * 60 * 1000;
  return trialStartedLessThanSevenDaysAgo;
}

/**
 * Starts trial status polling
 * @param onTrialActivated Callback function called when trial is activated
 * @param onTrialPending Callback function called while trial is pending
 * @param onError Callback function called on error
 */
export function startTrialStatusPolling(
  onTrialActivated: () => void,
  onTrialPending: (attempt: number, maxAttempts: number) => void,
  onError: () => void
): void {
  // Initial delay before first check (3 seconds)
  setTimeout(async () => {
    let attempts = 0;
    const maxAttempts = 100; // Stop after ~5 minutes (100 * 3 seconds)

    const checkTrialStatus = async () => {
      try {
        const user = await extpay.getUser();

        if (trialIsValid(user.trialStartedAt)) {
          // Trial activated successfully
          onTrialActivated();
          return true; // Stop polling
        }

        // Continue checking if max attempts not reached
        attempts++;
        onTrialPending(attempts, maxAttempts);
        
        if (attempts >= maxAttempts) {
          // Max attempts reached
          onError();
          return true; // Stop polling
        }

        return false; // Continue polling
      } catch (error) {
        console.error("Error checking trial status:", error);
        onError();
        return true; // Stop polling on error
      }
    };

    // Start the polling process
    const poll = async () => {
      const shouldStop = await checkTrialStatus();
      if (!shouldStop) {
        setTimeout(poll, 3000); // Check every 3 seconds
      }
    };

    poll();
  }, 3000);
}

/**
 * Starts the free trial
 * @returns Promise that resolves when trial page is opened
 */
export async function startFreeTrial(): Promise<void> {
  try {
    // Get user status
    const user = await extpay.getUser();

    // If trial already started, return
    if (trialIsValid(user.trialStartedAt)) {
      return;
    }

    // Start the trial using ExtPay
    try {
      await extpay.openTrialPage("start");
    } catch (error) {
      console.error("Error starting trial:", error);
      // Fallback using the background script
      await browser.runtime.sendMessage({ action: "openPaymentPage" });
    }
  } catch (error) {
    console.error("Error with trial activation:", error);
    throw error;
  }
}

/**
 * Mark onboarding as completed
 * @returns Promise that resolves when onboarding is marked as completed
 */
export async function finishOnboarding(): Promise<void> {
  try {
    // Mark onboarding as completed
    await browser.storage.local.set({ hasCompletedOnboarding: true });
    
    // Navigate to GitHub
    window.location.href = "https://github.com";
  } catch (error) {
    console.error("Error finishing onboarding:", error);
    throw error;
  }
}