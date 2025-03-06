/**
 * Service for handling payment-related operations
 */
import browser from "webextension-polyfill";
import ExtPay from "extpay";
import { trialIsValid } from "./trial";
import { isPaymentStatusResponse } from "@/helpers/pure";
import { PaymentStatus } from "@/types";

// Initialize ExtPay
const extpay = ExtPay("cicd-workflow-notifications");

/**
 * Gets the current payment status
 * @returns Promise resolving to the payment status
 */
export async function getPaymentStatus(): Promise<PaymentStatus> {
  try {
    // Try using ExtPay directly
    try {
      const user = await extpay.getUser();
      return {
        paid: user.paid,
        trialStartedAt: user?.trialStartedAt,
        trialIsValid: trialIsValid(user.trialStartedAt),
      };
    } catch (error) {
      console.error("Error getting ExtPay user:", error);

      // Fall back to background script
      const response = await browser.runtime.sendMessage({
        action: "getPaymentStatus",
      });

      if (isPaymentStatusResponse(response)) {
        return response.data;
      }

      throw new Error("Failed to get payment status");
    }
  } catch (error) {
    console.error("Error getting payment status:", error);
    // Return a default status
    return {
      paid: false,
      trialStartedAt: null,
      trialIsValid: false,
    };
  }
}

/**
 * Opens the payment page or trial page
 * @returns Promise that resolves when the page is opened
 */
export async function openPaymentPage(): Promise<void> {
  try {
    const user = await extpay.getUser();

    // If trial hasn't started yet, start trial first
    if (!user.paid && !user.trialStartedAt) {
      await extpay.openTrialPage("start");
    }
    // If trial expired, open trial expired page
    else if (user.trialStartedAt && !trialIsValid(user.trialStartedAt)) {
      await extpay.openTrialPage("expired");
    }
    // If trial expired or user wants to purchase, open payment page
    else if (!user.paid) {
      await extpay.openPaymentPage();
    }
  } catch (error) {
    console.error("Error with payment action:", error);
    // Fallback using the background script
    await browser.runtime.sendMessage({ action: "openPaymentPage" });
  }
}

export async function openBuyPage(): Promise<void> {
  try {
    await extpay.openPaymentPage();
  } catch (error) {
    console.error("Error opening buy page:", error);
    // Fallback using the background script
    await browser.runtime.sendMessage({ action: "openPaymentPage" });
  }
}
