/**
 * Service for handling trial-related operations
 */
import { setExtensionEnabled } from "../helpers/browser";

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
