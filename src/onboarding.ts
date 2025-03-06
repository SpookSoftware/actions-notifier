import browser from "webextension-polyfill";
import ExtPay from "extpay";

// Initialize ExtPay
const extpay = ExtPay("cicd-workflow-notifications");

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const step1Element = document.getElementById("step-1");
  const step2Element = document.getElementById("step-2");
  const step3Element = document.getElementById("step-3");

  const prevBtn = document.getElementById("prev-btn") as HTMLButtonElement;
  const nextBtn = document.getElementById("next-btn") as HTMLButtonElement;
  const finishBtn = document.getElementById("finish-btn") as HTMLButtonElement;
  const startTrialBtn = document.getElementById(
    "start-trial-btn"
  ) as HTMLButtonElement;

  const existingTokenBtn = document.getElementById(
    "existing-token-btn"
  ) as HTMLButtonElement;
  const tokenInputContainer = document.getElementById("token-input-container");
  const githubTokenInput = document.getElementById(
    "github-token"
  ) as HTMLInputElement;
  const validateTokenBtn = document.getElementById(
    "validate-token-btn"
  ) as HTMLButtonElement;
  const validateSpinner = document.getElementById("validate-spinner");
  const tokenSuccess = document.getElementById("token-success");
  const tokenError = document.getElementById("token-error");

  // Progress markers
  const progressMarkers = document.querySelectorAll(".step-marker");

  // Current step tracking
  let currentStep = 1;
  let tokenValidated = false;

  // Initialize
  updateStepVisibility();

  // Event Listeners
  prevBtn.addEventListener("click", goToPreviousStep);
  nextBtn.addEventListener("click", goToNextStep);
  finishBtn.addEventListener("click", finishOnboarding);
  existingTokenBtn.addEventListener("click", showTokenInput);
  validateTokenBtn.addEventListener("click", validateToken);
  startTrialBtn.addEventListener("click", startFreeTrial);

  // Check if token already exists (for users reinstalling)
  checkExistingToken();

  /**
   * Go to the previous step in the onboarding flow
   */
  function goToPreviousStep(): void {
    if (currentStep > 1) {
      currentStep--;
      updateStepVisibility();
    }
  }

  /**
   * Go to the next step in the onboarding flow
   */
  function goToNextStep(): void {
    // If on step 2 (token step), require validation before proceeding
    if (currentStep === 2 && !tokenValidated && !isTokenInputHidden()) {
      // Show validation message if they try to proceed without validating
      showMessage(tokenError, "Please validate your token before continuing.");
      return;
    }

    if (currentStep < 3) {
      currentStep++;
      updateStepVisibility();
    }
  }

  /**
   * Update the visibility of steps and controls based on current step
   */
  function updateStepVisibility(): void {
    // Hide all steps
    [step1Element, step2Element, step3Element].forEach((el) => {
      if (el) el.classList.add("hidden");
    });

    // Show current step
    const currentStepElement = document.getElementById(`step-${currentStep}`);
    if (currentStepElement) currentStepElement.classList.remove("hidden");

    // Update buttons
    prevBtn.classList.toggle("hidden", currentStep === 1);
    nextBtn.classList.toggle("hidden", currentStep === 3);
    finishBtn.classList.toggle("hidden", currentStep !== 3);

    // Update progress markers
    progressMarkers.forEach((marker, index) => {
      const stepNum = index + 1;
      marker.classList.remove("active", "completed");

      if (stepNum === currentStep) {
        marker.classList.add("active");
      } else if (stepNum < currentStep) {
        marker.classList.add("completed");
        // Replace number with checkmark for completed steps
        marker.innerHTML = "✓";
      } else {
        // Reset to number
        marker.innerHTML = stepNum.toString();
      }
    });
  }

  /**
   * Show the token input field
   */
  function showTokenInput(): void {
    if (tokenInputContainer) {
      tokenInputContainer.classList.remove("hidden");
      if (githubTokenInput) githubTokenInput.focus();
    }
  }

  /**
   * Check if token input section is hidden
   */
  function isTokenInputHidden(): boolean {
    return tokenInputContainer
      ? tokenInputContainer.classList.contains("hidden")
      : true;
  }

  /**
   * Validate the GitHub token
   */
  async function validateToken(): Promise<void> {
    const token = githubTokenInput.value.trim();

    if (!token) {
      showMessage(tokenError, "Please enter a token.");
      return;
    }

    try {
      // Show loading state
      validateSpinner?.classList.remove("hidden");
      validateTokenBtn.disabled = true;
      hideMessages();

      // Make API request to validate token
      const isValid = await testGitHubToken(token);

      if (isValid) {
        // Success
        tokenValidated = true;
        showMessage(tokenSuccess, "✓ Token validated successfully!");

        // Save token
        await browser.storage.sync.set({ githubToken: token });

        // Auto-advance after a short delay
        setTimeout(() => {
          if (currentStep === 2) {
            goToNextStep();
          }
        }, 1500);
      } else {
        // Error
        tokenValidated = false;
        showMessage(
          tokenError,
          '✖ Invalid token or insufficient permissions. Please ensure your token has the "repo" scope.'
        );
      }
    } catch (error) {
      console.error("Token validation error:", error);
      showMessage(
        tokenError,
        `✖ Error: ${error instanceof Error ? error.message : "Network error"}`
      );
    } finally {
      // Reset loading state
      validateSpinner?.classList.add("hidden");
      validateTokenBtn.disabled = false;
    }
  }

  /**
   * Test if a GitHub token is valid and has correct permissions
   */
  async function testGitHubToken(token: string): Promise<boolean> {
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
  }

  /**
   * Display a message in one of the feedback elements
   */
  function showMessage(element: HTMLElement | null, message: string): void {
    if (!element) return;

    element.textContent = message;
    element.style.display = "block";
  }

  /**
   * Hide all feedback messages
   */
  function hideMessages(): void {
    if (tokenSuccess) tokenSuccess.style.display = "none";
    if (tokenError) tokenError.style.display = "none";
  }

  /**
   * Check if a token already exists (for returning users)
   */
  async function checkExistingToken(): Promise<void> {
    try {
      const data = await browser.storage.sync.get("githubToken");

      if (typeof data.githubToken === "string") {
        // Test the existing token
        const isValid = await testGitHubToken(data.githubToken);

        if (isValid) {
          // If valid, pre-fill and allow to skip token step
          if (githubTokenInput) {
            githubTokenInput.value = data.githubToken;
            tokenValidated = true;

            // Show success message and token input
            showTokenInput();
            showMessage(
              tokenSuccess,
              "✓ Existing token is valid! You can proceed."
            );
          }
        }
      }
    } catch (error) {
      console.error("Error checking existing token:", error);
    }
  }

  /**
   * Complete the onboarding process
   */
  async function finishOnboarding(): Promise<void> {
    try {
      // Mark onboarding as completed
      await browser.storage.local.set({ hasCompletedOnboarding: true });

      // Close the tab or redirect to GitHub
      window.location.href = "https://github.com";
    } catch (error) {
      console.error("Error finishing onboarding:", error);
    }
  }

  function trialIsValid(trialStart: Date | null): boolean {
    if (!trialStart) {
      return false;
    }
    const trialStartedLessThanSevenDaysAgo =
      Date.now() - trialStart.getTime() <= 7 * 24 * 60 * 60 * 1000;
    return trialStartedLessThanSevenDaysAgo;
  }

  /**
   * Start the free trial
   */
  async function startFreeTrial(): Promise<void> {
    try {
      // Disable button and show loading state
      startTrialBtn.disabled = true;
      startTrialBtn.innerHTML = `<span class="spinner"></span> Starting trial...`;

      // Get user status
      const user = await extpay.getUser();

      // If trial already started, show message
      if (trialIsValid(user.trialStartedAt)) {
        startTrialBtn.innerHTML = "✓ Trial already activated";
        setTimeout(() => {
          startTrialBtn.innerHTML = "Trial Active";
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
      startTrialBtn.disabled = false;
      startTrialBtn.innerHTML = "Try Again";
    }
  }

  /**
   * Poll for trial status and update the button accordingly
   */
  function startTrialStatusPolling(): void {
    // Initial delay before first check (3 seconds)
    setTimeout(async () => {
      let attempts = 0;
      const maxAttempts = 100; // Stop after ~5 minutes (100 * 3 seconds)

      const checkTrialStatus = async () => {
        try {
          const user = await extpay.getUser();

          if (trialIsValid(user.trialStartedAt)) {
            // Trial activated successfully
            startTrialBtn.disabled = true;
            startTrialBtn.innerHTML = "✓ Trial activated!";
            setTimeout(() => {
              startTrialBtn.innerHTML = "Trial Active";
            }, 2000);
            return true; // Stop polling
          }

          // Continue checking if max attempts not reached
          attempts++;
          if (attempts >= maxAttempts) {
            // Max attempts reached, reset button state
            startTrialBtn.disabled = false;
            startTrialBtn.innerHTML = "Start Free Trial";
            return true; // Stop polling
          }

          return false; // Continue polling
        } catch (error) {
          console.error("Error checking trial status:", error);

          // Reset button after error
          startTrialBtn.disabled = false;
          startTrialBtn.innerHTML = "Start Free Trial";
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
  }
});
