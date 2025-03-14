/**
 * Service for handling trial-related operations
 */
import browser from "webextension-polyfill";
import ExtPay from "extpay";

// Initialize ExtPay
const extpay = ExtPay("cicd-workflow-notifications");

/**
 * Checks if trial is valid (still active)
 * @param trialStart Date when trial started
 * @returns Boolean indicating if trial is still active
 */
export function trialIsValid(trialStart: Date | null | false): boolean {
  if (!trialStart) {
    return false;
  }
  const trialStartedLessThanSevenDaysAgo =
    Date.now() - trialStart.getTime() <= 7 * 24 * 60 * 60 * 1000;
  return trialStartedLessThanSevenDaysAgo;
}

export const sevenDaysAfter = (date: Date): Date => {
  return new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
};

/**
 * Mark onboarding as completed
 * @returns Promise that resolves when onboarding is marked as completed
 */
export async function finishOnboarding(): Promise<void> {
  try {
    // Mark onboarding as seen in storage
    const { markOnboardingSeen } = await import("./storage");
    await markOnboardingSeen();

    // Ensure extension is enabled
    const { setExtensionEnabled } = await import("../helpers/browser");
    await setExtensionEnabled(true);

    // Navigate to GitHub
    window.location.href = "https://github.com";
  } catch (error) {
    console.error("Error finishing onboarding:", error);
    throw error;
  }
}
