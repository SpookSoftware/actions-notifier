import React, { Suspense, useState, useEffect } from "react";
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
  saveGitHubToken,
} from "../../services/storage";
import {
  getAlarmCount,
  getExtensionEnabledState,
} from "../../services/extension";
import { getPaymentStatus, openPaymentPage } from "../../services/payment";
import { PaymentStatus } from "@/types";
import browser from "webextension-polyfill";

// Define resource types
type ResourceStatus = "pending" | "success" | "error";

interface Resource<T> {
  read(): T;
}

// Resource creation helper
function createResource<T>(asyncFn: () => Promise<T>): Resource<T> {
  let status: ResourceStatus = "pending";
  let result: T | Error;
  let suspender = asyncFn().then(
    (data: T) => {
      status = "success";
      result = data;
    },
    (error: Error) => {
      status = "error";
      result = error;
    }
  );

  return {
    read() {
      if (status === "pending") throw suspender;
      if (status === "error") throw result as Error;
      return result as T;
    },
  };
}

// Define the resources interface
interface InitialDataResources {
  firstRun: Resource<boolean>;
  token: Resource<string | null>;
  extensionEnabled: Resource<boolean>;
  alarmCount: Resource<number>;
  paymentStatus: Resource<PaymentStatus>;
}

// Create data resources
function createInitialDataResources(): InitialDataResources {
  return {
    firstRun: createResource(checkFirstRun),
    token: createResource(loadGitHubToken),
    extensionEnabled: createResource(getExtensionEnabledState),
    alarmCount: createResource(getAlarmCount),
    paymentStatus: createResource(getPaymentStatus),
  };
}

// Types for token status
interface TokenStatus {
  message: string;
  isValid: boolean | null;
}

// A simple loading spinner component
const LoadingSpinner: React.FC = () => (
  <div className="loading-container">
    <div className="spinner"></div>
    <p>Loading extension data...</p>
  </div>
);

// Error boundary component
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h3>Something went wrong</h3>
          <p>{this.state.error?.message || "Unknown error"}</p>
          <button onClick={() => window.location.reload()}>
            Reload Extension
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Props for the PopupContent component
interface PopupContentProps {
  resources: InitialDataResources;
}

// Main popup content that suspends
const PopupContent: React.FC<PopupContentProps> = ({ resources }) => {
  const savedToken = resources.token.read() || "";
  const extensionEnabled = resources.extensionEnabled.read();
  const alarmCount = resources.alarmCount.read();
  const paymentStatus = resources.paymentStatus.read();

  const [token, setToken] = useState<string>(savedToken);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>({
    message: savedToken ? "✓ Token loaded" : "",
    isValid: savedToken ? true : null,
  });
  const [authState, setAuthState] = useState<
    "success" | "warning" | "error" | null
  >(savedToken ? "success" : "warning");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [extensionStatusReason, setExtensionStatusReason] = useState<string>(
    determineStatusReason(
      extensionEnabled,
      savedToken,
      alarmCount,
      paymentStatus
    )
  );

  // Helper function to determine why extension is enabled/disabled
  function determineStatusReason(
    enabled: boolean,
    token: string,
    alarmCount: number,
    paymentStatus: PaymentStatus
  ): string {
    if (!enabled) {
      if (!token) {
        return "Disabled due to token validation issues.";
      } else if (alarmCount >= 500) {
        return "Disabled because you reached the alarm limit (500).";
      } else if (!paymentStatus.paid) {
        if (!paymentStatus.trialStartedAt) {
          return "Disabled because you need to start a trial to use the extension.";
        } else if (!paymentStatus.trialIsValid) {
          return "Disabled because trial period has expired.";
        }
      }
      return "Extension is currently disabled.";
    }
    return "The extension is monitoring workflows and adding notification buttons.";
  }

  // Token form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedToken = token.trim();

    if (!trimmedToken) {
      setTokenStatus({
        message: "Please enter a GitHub token",
        isValid: false,
      });
      return;
    }

    setIsLoading(true);
    setTokenStatus({ message: "", isValid: null });

    try {
      const isValid = await validateGitHubToken(trimmedToken);

      if (isValid) {
        await saveGitHubToken(trimmedToken);
        setTokenStatus({
          message: "✓ Token validated successfully",
          isValid: true,
        });
        setAuthState("success");

        const result = await browser.runtime.sendMessage({
          action: "checkAndUpdateExtensionState",
        });

        if ((result as { data?: { enabled?: boolean } }).data?.enabled) {
          // Refresh the page to get latest data
          window.location.reload();
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
      setTokenStatus({
        message: `✖ Error: ${error.message}`,
        isValid: false,
      });
      setAuthState("error");
    } finally {
      setIsLoading(false);
    }
  };

  // Payment handler
  const handlePaymentClick = async () => {
    await openPaymentPage();
  };

  return (
    <div className="container">
      <Header />

      <AuthStateMessage authState={authState} />

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

      <MonitorsCount alarmCount={alarmCount} />

      <p>
        Questions? Problems? Feedback? Email us at{" "}
        <a href="mailto:cicd-notifications@spook.software">
          cicd-notifications@spook.software
        </a>
      </p>
    </div>
  );
};

// Main popup wrapper with Suspense and error boundary
const Popup: React.FC = () => {
  // Create resources only once
  const [resources] = useState<InitialDataResources>(
    createInitialDataResources
  );

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        <PopupContent resources={resources} />
      </Suspense>
    </ErrorBoundary>
  );
};

export default Popup;
