/**
 * Service for handling payment-related operations
 */
import browser from 'webextension-polyfill';
import ExtPay from 'extpay';

// Initialize ExtPay
const extpay = ExtPay("cicd-workflow-notifications");

export interface PaymentStatus {
  paid: boolean;
  trialStarted: boolean;
  trialExpired: boolean;
  trialEndDate?: number;
}

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
        trialStarted: user.trialStarted,
        trialExpired: user.trialExpired,
        trialEndDate: user.trialEndDate
      };
    } catch (error) {
      console.error("Error getting ExtPay user:", error);
      
      // Fall back to background script
      const response = await browser.runtime.sendMessage({
        action: "getPaymentStatus",
      });

      if (response.status === "ok") {
        return response.data;
      }
      
      throw new Error("Failed to get payment status");
    }
  } catch (error) {
    console.error("Error getting payment status:", error);
    // Return a default status
    return {
      paid: false,
      trialStarted: false,
      trialExpired: false
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
    if (!user.paid && !user.trialStarted) {
      await extpay.openTrialPage("start");
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