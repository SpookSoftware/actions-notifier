import React, { useEffect, useState } from "react";
import Header from "./popup/Header";
import AuthStateMessage from "./popup/AuthStateMessage";
import GitHubTokenForm from "./popup/GitHubTokenForm";
import DebugTools from "./popup/DebugTools";
import ExtensionToggle from "./popup/ExtensionToggle";
import PaymentSection from "./popup/PaymentSection";
import MonitorsCount from "./popup/MonitorsCount";
import { validateGitHubToken } from "../../services/github";
import {
  checkFirstRun,
  loadGitHubToken,
  markOnboardingSeen,
  saveGitHubToken,
} from "../../services/storage";
import {
  getAlarmCount,
  getExtensionEnabledState,
  sendTestNotification,
  setExtensionEnabledState,
} from "../../services/extension";
import {
  PaymentStatus,
  getPaymentStatus,
  openPaymentPage,
} from "../../services/payment";

const Popup: React.FC = () => {
  const [token, setToken] = useState("");
  const [tokenStatus, setTokenStatus] = useState<{
    message: string;
    isValid: boolean | null;
  }>({ message: "", isValid: null });
  const [authState, setAuthState] = useState<
    "success" | "warning" | "error" | null
  >(null);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alarmCount, setAlarmCount] = useState(0);
  const [extensionEnabled, setExtensionEnabled] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    paid: false,
    trialStarted: false,
    trialExpired: false,
    trialEndDate: undefined,
  });

  // Load data on component mount
  useEffect(() => {
    const init = async () => {
      // Check if first run
      const firstRun = await checkFirstRun();
      if (firstRun) {
        setShowWelcomeMessage(true);
        await markOnboardingSeen();
      }

      // Load and validate existing token
      await loadAndValidateToken();

      // Load extension enabled state
      const enabled = await getExtensionEnabledState();
      setExtensionEnabled(enabled);

      // Update alarm count
      const count = await getAlarmCount();
      setAlarmCount(count);

      // Automatically disable extension if count is at or above the limit
      if (count >= 500 && enabled) {
        setExtensionEnabled(false);
        await setExtensionEnabledState(false);
      }

      // Load payment status
      const status = await getPaymentStatus();
      setPaymentStatus(status);
    };

    init();
  }, []);

  // Token form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveAndValidateToken();
  };

  // Toggle extension enabled/disabled
  const handleToggle = async () => {
    const newState = !extensionEnabled;
    setExtensionEnabled(newState);
    await setExtensionEnabledState(newState);
  };

  // Helper functions
  async function saveAndValidateToken() {
    const trimmedToken = token.trim();

    if (!trimmedToken) {
      setTokenStatus({
        message: "Please enter a GitHub token",
        isValid: false,
      });
      return;
    }

    // Show loading state
    setIsLoading(true);
    setTokenStatus({ message: "", isValid: null });

    try {
      // Validate token with GitHub API
      const isValid = await validateGitHubToken(trimmedToken);

      if (isValid) {
        // Save valid token
        await saveGitHubToken(trimmedToken);
        setTokenStatus({
          message: "✓ Token validated successfully",
          isValid: true,
        });
        setAuthState("success");

        // Update alarm count after successful token validation
        const count = await getAlarmCount();
        setAlarmCount(count);
      } else {
        setTokenStatus({
          message: "✖ Invalid token or insufficient permissions",
          isValid: false,
        });
        setAuthState("error");
      }
    } catch (error: any) {
      console.error("Error validating token:", error);
      setTokenStatus({ message: `✖ Error: ${error.message}`, isValid: false });
      setAuthState("error");
    } finally {
      // Reset loading state
      setIsLoading(false);
    }
  }

  async function loadAndValidateToken() {
    try {
      const savedToken = await loadGitHubToken();

      if (savedToken) {
        // Set input value
        setToken(savedToken);

        // Validate token
        const isValid = await validateGitHubToken(savedToken);

        if (isValid) {
          setTokenStatus({ message: "✓ Token valid", isValid: true });
          setAuthState("success");
        } else {
          setTokenStatus({
            message: "✖ Token invalid or expired",
            isValid: false,
          });
          setAuthState("error");
        }
      } else {
        // No token exists
        setAuthState("warning");
      }
    } catch (error) {
      console.error("Error loading GitHub token:", error);
      setAuthState("error");
    }
  }

  // Debug notification handlers
  const handleDebugTokenNotification = async () => {
    try {
      await sendTestNotification("token-expired");
      setTokenStatus({
        message: "Token alert sent to GitHub tab",
        isValid: true,
      });
    } catch (error) {
      setTokenStatus({
        message:
          "Error: Could not send notification. Try again in a few seconds.",
        isValid: false,
      });
    }
  };

  const handleDebugAlarmNotification = async () => {
    try {
      await sendTestNotification("alarm-limit-reached");
      setTokenStatus({
        message: "Alarm limit alert sent to GitHub tab",
        isValid: true,
      });
    } catch (error) {
      setTokenStatus({
        message:
          "Error: Could not send notification. Try again in a few seconds.",
        isValid: false,
      });
    }
  };

  // Payment handler
  const handlePaymentClick = async () => {
    await openPaymentPage();
  };

  return (
    <div className="container">
      <Header />

      <AuthStateMessage
        authState={authState}
        showWelcomeMessage={showWelcomeMessage}
      />

      <GitHubTokenForm
        token={token}
        onTokenChange={setToken}
        onSubmit={handleSubmit}
        tokenStatus={tokenStatus}
        isLoading={isLoading}
      />

      <DebugTools
        onDebugTokenNotification={handleDebugTokenNotification}
        onDebugAlarmNotification={handleDebugAlarmNotification}
      />

      <ExtensionToggle enabled={extensionEnabled} onToggle={handleToggle} />

      <PaymentSection
        paymentStatus={paymentStatus}
        onPaymentClick={handlePaymentClick}
      />

      <MonitorsCount
        alarmCount={alarmCount}
        isTokenValid={authState === "success"}
      />
    </div>
  );
};

export default Popup;
