import React, { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';
import ExtPay from 'extpay';

// Initialize ExtPay
const extpay = ExtPay("cicd-workflow-notifications");

interface PaymentStatus {
  paid: boolean;
  trialStarted: boolean;
  trialExpired: boolean;
  trialEndDate?: number;
}

const Popup: React.FC = () => {
  const [token, setToken] = useState('');
  const [tokenStatus, setTokenStatus] = useState<{ message: string, isValid: boolean | null }>({ message: '', isValid: null });
  const [authState, setAuthState] = useState<'success' | 'warning' | 'error' | null>(null);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alarmCount, setAlarmCount] = useState(0);
  const [extensionEnabled, setExtensionEnabled] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    paid: false,
    trialStarted: false,
    trialExpired: false,
    trialEndDate: undefined
  });
  
  // Load data on component mount
  useEffect(() => {
    const init = async () => {
      // Check if first run
      const firstRun = await checkFirstRun();
      if (firstRun) {
        setShowWelcomeMessage(true);
        await browser.storage.local.set({ hasSeenOnboarding: true });
      }

      // Load and validate existing token
      await loadAndValidateToken();

      // Load extension enabled state
      await loadExtensionEnabledState();

      // Update alarm count
      await updateAlarmCount();

      // Load payment status
      await updatePaymentStatus();
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

  // Payment button click
  const handlePaymentClick = async () => {
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
  };

  // Handle "Manage Monitors" button click
  const handleManageClick = () => {
    browser.tabs.create({ url: browser.runtime.getURL("manage.html") });
  };

  // Debug onboarding button click
  const handleDebugOnboardingClick = () => {
    browser.tabs.create({ url: browser.runtime.getURL("onboarding.html") });
  };

  // Debug token notification
  const handleDebugTokenNotification = async () => {
    // Find any open GitHub tabs
    const githubTabs = await browser.tabs.query({
      url: "https://github.com/*",
    });

    if (githubTabs.length > 0) {
      // Send notification message to the first GitHub tab
      const tab = githubTabs[0];
      await browser.tabs.sendMessage(tab.id!, {
        action: "showNotification",
        type: "token-expired",
      });

      // Focus the tab to see the notification
      await browser.tabs.update(tab.id!, { active: true });

      // Show feedback
      setTokenStatus({ message: "Token alert sent to GitHub tab", isValid: true });
    } else {
      // If no GitHub tab is open, open one and then show notification
      const newTab = await browser.tabs.create({
        url: "https://github.com",
      });

      // Wait a bit for the page and content script to load
      setTimeout(async () => {
        try {
          await browser.tabs.sendMessage(newTab.id!, {
            action: "showNotification",
            type: "token-expired",
          });
          setTokenStatus({ message: "Token alert sent to new GitHub tab", isValid: true });
        } catch (error) {
          setTokenStatus({
            message: "Error: Tab not ready yet. Please try again in a few seconds.",
            isValid: false
          });
        }
      }, 2000);
    }
  };

  // Debug alarm limit notification
  const handleDebugAlarmNotification = async () => {
    // Find any open GitHub tabs
    const githubTabs = await browser.tabs.query({
      url: "https://github.com/*",
    });

    if (githubTabs.length > 0) {
      // Send notification message to the first GitHub tab
      const tab = githubTabs[0];
      await browser.tabs.sendMessage(tab.id!, {
        action: "showNotification",
        type: "alarm-limit-reached",
      });

      // Focus the tab to see the notification
      await browser.tabs.update(tab.id!, { active: true });

      // Show feedback
      setTokenStatus({ message: "Alarm limit alert sent to GitHub tab", isValid: true });
    } else {
      // If no GitHub tab is open, open one and then show notification
      const newTab = await browser.tabs.create({
        url: "https://github.com",
      });

      // Wait a bit for the page and content script to load
      setTimeout(async () => {
        try {
          await browser.tabs.sendMessage(newTab.id!, {
            action: "showNotification",
            type: "alarm-limit-reached",
          });
          setTokenStatus({ message: "Alarm limit alert sent to new GitHub tab", isValid: true });
        } catch (error) {
          setTokenStatus({
            message: "Error: Tab not ready yet. Please try again in a few seconds.",
            isValid: false
          });
        }
      }, 2000);
    }
  };

  // Helper functions
  async function saveAndValidateToken() {
    const trimmedToken = token.trim();

    if (!trimmedToken) {
      setTokenStatus({ message: "Please enter a GitHub token", isValid: false });
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
        await browser.storage.sync.set({ githubToken: trimmedToken });
        setTokenStatus({ message: "✓ Token validated successfully", isValid: true });
        setAuthState('success');
        await updateAlarmCount();
      } else {
        setTokenStatus({ message: "✖ Invalid token or insufficient permissions", isValid: false });
        setAuthState('error');
      }
    } catch (error: any) {
      console.error("Error validating token:", error);
      setTokenStatus({ message: `✖ Error: ${error.message}`, isValid: false });
      setAuthState('error');
    } finally {
      // Reset loading state
      setIsLoading(false);
    }
  }

  async function loadAndValidateToken() {
    try {
      const data = await browser.storage.sync.get("githubToken");

      if (data.githubToken) {
        // Set input value
        setToken(data.githubToken);

        // Validate token
        const isValid = await validateGitHubToken(data.githubToken);

        if (isValid) {
          setTokenStatus({ message: "✓ Token valid", isValid: true });
          setAuthState('success');
        } else {
          setTokenStatus({ message: "✖ Token invalid or expired", isValid: false });
          setAuthState('error');
        }
      } else {
        // No token exists
        setAuthState('warning');
      }
    } catch (error) {
      console.error("Error loading GitHub token:", error);
      setAuthState('error');
    }
  }

  async function validateGitHubToken(token: string) {
    try {
      // Test API call to verify token (user endpoint requires minimal permissions)
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      // Check if unauthorized or rate limited
      if (response.status === 401 || response.status === 403) {
        return false;
      }

      // For valid token, test if it has repo scope with a sample repo request
      const repoResponse = await fetch(
        "https://api.github.com/repos/octocat/hello-world",
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      // Return true if we can access repo API
      return repoResponse.status !== 403; // 403 would mean insufficient permissions
    } catch (error) {
      console.error("Error validating token:", error);
      return false;
    }
  }

  async function checkFirstRun() {
    try {
      const data = await browser.storage.local.get("hasSeenOnboarding");
      return !data.hasSeenOnboarding;
    } catch (error) {
      console.error("Error checking first run:", error);
      return false;
    }
  }

  async function updateAlarmCount() {
    try {
      // Get all active alarms
      const alarms = await browser.alarms.getAll();
      const count = alarms.length;

      // Update count display
      setAlarmCount(count);

      // Automatically disable extension if count is at or above the limit
      if (count >= 500 && extensionEnabled) {
        setExtensionEnabled(false);
        await setExtensionEnabledState(false);
      }

      return count;
    } catch (error) {
      console.error("Error getting alarm count:", error);
      return 0;
    }
  }

  async function loadExtensionEnabledState() {
    try {
      const response = await browser.runtime.sendMessage({
        action: "getExtensionEnabled",
      });

      if (response.status === "ok" && response.data) {
        setExtensionEnabled(response.data.enabled);
      }
    } catch (error) {
      console.error("Error loading extension state:", error);
      // Default to enabled
      setExtensionEnabled(true);
    }
  }

  async function setExtensionEnabledState(enabled: boolean) {
    try {
      console.debug(`Sending request to set extension state to: ${enabled}`);

      const response = await browser.runtime.sendMessage({
        action: "setExtensionEnabled",
        enabled: enabled,
      });

      console.debug("Response from setting extension state:", response);

      // If token is valid and we're enabling, trigger a check for any issues
      if (enabled) {
        await browser.runtime.sendMessage({
          action: "checkAndUpdateExtensionState",
        });
        // Refresh the state again to be sure
        await loadExtensionEnabledState();
      }

      console.debug(`Extension enabled state set to: ${enabled}`);

      // Force UI update regardless of backend response
      setExtensionEnabled(enabled);
    } catch (error) {
      console.error("Error setting extension state:", error);
      // Reset UI to match the actual state
      await loadExtensionEnabledState();
    }
  }

  async function updatePaymentStatus() {
    try {
      // Use ExtPay to get user payment status
      let user;
      try {
        user = await extpay.getUser();
      } catch (error) {
        console.error("Error getting ExtPay user:", error);
        // Fall back to background script
        const response = await browser.runtime.sendMessage({
          action: "getPaymentStatus",
        });

        if (response.status === "ok") {
          user = response.data;
        } else {
          throw new Error("Failed to get payment status");
        }
      }

      setPaymentStatus({
        paid: user.paid,
        trialStarted: user.trialStarted,
        trialExpired: user.trialExpired,
        trialEndDate: user.trialEndDate
      });
    } catch (error) {
      console.error("Error updating payment status:", error);
    }
  }

  // Calculate trial progress
  const calculateTrialProgress = () => {
    if (paymentStatus.paid) return 100;
    if (!paymentStatus.trialStarted) return 0;
    if (paymentStatus.trialExpired) return 100;

    const now = Date.now();
    const trialEndDate = paymentStatus.trialEndDate || 0;
    const daysLeft = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(100, 100 - (daysLeft / 7) * 100));
  };

  // Calculate days left in trial
  const getDaysLeft = () => {
    if (paymentStatus.paid) return 0;
    if (!paymentStatus.trialStarted) return 7;
    if (paymentStatus.trialExpired) return 0;

    const now = Date.now();
    const trialEndDate = paymentStatus.trialEndDate || 0;
    return Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));
  };

  // Get payment button text
  const getPaymentButtonText = () => {
    if (paymentStatus.paid) return '';
    if (!paymentStatus.trialStarted) return 'Start Free Trial';
    return 'Purchase License ($2.95/lifetime)';
  };

  // Get payment status message
  const getPaymentStatusMessage = () => {
    if (paymentStatus.paid) {
      return 'Thank you for your purchase! You have lifetime access to this extension.';
    }
    if (!paymentStatus.trialStarted) {
      return 'Start your free 7-day trial to try all features.';
    }
    if (paymentStatus.trialExpired) {
      return 'Your free trial has expired. Please purchase to continue using this extension.';
    }
    return 'Your 7-day free trial is active.';
  };

  return (
    <div className="container">
      <header>
        <img src="images/icon-48.png" alt="Extension icon" />
        <h1>CI/CD Workflow Notifications</h1>
      </header>

      {/* Welcome message for first-time users */}
      {showWelcomeMessage && (
        <div className="auth-state auth-state-warning" id="welcome-message">
          <strong>Welcome to CI/CD Workflow Notifications!</strong>
          <p>
            This extension needs a GitHub token to monitor your workflows and
            notify you when they complete.
          </p>
        </div>
      )}

      {/* Auth states */}
      {authState === 'success' && (
        <div className="auth-state auth-state-success">
          <strong>✓ GitHub token configured</strong>
          <p>
            Your extension is ready to monitor GitHub workflows. Click the bell
            icon on any running workflow to receive a notification when it
            completes.
          </p>
        </div>
      )}

      {authState === 'warning' && (
        <div className="auth-state auth-state-warning">
          <strong>⚠️ GitHub token required</strong>
          <p>
            Please add a GitHub token with 'repo' scope to enable workflow
            monitoring.
          </p>
        </div>
      )}

      {authState === 'error' && (
        <div className="auth-state auth-state-error">
          <strong>✖ GitHub token invalid</strong>
          <p>
            The provided token could not be verified. Please make sure it has the
            correct 'repo' scope permissions.
          </p>
        </div>
      )}

      {/* Token form */}
      <form onSubmit={handleSubmit}>
        <label htmlFor="githubToken">GitHub Token:</label>
        <input
          type="password"
          id="githubToken"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          placeholder="ghp_..."
        />
        <div className="help-text">
          <a
            href="https://github.com/settings/tokens/new?description=CICD%20Workflow%20Notifications&scopes=repo"
            target="_blank"
          >
            Create a new token with repo scope →
          </a>
        </div>
        {tokenStatus.message && (
          <div id="token-status" className={tokenStatus.isValid ? "token-valid" : "token-invalid"}>
            {tokenStatus.message}
          </div>
        )}
        <div className="flex-row">
          <button type="submit" id="saveButton" disabled={isLoading}>Save Token</button>
          {isLoading && <div className="spinner" style={{ display: 'inline-block' }}></div>}
        </div>
      </form>

      <div className="debug-buttons">
        <h3 style={{ fontSize: '14px', marginTop: '16px', marginBottom: '10px' }}>
          Debug Tools:
        </h3>
        <div className="flex-row" style={{ flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between' }}>
          <button
            className="secondary"
            onClick={handleDebugOnboardingClick}
            style={{ flex: 1 }}
          >
            Debug Onboarding
          </button>
          <button
            className="secondary"
            onClick={handleDebugTokenNotification}
            style={{ flex: 1, backgroundColor: '#ffeef0', borderColor: '#f97583' }}
          >
            Test Token Alert
          </button>
          <button
            className="secondary"
            onClick={handleDebugAlarmNotification}
            style={{ flex: 1, backgroundColor: '#fffbdd', borderColor: '#f9c513' }}
          >
            Test Alarm Alert
          </button>
        </div>
      </div>

      {/* Extension on/off switch */}
      <div className="extension-toggle-section">
        <div className="flex-row toggle-container">
          <label className="toggle-label" htmlFor="extension-toggle">
            Extension Status:
          </label>
          <div className="toggle-switch" onClick={handleToggle}>
            <input
              type="checkbox"
              id="extension-toggle"
              checked={extensionEnabled}
              onChange={handleToggle}
            />
            <span className="toggle-slider"></span>
          </div>
          <span id="extension-status" style={{ color: extensionEnabled ? "#28a745" : "#cb2431" }}>
            {extensionEnabled ? "Enabled" : "Disabled"}
          </span>
        </div>
        <div className="help-text">
          When disabled, the extension won't add buttons or monitor workflows.
        </div>
      </div>

      {/* Payment section */}
      <div className="payment-section">
        <div className="flex-row payment-header">
          <h3>License Status</h3>
          <span 
            className={`payment-badge ${paymentStatus.paid ? "paid" : ""}`}
            style={{ backgroundColor: paymentStatus.trialExpired ? "#cb2431" : undefined }}
          >
            {paymentStatus.paid ? "Purchased" : paymentStatus.trialExpired ? "Trial Expired" : "Free Trial"}
          </span>
        </div>
        <div className="payment-info">
          <p>{getPaymentStatusMessage()}</p>
          {!paymentStatus.paid && (
            <div className="trial-progress-container">
              <div className="trial-progress-bar" style={{ width: `${calculateTrialProgress()}%` }}></div>
              <span className="trial-days-left">
                {getDaysLeft()} day{getDaysLeft() !== 1 ? "s" : ""} {paymentStatus.trialExpired ? "left" : "available"}
              </span>
            </div>
          )}
          {(!paymentStatus.paid || !getPaymentButtonText()) && (
            <button className="payment-button" onClick={handlePaymentClick}>
              {getPaymentButtonText()}
            </button>
          )}
        </div>
      </div>

      {/* Active monitors counter */}
      {authState === 'success' && (
        <div className="monitors-count">
          <div className="flex-row">
            <span>
              Active monitors: <strong>{alarmCount}</strong> / 500
            </span>
            {alarmCount >= 400 && alarmCount < 475 && (
              <span id="alarm-count-warning">⚠️ Approaching limit</span>
            )}
            {alarmCount >= 475 && (
              <span id="alarm-count-error">⚠️ At limit</span>
            )}
          </div>
          {alarmCount > 0 && (
            <div className="manage-section">
              <div className="flex-row">
                <button className="secondary" onClick={handleManageClick}>
                  Manage Active Monitors
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Popup;