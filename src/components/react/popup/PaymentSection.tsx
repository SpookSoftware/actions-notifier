import { trialIsValid } from "@/services/trial";
import { PaymentStatus } from "@/types";
import React, { useEffect, useState } from "react";
import LoadingSpinner from "../shared/LoadingSpinner";

interface PaymentSectionProps {
  paymentStatus: PaymentStatus;
  onPaymentClick: () => Promise<void>;
}

function getTrialEndDate(trialStartedAt: Date | null): number {
  if (!trialStartedAt) return 0;
  const in7Days = 1000 * 60 * 60 * 24 * 7;
  return trialStartedAt.getTime() + in7Days;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({
  paymentStatus,
  onPaymentClick,
}) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set a timeout to stop loading after a reasonable time
    // This prevents the UI from being stuck in a loading state forever
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, 3000); // 3 seconds is enough time for normal loading

    // When paymentStatus changes from its initial state, we know it's loaded
    if (paymentStatus.trialStartedAt !== null || paymentStatus.paid === true) {
      setIsLoading(false);
      clearTimeout(timeoutId);
    }

    return () => clearTimeout(timeoutId); // Clean up timeout on unmount
  }, [paymentStatus]);

  const trialExpired = !trialIsValid(paymentStatus.trialStartedAt);
  const trialEndDate = getTrialEndDate(paymentStatus.trialStartedAt);
  const trialNeverStarted = !paymentStatus.trialStartedAt;

  // Calculate trial progress
  const calculateTrialProgress = () => {
    if (paymentStatus.paid) return 100;
    if (!paymentStatus.trialStartedAt) return 0;
    if (trialExpired) return 100;

    const now = Date.now();
    const daysLeft = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(100, 100 - (daysLeft / 7) * 100));
  };

  // Calculate days left in trial
  const getDaysLeft = () => {
    if (paymentStatus.paid) return 0;
    if (!paymentStatus.trialStartedAt) return 7;
    if (trialExpired) return 0;

    const now = Date.now();
    return Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));
  };

  // Get payment button text
  const getPaymentButtonText = () => {
    if (paymentStatus.paid) return "";
    if (!paymentStatus.trialStartedAt)
      return "Start Free Trial (no credit card required)";
    return "Purchase License ($2.95/lifetime)";
  };

  // Get payment status message
  const getPaymentStatusMessage = () => {
    if (paymentStatus.paid) {
      return "Thank you for your purchase! You have lifetime access to this extension.";
    }
    if (!paymentStatus.trialStartedAt) {
      return "Start your free 7-day trial to try all features.";
    }
    if (trialExpired) {
      return "Your free trial has expired. Please purchase to continue using this extension.";
    }
    return "Your 7-day free trial is active.";
  };

  const shouldShowTrialProgress = !paymentStatus.paid && !trialNeverStarted;

  if (isLoading) {
    return (
      <div className="payment-section">
        <div className="flex-row payment-header">
          <h3>License Status</h3>
          <span className="payment-badge">Loading...</span>
        </div>
        <div
          className="payment-info"
          style={{ display: "flex", justifyContent: "center", padding: "20px" }}
        >
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="payment-section">
      <div className="flex-row payment-header">
        <h3>License Status</h3>
        <span
          className={`payment-badge ${paymentStatus.paid ? "paid" : ""}`}
          style={{
            backgroundColor: trialExpired ? "#cb2431" : undefined,
          }}
        >
          {paymentStatus.paid
            ? "Purchased"
            : // Note to self: trialNeverStarted has to be in front of trialExpired or the wrong thing will display
            trialNeverStarted
            ? "No Trial Started"
            : trialExpired
            ? "Trial Expired"
            : "Free Trial"}
        </span>
      </div>
      <div className="payment-info">
        <p>{getPaymentStatusMessage()}</p>
        {shouldShowTrialProgress && (
          <div className="trial-progress-container">
            <div
              className="trial-progress-bar"
              style={{ width: `${calculateTrialProgress()}%` }}
            ></div>
            <span className="trial-days-left">
              {getDaysLeft()} day{getDaysLeft() !== 1 ? "s" : ""}{" "}
              {trialExpired ? "ago" : "remaining"}
            </span>
          </div>
        )}
        {!paymentStatus.paid && getPaymentButtonText() && (
          <button className="payment-button" onClick={onPaymentClick}>
            {getPaymentButtonText()}
          </button>
        )}
      </div>
    </div>
  );
};

export default PaymentSection;
