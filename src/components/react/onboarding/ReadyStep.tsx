import React from "react";
import { openBuyPage, getPaymentStatus } from "@/services/payment";
import {
  startFreeTrial as startFreeTrialService,
  startTrialStatusPolling,
} from "@/services/trial";

interface ReadyStepProps {
  onPaymentStatusChange?: (isPaidOrTrialing: boolean) => void;
}

// Trial button component
const TrialButton: React.FC<{
  trialActivated: boolean;
  onStartTrial: () => void;
  disableAllButtons: boolean;
}> = ({ trialActivated, onStartTrial, disableAllButtons }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [buttonText, setButtonText] = React.useState(
    "Start Free Trial (no credit card required)"
  );

  const handleClick = async () => {
    if (trialActivated) return;

    setIsLoading(true);
    setButtonText("Starting Trial...");

    try {
      await startFreeTrialService();
      onStartTrial();
    } catch (error) {
      console.error("Error starting trial:", error);
      setButtonText("Failed to Start Trial");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className="btn btn-primary"
      onClick={handleClick}
      disabled={isLoading || trialActivated || disableAllButtons}
    >
      {isLoading && <span className="spinner"></span>}
      {trialActivated ? "Trial Activated" : buttonText}
    </button>
  );
};

// Purchase button component
const PurchaseButton: React.FC<{
  onPurchaseInitiated: () => void;
  disableAllButtons: boolean;
}> = ({ onPurchaseInitiated, disableAllButtons }) => {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await openBuyPage();
      onPurchaseInitiated();
    } catch (error) {
      console.error("Error opening payment page:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className="btn"
      onClick={handleClick}
      disabled={isLoading || disableAllButtons}
      style={{
        background: "#fff",
        border: "1px solid #6f42c1",
        color: "#6f42c1",
      }}
    >
      {isLoading && <span className="spinner"></span>}
      Buy Now ($2.95)
    </button>
  );
};

const ReadyStep: React.FC<ReadyStepProps> = ({ onPaymentStatusChange }) => {
  const [checkingStatus, setCheckingStatus] = React.useState(false);
  const [paymentComplete, setPaymentComplete] = React.useState(false);
  const [trialActivated, setTrialActivated] = React.useState(false);

  // Status message states
  const [showStatusMessage, setShowStatusMessage] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState("");

  // Reference to store cleanup function
  const pollingCleanupRef = React.useRef<(() => void) | null>(null);

  // Start status polling for trial/purchase
  const startStatusPolling = () => {
    setCheckingStatus(true);

    // Set a safety timeout to reset the checking status if something goes wrong
    // This prevents the UI from getting stuck if the user closes the trial page
    const safetyTimeoutId = setTimeout(() => {
      setCheckingStatus(false);
      // Check status once more to see if trial/payment was actually completed
      getPaymentStatus().then((status) => {
        if (status.paid) {
          setPaymentComplete(true);
          setShowStatusMessage(true);
          setStatusMessage(
            "Thank you for your purchase! You have lifetime access to this extension."
          );
          if (onPaymentStatusChange) onPaymentStatusChange(true);
        } else if (status.trialIsValid) {
          setTrialActivated(true);
          setShowStatusMessage(true);
          setStatusMessage(
            "Your 7-day free trial has been activated. Enjoy the extension!"
          );
          if (onPaymentStatusChange) onPaymentStatusChange(true);
        }
      });
    }, 10000); // 10 seconds should be enough time for normal operation

    // Store cleanup function to use in the future
    const cleanup = startTrialStatusPolling(
      // On trial/purchase activated
      () => {
        clearTimeout(safetyTimeoutId);
        getPaymentStatus().then((status) => {
          if (status.paid) {
            setPaymentComplete(true);
            setShowStatusMessage(true);
            setStatusMessage(
              "Thank you for your purchase! You have lifetime access to this extension."
            );
            if (onPaymentStatusChange) onPaymentStatusChange(true);
          } else if (status.trialIsValid) {
            setTrialActivated(true);
            setShowStatusMessage(true);
            setStatusMessage(
              "Your 7-day free trial has been activated. Enjoy the extension!"
            );
            if (onPaymentStatusChange) onPaymentStatusChange(true);
          }
          setCheckingStatus(false);
        });
      },
      // On trial pending
      (attempt, maxAttempts) => {
        // Just monitor attempts
      },
      // On error
      () => {
        clearTimeout(safetyTimeoutId);
        setCheckingStatus(false);
      }
    );

    // Store the cleanup function for component unmount
    pollingCleanupRef.current = cleanup;
  };

  // Clean up polling on unmount
  React.useEffect(() => {
    return () => {
      if (pollingCleanupRef.current) {
        pollingCleanupRef.current();
      }
    };
  }, []);

  // Check payment/trial status on component mount and poll for updates
  React.useEffect(() => {
    let intervalId: number | NodeJS.Timeout;
    let isMounted = true; // Track if component is still mounted

    const checkPaymentStatus = async () => {
      if (!isMounted) return; // Don't proceed if component unmounted

      try {
        const status = await getPaymentStatus();
        if (!isMounted) return; // Don't update state if component unmounted

        if (status.paid) {
          setPaymentComplete(true);
          setShowStatusMessage(true);
          setStatusMessage(
            "Thank you for your purchase! You have lifetime access to this extension."
          );
          if (onPaymentStatusChange) onPaymentStatusChange(true);

          // If we've detected a successful payment, stop polling
          clearInterval(intervalId as NodeJS.Timeout);
        } else if (status.trialIsValid) {
          setTrialActivated(true);
          setShowStatusMessage(true);
          setStatusMessage(
            "Your 7-day free trial has been activated. Enjoy the extension!"
          );
          if (onPaymentStatusChange) onPaymentStatusChange(true);

          // If we've detected a successful trial activation, stop polling
          clearInterval(intervalId as NodeJS.Timeout);
        } else {
          if (onPaymentStatusChange) onPaymentStatusChange(false);
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
        if (isMounted && onPaymentStatusChange) onPaymentStatusChange(false);
      }
    };

    // Initial check
    checkPaymentStatus();

    // Set up polling with a more reasonable interval (3 seconds instead of 1)
    // This reduces system load while still being responsive
    intervalId = setInterval(checkPaymentStatus, 3000) as NodeJS.Timeout;

    // Clean up function
    return () => {
      isMounted = false;
      clearInterval(intervalId as NodeJS.Timeout);
    };
  }, [onPaymentStatusChange]);

  return (
    <div className="step">
      <div className="step-number">3</div>
      <div className="step-content">
        <h2>You're all set!</h2>
        <p>
          Your GitHub token has been configured successfully. You can now use
          the extension to monitor your workflows.
        </p>

        <h3>How to use:</h3>
        <ol>
          <li>Navigate to GitHub Actions or a pull request with checks</li>
          <li>Find a running or queued workflow</li>
          <li>Click the bell icon 🔔 to monitor that workflow</li>
          <li>The extension will notify you when the workflow completes</li>
        </ol>

        <div
          style={{
            margin: "20px 0",
            padding: "15px",
            backgroundColor: "#f8f4ff",
            border: "1px solid #ddd2f7",
            borderRadius: "6px",
            borderLeft: "4px solid #6f42c1",
          }}
        >
          {showStatusMessage ? (
            <div style={{ padding: "10px 0", color: "#6f42c1" }}>
              <h3 style={{ marginTop: 0, color: "#6f42c1" }}>
                {paymentComplete
                  ? "💰 Purchase Complete"
                  : "✅ Trial Activated"}
              </h3>
              <p>{statusMessage}</p>
            </div>
          ) : (
            <>
              <h3 style={{ marginTop: 0, color: "#6f42c1" }}>
                💜 Free Trial Period
              </h3>
              <p>
                To use the extension, you need to sign up for a{" "}
                <b>
                  <i>no-credit-card-required</i> 7-day free trial
                </b>
                . After the trial period, a one-time purchase is required to
                continue using the extension.
              </p>
              <p style={{ marginBottom: "10px" }}>
                <b>Price:</b> $2.95 (one-time payment, lifetime license)
              </p>
            </>
          )}

          {!paymentComplete && (
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <TrialButton
                trialActivated={trialActivated}
                onStartTrial={startStatusPolling}
                disableAllButtons={checkingStatus}
              />

              <PurchaseButton
                onPurchaseInitiated={startStatusPolling}
                disableAllButtons={checkingStatus}
              />
            </div>
          )}

          {!trialActivated && !paymentComplete && (
            <div style={{ marginTop: "15px", color: "#e25822" }}>
              <p>
                <strong>
                  * You must start a trial or make a purchase to complete
                  onboarding.
                </strong>
              </p>
            </div>
          )}
        </div>

        <div className="help-text">
          <p>
            You can always update your token or manage active monitors from the
            extension popup.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReadyStep;
