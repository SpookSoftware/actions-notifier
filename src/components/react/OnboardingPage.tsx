import React, { useState, useEffect } from "react";
import browser from "webextension-polyfill";
import ProgressBar from "./shared/ProgressBar";
import Header from "./onboarding/Header";
import WelcomeStep from "./onboarding/WelcomeStep";
import TokenStep from "./onboarding/TokenStep";
import ReadyStep from "./onboarding/ReadyStep";
import NavigationControls from "./onboarding/NavigationControls";
import { validateGitHubToken } from "../../services/github";
import { loadGitHubToken, saveGitHubToken } from "../../services/storage";
import {
  finishOnboarding,
  startFreeTrial,
  startTrialStatusPolling,
  trialIsValid,
} from "../../services/trial";
import ExtPay from "extpay";

// Initialize ExtPay
const extpay = ExtPay("cicd-workflow-notifications");

const OnboardingPage: React.FC = () => {
  // State variables
  const [currentStep, setCurrentStep] = useState(1);
  const [tokenValidated, setTokenValidated] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [githubToken, setGithubToken] = useState("");
  const [validatingToken, setValidatingToken] = useState(false);
  const [tokenMessage, setTokenMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [startingTrial, setStartingTrial] = useState(false);
  const [trialButtonText, setTrialButtonText] = useState("Start Free Trial");
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
  const goToNextStep = async () => {
    // If on step 2 (token step) and token is not validated yet
    if (currentStep === 2 && !tokenValidated) {
      // If token input is visible with token entered but not validated
      if (showTokenInput && githubToken.trim()) {
        // Attempt to validate the token before proceeding
        setValidatingToken(true);
        setTokenMessage({
          type: "error",
          text: "Validating token...",
        });

        try {
          const isValid = await validateGitHubToken(githubToken);

          if (isValid) {
            // Success
            setTokenValidated(true);
            setTokenMessage({
              type: "success",
              text: "✓ Token validated successfully!",
            });

            // Save token
            await saveGitHubToken(githubToken);

            // Notify background script to check extension state
            try {
              await browser.runtime.sendMessage({
                action: "checkAndUpdateExtensionState",
              });
            } catch (error) {
              console.error("Error updating extension state:", error);
            }

            // Proceed to next step
            if (currentStep < 3) {
              setCurrentStep(currentStep + 1);
            }
          } else {
            // Error
            setTokenValidated(false);
            setTokenMessage({
              type: "error",
              text: '✖ Invalid token or insufficient permissions. Please ensure your token has the "repo" scope.',
            });
          }
        } catch (error) {
          console.error("Token validation error:", error);
          setTokenMessage({
            type: "error",
            text: `✖ Error: ${
              error instanceof Error ? error.message : "Network error"
            }`,
          });
        } finally {
          setValidatingToken(false);
        }
        return;
      }

      // If token input is visible but no token entered
      if (showTokenInput && !githubToken.trim()) {
        setTokenMessage({
          type: "error",
          text: "Please enter a token before continuing.",
        });
        return;
      }

      // If token input is not visible (user hasn't clicked "I already have a token")
      if (!showTokenInput) {
        setTokenMessage({
          type: "error",
          text: "Please create a token or enter an existing one before continuing.",
        });
        // Show the token input to guide the user
        setShowTokenInput(true);
        return;
      }

      // Don't proceed if token isn't validated
      return;
    }

    // Default behavior - go to next step
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Check if a token already exists
  const checkExistingToken = async () => {
    try {
      const savedToken = await loadGitHubToken();

      if (savedToken) {
        // Test the existing token
        const isValid = await validateGitHubToken(savedToken);

        if (isValid) {
          // If valid, pre-fill and allow to skip token step
          setGithubToken(savedToken);
          setTokenValidated(true);

          // Show success message and token input
          setShowTokenInput(true);
          setTokenMessage({
            type: "success",
            text: "✓ Existing token is valid! You can proceed.",
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
        type: "error",
        text: "Please enter a token.",
      });
      return;
    }

    try {
      // Show loading state
      setValidatingToken(true);
      setTokenMessage(null);

      // Make API request to validate token
      const isValid = await validateGitHubToken(githubToken);

      if (isValid) {
        // Success
        setTokenValidated(true);
        setTokenMessage({
          type: "success",
          text: "✓ Token validated successfully!",
        });

        // Save token
        await saveGitHubToken(githubToken);

        // Notify background script to check extension state
        try {
          await browser.runtime.sendMessage({
            action: "checkAndUpdateExtensionState",
          });
        } catch (error) {
          console.error("Error updating extension state:", error);
        }

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
          type: "error",
          text: '✖ Invalid token or insufficient permissions. Please ensure your token has the "repo" scope.',
        });
      }
    } catch (error) {
      console.error("Token validation error:", error);
      setTokenMessage({
        type: "error",
        text: `✖ Error: ${
          error instanceof Error ? error.message : "Network error"
        }`,
      });
    } finally {
      // Reset loading state
      setValidatingToken(false);
    }
  };

  // Start the free trial with UI feedback
  const handleStartFreeTrial = async () => {
    try {
      // Disable button and show loading state
      setTrialButtonDisabled(true);
      setStartingTrial(true);
      setTrialButtonText("Starting trial...");

      // Get user status
      const user = await extpay.getUser();

      // If trial already started, show message
      if (trialIsValid(user.trialStartedAt)) {
        setTrialButtonText("✓ Trial already activated");
        setTimeout(() => {
          setTrialButtonText("Trial Active");
        }, 2000);
        return;
      }

      // Start the trial
      await startFreeTrial();

      // Start polling for trial status
      startTrialStatusPolling(
        // On trial activated
        () => {
          setTrialButtonDisabled(true);
          setStartingTrial(false);
          setTrialButtonText("✓ Trial activated!");
          setTimeout(() => {
            setTrialButtonText("Trial Active");
          }, 2000);
        },
        // On trial pending
        (attempts, maxAttempts) => {
          // Optional: update UI to show progress
          setTrialButtonText(`Starting trial... (${attempts}/${maxAttempts})`);
        },
        // On error
        () => {
          setTrialButtonDisabled(false);
          setStartingTrial(false);
          setTrialButtonText("Try Again");
        }
      );
    } catch (error) {
      console.error("Error with trial activation:", error);
      setTrialButtonDisabled(false);
      setStartingTrial(false);
      setTrialButtonText("Try Again");
    }
  };

  // State for payment or trial status
  const [isPaidOrTrialing, setIsPaidOrTrialing] = useState(false);

  // Complete the onboarding process
  const handleFinishOnboarding = async () => {
    // Only allow completion if the user has started a trial or made a payment
    if (isPaidOrTrialing) {
      await finishOnboarding();
    }
  };

  return (
    <>
      <Header />

      <ProgressBar
        steps={["Welcome", "GitHub Token", "Ready"]}
        currentStep={currentStep}
      />

      <div className="steps-container">
        {currentStep === 1 && <WelcomeStep />}

        {currentStep === 2 && (
          <TokenStep
            showTokenInput={showTokenInput}
            setShowTokenInput={setShowTokenInput}
            githubToken={githubToken}
            setGithubToken={setGithubToken}
            validatingToken={validatingToken}
            validateToken={validateToken}
            tokenMessage={tokenMessage}
          />
        )}

        {currentStep === 3 && (
          <ReadyStep onPaymentStatusChange={setIsPaidOrTrialing} />
        )}
      </div>

      <NavigationControls
        currentStep={currentStep}
        totalSteps={3}
        onPrevious={goToPreviousStep}
        onNext={goToNextStep}
        onFinish={handleFinishOnboarding}
        isPaidOrTrialing={isPaidOrTrialing}
      />
    </>
  );
};

export default OnboardingPage;
