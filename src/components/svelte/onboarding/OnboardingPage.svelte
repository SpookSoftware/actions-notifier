<script lang="ts">
  // Converted from React OnboardingPage.tsx using Svelte's runes
  import browser from "webextension-polyfill";
  import Header from "./Header.svelte";
  import WelcomeStep from "./WelcomeStep.svelte";
  import TokenStep from "./TokenStep.svelte";
  import ReadyStep from "./ReadyStep.svelte";
  import NavigationControls from "./NavigationControls.svelte";
  import ProgressBar from "./ProgressBar.svelte";
  import { validateGitHubToken } from "@/services/github";
  import { loadGitHubToken, saveGitHubToken } from "@/services/storage";
  import { finishOnboarding } from "@/services/trial";
  
  // State variables with runes
  let currentStep = $state(1);
  let tokenValidated = $state(false);
  let showTokenInput = $state(false);
  let githubToken = $state("");
  let validatingToken = $state(false);
  let tokenMessage = $state<{ type: "success" | "error"; text: string } | null>(null);
  let isPaidOrTrialing = $state(false);
  
  // Navigate to previous step
  function goToPreviousStep() {
    if (currentStep > 1) {
      currentStep--;
    }
  }
  
  // Navigate to next step
  async function goToNextStep() {
    // If on step 2 (token step) and token is not validated yet
    if (currentStep === 2 && !tokenValidated) {
      // If token input is visible with token entered but not validated
      if (showTokenInput && githubToken.trim()) {
        // Attempt to validate the token before proceeding
        validatingToken = true;
        tokenMessage = {
          type: "error",
          text: "Validating token...",
        };
        
        try {
          const isValid = await validateGitHubToken(githubToken);
          
          if (isValid) {
            // Success
            tokenValidated = true;
            tokenMessage = {
              type: "success",
              text: "✓ Token validated successfully!",
            };
            
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
              currentStep++;
            }
          } else {
            // Error
            tokenValidated = false;
            tokenMessage = {
              type: "error",
              text: '✖ Invalid token or insufficient permissions. Please ensure your token has the "repo" scope.',
            };
          }
        } catch (error) {
          console.error("Token validation error:", error);
          tokenMessage = {
            type: "error",
            text: `✖ Error: ${
              error instanceof Error ? error.message : "Network error"
            }`,
          };
        } finally {
          validatingToken = false;
        }
        return;
      }
      
      // If token input is visible but no token entered
      if (showTokenInput && !githubToken.trim()) {
        tokenMessage = {
          type: "error",
          text: "Please enter a token before continuing.",
        };
        return;
      }
      
      // If token input is not visible (user hasn't clicked "I already have a token")
      if (!showTokenInput) {
        tokenMessage = {
          type: "error",
          text: "Please create a token or enter an existing one before continuing.",
        };
        // Show the token input to guide the user
        showTokenInput = true;
        return;
      }
      
      // Don't proceed if token isn't validated
      return;
    }
    
    // Default behavior - go to next step
    if (currentStep < 3) {
      currentStep++;
    }
  }
  
  // Complete the onboarding process
  async function handleFinishOnboarding() {
    // Only allow completion if the user has started a trial or made a payment
    if (isPaidOrTrialing) {
      await finishOnboarding();
    }
  }
  
  // Check if a token already exists
  async function checkExistingToken() {
    try {
      const savedToken = await loadGitHubToken();
      
      if (savedToken) {
        // Test the existing token
        const isValid = await validateGitHubToken(savedToken);
        
        if (isValid) {
          // If valid, pre-fill and allow to skip token step
          githubToken = savedToken;
          tokenValidated = true;
          
          // Show success message and token input
          showTokenInput = true;
          tokenMessage = {
            type: "success",
            text: "✓ Existing token is valid! You can proceed.",
          };
        }
      }
    } catch (error) {
      console.error("Error checking existing token:", error);
    }
  }
  
  // On component mount, check for existing token
  $effect(() => {
    checkExistingToken();
  });
</script>

<div>
  <Header />
  
  <ProgressBar
    steps={["Welcome", "GitHub Token", "Ready"]}
    currentStep={currentStep}
  />
  
  <div class="steps-container">
    {#if currentStep === 1}
      <WelcomeStep />
    {/if}
    
    {#if currentStep === 2}
      <TokenStep
        bind:showTokenInput
        bind:githubToken
        bind:validatingToken
        bind:tokenValidated
        bind:tokenMessage
      />
    {/if}
    
    {#if currentStep === 3}
      <ReadyStep onPaymentStatusChange={(status) => isPaidOrTrialing = status} />
    {/if}
  </div>
  
  <NavigationControls
    {currentStep}
    totalSteps={3}
    onPrevious={goToPreviousStep}
    onNext={goToNextStep}
    onFinish={handleFinishOnboarding}
    {isPaidOrTrialing}
  />
</div>