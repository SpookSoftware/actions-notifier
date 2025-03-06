import React, { useState, useEffect } from 'react';
import browser from 'webextension-polyfill';
import ExtPay from 'extpay';

// Initialize ExtPay
const extpay = ExtPay("cicd-workflow-notifications");

// SVG Icons
const CrossIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 4l-8 8" />
    <path d="M4 4l8 8" />
  </svg>
);

const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 8h14" />
    <path d="M8 1v14" />
  </svg>
);

const OnboardingPage: React.FC = () => {
  // State variables
  const [currentStep, setCurrentStep] = useState(1);
  const [tokenValidated, setTokenValidated] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [validatingToken, setValidatingToken] = useState(false);
  const [tokenMessage, setTokenMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [startingTrial, setStartingTrial] = useState(false);
  const [trialButtonText, setTrialButtonText] = useState('Start Free Trial');
  const [trialButtonDisabled, setTrialButtonDisabled] = useState(false);

  // Check for existing token on mount
  useEffect(() => {
    checkExistingToken();
  }, []);

  // Navigate to previous step
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Navigate to next step
  const goToNextStep = () => {
    // If on step 2 (token step), require validation before proceeding
    if (currentStep === 2 && !tokenValidated && showTokenInput) {
      // Show validation message if they try to proceed without validating
      setTokenMessage({
        type: 'error',
        text: 'Please validate your token before continuing.'
      });
      return;
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Check if a token already exists
  const checkExistingToken = async () => {
    try {
      const data = await browser.storage.sync.get("githubToken");

      if (typeof data.githubToken === "string") {
        // Test the existing token
        const isValid = await testGitHubToken(data.githubToken);

        if (isValid) {
          // If valid, pre-fill and allow to skip token step
          setGithubToken(data.githubToken);
          setTokenValidated(true);

          // Show success message and token input
          setShowTokenInput(true);
          setTokenMessage({
            type: 'success',
            text: '✓ Existing token is valid! You can proceed.'
          });
        }
      }
    } catch (error) {
      console.error("Error checking existing token:", error);
    }
  };

  // Validate the GitHub token
  const validateToken = async () => {
    if (!githubToken.trim()) {
      setTokenMessage({
        type: 'error',
        text: 'Please enter a token.'
      });
      return;
    }

    try {
      // Show loading state
      setValidatingToken(true);
      setTokenMessage(null);

      // Make API request to validate token
      const isValid = await testGitHubToken(githubToken);

      if (isValid) {
        // Success
        setTokenValidated(true);
        setTokenMessage({
          type: 'success',
          text: '✓ Token validated successfully!'
        });

        // Save token
        await browser.storage.sync.set({ githubToken });

        // Auto-advance after a short delay
        setTimeout(() => {
          if (currentStep === 2) {
            setCurrentStep(3);
          }
        }, 1500);
      } else {
        // Error
        setTokenValidated(false);
        setTokenMessage({
          type: 'error',
          text: '✖ Invalid token or insufficient permissions. Please ensure your token has the "repo" scope.'
        });
      }
    } catch (error) {
      console.error("Token validation error:", error);
      setTokenMessage({
        type: 'error',
        text: `✖ Error: ${error instanceof Error ? error.message : "Network error"}`
      });
    } finally {
      // Reset loading state
      setValidatingToken(false);
    }
  };

  // Test if a GitHub token is valid and has correct permissions
  const testGitHubToken = async (token: string): Promise<boolean> => {
    try {
      // Test user endpoint first (basic validation)
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (userResponse.status !== 200) {
        return false;
      }

      // Test repo scope with a simple public repo lookup
      const repoResponse = await fetch(
        "https://api.github.com/repos/octocat/hello-world",
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      // Return true if we have proper access
      return repoResponse.status === 200;
    } catch (error) {
      console.error("GitHub API error:", error);
      return false;
    }
  };

  // Check if trial is valid
  const trialIsValid = (trialStart: Date | null): boolean => {
    if (!trialStart) {
      return false;
    }
    const trialStartedLessThanSevenDaysAgo =
      Date.now() - trialStart.getTime() <= 7 * 24 * 60 * 60 * 1000;
    return trialStartedLessThanSevenDaysAgo;
  };

  // Start the free trial
  const startFreeTrial = async () => {
    try {
      // Disable button and show loading state
      setTrialButtonDisabled(true);
      setStartingTrial(true);
      setTrialButtonText('Starting trial...');

      // Get user status
      const user = await extpay.getUser();

      // If trial already started, show message
      if (trialIsValid(user.trialStartedAt)) {
        setTrialButtonText('✓ Trial already activated');
        setTimeout(() => {
          setTrialButtonText('Trial Active');
        }, 2000);
        return;
      }

      // Start the trial using ExtPay
      try {
        await extpay.openTrialPage("start");

        // Start polling for trial status
        startTrialStatusPolling();
      } catch (error) {
        console.error("Error starting trial:", error);

        // Fallback using the background script
        await browser.runtime.sendMessage({ action: "openPaymentPage" });

        // Start polling for trial status
        startTrialStatusPolling();
      }
    } catch (error) {
      console.error("Error with trial activation:", error);
      setTrialButtonDisabled(false);
      setStartingTrial(false);
      setTrialButtonText('Try Again');
    }
  };

  // Poll for trial status and update the button accordingly
  const startTrialStatusPolling = () => {
    // Initial delay before first check (3 seconds)
    setTimeout(async () => {
      let attempts = 0;
      const maxAttempts = 100; // Stop after ~5 minutes (100 * 3 seconds)

      const checkTrialStatus = async () => {
        try {
          const user = await extpay.getUser();

          if (trialIsValid(user.trialStartedAt)) {
            // Trial activated successfully
            setTrialButtonDisabled(true);
            setStartingTrial(false);
            setTrialButtonText('✓ Trial activated!');
            setTimeout(() => {
              setTrialButtonText('Trial Active');
            }, 2000);
            return true; // Stop polling
          }

          // Continue checking if max attempts not reached
          attempts++;
          if (attempts >= maxAttempts) {
            // Max attempts reached, reset button state
            setTrialButtonDisabled(false);
            setStartingTrial(false);
            setTrialButtonText('Start Free Trial');
            return true; // Stop polling
          }

          return false; // Continue polling
        } catch (error) {
          console.error("Error checking trial status:", error);

          // Reset button after error
          setTrialButtonDisabled(false);
          setStartingTrial(false);
          setTrialButtonText('Start Free Trial');
          return true; // Stop polling on error
        }
      };

      // Start the polling process
      const poll = async () => {
        const shouldStop = await checkTrialStatus();
        if (!shouldStop) {
          setTimeout(poll, 3000); // Check every 3 seconds
        }
      };

      poll();
    }, 3000);
  };

  // Complete the onboarding process
  const finishOnboarding = async () => {
    try {
      // Mark onboarding as completed
      await browser.storage.local.set({ hasCompletedOnboarding: true });

      // Close the tab or redirect to GitHub
      window.location.href = "https://github.com";
    } catch (error) {
      console.error("Error finishing onboarding:", error);
    }
  };

  // Render progress markers
  const renderProgressBar = () => {
    return (
      <div className="progress-bar">
        {[1, 2, 3].map((step) => (
          <div key={step} className="progress-step">
            <div 
              className={`step-marker ${
                step === currentStep 
                  ? 'active' 
                  : step < currentStep 
                    ? 'completed' 
                    : ''
              }`}
            >
              {step < currentStep ? '✓' : step}
            </div>
            <div className="step-label">
              {step === 1 ? 'Welcome' : step === 2 ? 'GitHub Token' : 'Ready'}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render step 1 content
  const renderStep1 = () => {
    return (
      <div className="step">
        <div className="step-number">1</div>
        <div className="step-content">
          <h2>Welcome to CI/CD Workflow Notifications</h2>
          <p>
            This extension enhances GitHub's Actions interface by adding
            notification support for your CI/CD workflows.
          </p>
          <p>
            <strong>Key Features:</strong>
          </p>
          <ul>
            <li>Get notified when workflows complete (success or failure)</li>
            <li>Easily monitor specific jobs within a workflow</li>
            <li>Track pull request checks directly from the PR page</li>
            <li>Manage all your active workflow monitors in one place</li>
          </ul>
          <p>
            <strong>Important:</strong> To access GitHub's API and monitor your
            workflows, you'll need to provide a GitHub token with appropriate
            permissions.
          </p>
        </div>
      </div>
    );
  };

  // Render step 2 content
  const renderStep2 = () => {
    return (
      <div className="step">
        <div className="step-number">2</div>
        <div className="step-content">
          <h2>GitHub Token Setup</h2>
          <p>
            The extension needs a GitHub Personal Access Token with
            <strong> repo</strong> scope to monitor your workflow status.
          </p>

          <div className="permission-item">
            <CrossIcon />
            <span>
              This token will <strong>not</strong> be sent to our servers
            </span>
          </div>
          <div className="permission-item">
            <PlusIcon />
            <span>The token is stored only in your browser</span>
          </div>
          <div className="permission-item">
            <PlusIcon />
            <span>Used only to check workflow status via GitHub API</span>
          </div>

          <div className="token-options">
            <a
              href="https://github.com/settings/tokens/new?description=CI/CD%20Workflow%20Notifications&scopes=repo"
              target="_blank"
              className="btn btn-primary"
            >
              Create New Token
            </a>
            <span>or</span>
            <button 
              className="btn btn-secondary"
              onClick={() => setShowTokenInput(true)}
            >
              I already have a token
            </button>
          </div>

          {showTokenInput && (
            <div>
              <p>Enter your GitHub token:</p>
              <input
                type="password"
                className="token-input"
                placeholder="ghp_..."
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
              />
              <p className="help-text">
                Token should begin with "ghp_" and have the "repo" scope
                permission.
              </p>

              <button 
                className="btn btn-primary"
                onClick={validateToken}
                disabled={validatingToken}
              >
                {validatingToken && <span className="spinner"></span>}
                Validate Token
              </button>

              {tokenMessage && (
                <div className={`token-feedback ${tokenMessage.type === 'success' ? 'success-message' : 'error-message'}`}>
                  {tokenMessage.text}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render step 3 content
  const renderStep3 = () => {
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
              margin: '20px 0',
              padding: '15px',
              backgroundColor: '#f8f4ff',
              border: '1px solid #ddd2f7',
              borderRadius: '6px',
              borderLeft: '4px solid #6f42c1'
            }}
          >
            <h3 style={{ marginTop: 0, color: '#6f42c1' }}>💜 Free Trial Period</h3>
            <p>
              To use the extension, you need to sign up for a
              <b> 7-day free trial</b>. After the trial period, a one-time
              purchase is required to continue using the extension.
            </p>
            <p style={{ marginBottom: '10px' }}>
              <b>Price:</b> $2.95 (one-time payment, lifetime license)
            </p>
            <button 
              className="btn btn-primary"
              onClick={startFreeTrial}
              disabled={trialButtonDisabled}
            >
              {startingTrial && <span className="spinner"></span>}
              {trialButtonText}
            </button>
          </div>

          <div className="help-text">
            <p>
              You can always update your token or manage active monitors from
              the extension popup.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="header">
        <img src="images/icon-128.png" alt="CI/CD Workflow Notifications" />
        <h1>Welcome to CI/CD Workflow Notifications</h1>
      </div>

      {renderProgressBar()}

      <div className="steps-container">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>

      <div className="controls">
        {currentStep > 1 && (
          <button className="btn btn-secondary" onClick={goToPreviousStep}>
            Previous
          </button>
        )}
        {currentStep < 3 && (
          <button className="btn btn-primary" onClick={goToNextStep}>
            Next
          </button>
        )}
        {currentStep === 3 && (
          <button className="btn btn-primary" onClick={finishOnboarding}>
            Get Started
          </button>
        )}
      </div>
    </>
  );
};

export default OnboardingPage;