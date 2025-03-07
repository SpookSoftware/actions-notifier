import React, { useEffect, useState } from "react";
import Header from "./popup/Header";
import AuthStateMessage from "./popup/AuthStateMessage";
import GitHubTokenForm from "./popup/GitHubTokenForm";
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
} from "../../services/extension";
import { getPaymentStatus, openPaymentPage } from "../../services/payment";
import { PaymentStatus } from "@/types";
import browser from "webextension-polyfill";

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
  const [extensionStatusReason, setExtensionStatusReason] =
    useState<string>("");
  // Initialize with null trialStartedAt to indicate loading state
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    paid: false,
    trialIsValid: false,
    trialStartedAt: null,
  });

  // Load data on component mount
  useEffect(() => {
    const init = async () => {
      const firstRun = await checkFirstRun();
      if (firstRun) {
        setShowWelcomeMessage(true);
        await markOnboardingSeen();
      }

      // Load and validate existing token first
      await loadAndValidateToken();

      // Update alarm count
      const count = await getAlarmCount();
      setAlarmCount(count);

      // Load payment status
      const status = await getPaymentStatus();
      setPaymentStatus(status);

      // Load extension enabled state
      const enabled = await getExtensionEnabledState();
      setExtensionEnabled(enabled);

      // Set appropriate status reason based on conditions
      if (!enabled) {
        // If no token or invalid token, that's the primary reason
        if (!tokenStatus.isValid) {
          setExtensionStatusReason("Disabled due to token validation issues.");
        }
        // Check alarms next
        else if (count >= 500) {
          setExtensionStatusReason(
            "Disabled because you reached the alarm limit (500)."
          );
        }
        // Then check trial/payment status
        else if (!status.paid) {
          if (!status.trialStartedAt) {
            // Trial never started (user skipped onboarding)
            setExtensionStatusReason(
              "Disabled because you need to start a trial to use the extension."
            );
          } else if (!status.trialIsValid) {
            // Trial started but expired
            setExtensionStatusReason(
              "Disabled because trial period has expired."
            );
          }
        }
        // Generic fallback message if no specific reason identified
        else {
          setExtensionStatusReason("Extension is currently disabled.");
        }
      }
    };

    init();
  }, []);

  // Token form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveAndValidateToken();
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

        // Ask background script to check and update extension state
        // This will re-evaluate all conditions including the token
        const result: { data?: { enabled?: boolean } } =
          await browser.runtime.sendMessage({
            action: "checkAndUpdateExtensionState",
          });

        if (result.data?.enabled) {
          setExtensionEnabled(true);
          setExtensionStatusReason(
            "The extension is monitoring workflows and adding notification buttons."
          );
        }
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

          // If the token is valid, we need to tell the background script
          // to check the extension state again
          await browser.runtime.sendMessage({
            action: "checkAndUpdateExtensionState",
          });
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

      <div className="debug-buttons">
        <h3
          style={{ fontSize: "14px", marginTop: "16px", marginBottom: "10px" }}
        >
          Debug Tools:
        </h3>
        <div
          className="flex-row"
          style={{
            flexWrap: "wrap",
            gap: "8px",
            justifyContent: "space-between",
          }}
        >
          <button
            className="secondary"
            onClick={() => {
              browser.tabs.create({
                url: browser.runtime.getURL("onboarding.html"),
              });
            }}
            style={{ flex: 1 }}
          >
            Debug Onboarding
          </button>
        </div>
      </div>

      <ExtensionToggle
        enabled={extensionEnabled}
        reason={extensionStatusReason}
      />

      <PaymentSection
        paymentStatus={paymentStatus}
        onPaymentClick={handlePaymentClick}
      />

      <MonitorsCount
        alarmCount={alarmCount}
        isTokenValid={authState === "success"}
      />

      <p>
        Questions? Feedback? Email us at{" "}
        <a href="mailto:cicd-notifications@spook.software">
          cicd-notifications@spook.software
        </a>
      </p>
    </div>
  );
};

export default Popup;
