<script lang="ts">
  // Converted from React ReadyStep.tsx with runes
  import { openBuyPage, getPaymentStatus } from "@/services/payment";
  import {
    startFreeTrial as startFreeTrialService,
    startTrialStatusPolling
  } from "@/services/trial";
  
  // Payment status handling
  export let onPaymentStatusChange: (isPaidOrTrialing: boolean) => void = () => {};
  
  // State variables with runes
  let checkingStatus = $state(false);
  let paymentComplete = $state(false);
  let trialActivated = $state(false);
  
  // Status message states
  let showStatusMessage = $state(false);
  let statusMessage = $state("");
  
  // Reference to store cleanup function
  let pollingCleanup: (() => void) | null = $state(null);
  let safetyTimeoutId: ReturnType<typeof setTimeout> | null = $state(null);
  
  // Button states
  let isTrialLoading = $state(false);
  let trialButtonText = $state("Start Free Trial (no credit card required)");
  let isPurchaseLoading = $state(false);
  
  // Interval for polling
  let intervalId: ReturnType<typeof setInterval> | null = $state(null);
  
  // Start status polling for trial/purchase
  function startStatusPolling() {
    checkingStatus = true;
    
    // Set a safety timeout to reset the checking status if something goes wrong
    safetyTimeoutId = setTimeout(() => {
      checkingStatus = false;
      // Check status once more to see if trial/payment was actually completed
      getPaymentStatus().then((status) => {
        if (status.paid) {
          paymentComplete = true;
          showStatusMessage = true;
          statusMessage = "Thank you for your purchase! You have lifetime access to this extension.";
          onPaymentStatusChange(true);
        } else if (status.trialIsValid) {
          trialActivated = true;
          showStatusMessage = true;
          statusMessage = "Your 7-day free trial has been activated. Enjoy the extension!";
          onPaymentStatusChange(true);
        }
      });
    }, 10000);
    
    // Store cleanup function to use in the future
    pollingCleanup = startTrialStatusPolling(
      // On trial/purchase activated
      () => {
        if (safetyTimeoutId) {
          clearTimeout(safetyTimeoutId);
          safetyTimeoutId = null;
        }
        
        getPaymentStatus().then((status) => {
          if (status.paid) {
            paymentComplete = true;
            showStatusMessage = true;
            statusMessage = "Thank you for your purchase! You have lifetime access to this extension.";
            onPaymentStatusChange(true);
          } else if (status.trialIsValid) {
            trialActivated = true;
            showStatusMessage = true;
            statusMessage = "Your 7-day free trial has been activated. Enjoy the extension!";
            onPaymentStatusChange(true);
          }
          checkingStatus = false;
        });
      },
      // On trial pending
      (attempt, maxAttempts) => {
        // Just monitor attempts
      },
      // On error
      () => {
        if (safetyTimeoutId) {
          clearTimeout(safetyTimeoutId);
          safetyTimeoutId = null;
        }
        checkingStatus = false;
      }
    );
  }
  
  // Trial button handler
  async function handleStartTrial() {
    if (trialActivated) return;
    
    isTrialLoading = true;
    trialButtonText = "Starting Trial...";
    
    try {
      await startFreeTrialService();
      startStatusPolling();
    } catch (error) {
      console.error("Error starting trial:", error);
      trialButtonText = "Failed to Start Trial";
    } finally {
      isTrialLoading = false;
    }
  }
  
  // Purchase button handler
  async function handlePurchase() {
    isPurchaseLoading = true;
    try {
      await openBuyPage();
      startStatusPolling();
    } catch (error) {
      console.error("Error opening payment page:", error);
    } finally {
      isPurchaseLoading = false;
    }
  }
  
  // Check payment/trial status
  async function checkPaymentStatus() {
    try {
      const status = await getPaymentStatus();
      
      if (status.paid) {
        paymentComplete = true;
        showStatusMessage = true;
        statusMessage = "Thank you for your purchase! You have lifetime access to this extension.";
        onPaymentStatusChange(true);
        
        // If we've detected a successful payment, stop polling
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } else if (status.trialIsValid) {
        trialActivated = true;
        showStatusMessage = true;
        statusMessage = "Your 7-day free trial has been activated. Enjoy the extension!";
        onPaymentStatusChange(true);
        
        // If we've detected a successful trial activation, stop polling
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } else {
        onPaymentStatusChange(false);
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
      onPaymentStatusChange(false);
    }
  }
  
  // Setup initial check and polling
  $effect(() => {
    // Initial check
    checkPaymentStatus();
    
    // Set up polling with a more reasonable interval (3 seconds)
    intervalId = setInterval(checkPaymentStatus, 3000);
    
    // Clean up on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      
      if (safetyTimeoutId) {
        clearTimeout(safetyTimeoutId);
        safetyTimeoutId = null;
      }
      
      if (pollingCleanup) {
        pollingCleanup();
        pollingCleanup = null;
      }
    };
  });
</script>

<div class="step">
  <div class="step-number">3</div>
  <div class="step-content">
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
      style="margin: 20px 0; padding: 15px; background-color: #f8f4ff; border: 1px solid #ddd2f7; border-radius: 6px; border-left: 4px solid #6f42c1;"
    >
      {#if showStatusMessage}
        <div style="padding: 10px 0; color: #6f42c1;">
          <h3 style="margin-top: 0; color: #6f42c1;">
            {paymentComplete ? "💰 Purchase Complete" : "✅ Trial Activated"}
          </h3>
          <p>{statusMessage}</p>
        </div>
      {:else}
        <h3 style="margin-top: 0; color: #6f42c1;">
          💜 Free Trial Period
        </h3>
        <p>
          To use the extension, you need to sign up for a
          <b>
            <i>no-credit-card-required</i> 7-day free trial
          </b>
          . After the trial period, a one-time purchase is required to
          continue using the extension.
        </p>
        <p style="margin-bottom: 10px">
          <b>Price:</b> $2.95 (one-time payment, lifetime license)
        </p>
      {/if}

      {#if !paymentComplete}
        <div style="display: flex; gap: 10px; align-items: center">
          <!-- Trial Button -->
          <button
            class="btn btn-primary"
            on:click={handleStartTrial}
            disabled={isTrialLoading || trialActivated || checkingStatus}
          >
            {#if isTrialLoading}<span class="spinner"></span>{/if}
            {trialActivated ? "Trial Activated" : trialButtonText}
          </button>

          <!-- Purchase Button -->
          <button
            class="btn"
            on:click={handlePurchase}
            disabled={isPurchaseLoading || checkingStatus}
            style="background: #fff; border: 1px solid #6f42c1; color: #6f42c1;"
          >
            {#if isPurchaseLoading}<span class="spinner"></span>{/if}
            Buy Now ($2.95)
          </button>
        </div>
      {/if}

      {#if !trialActivated && !paymentComplete}
        <div style="margin-top: 15px; color: #e25822;">
          <p>
            <strong>
              * You must start a trial or make a purchase to complete
              onboarding.
            </strong>
          </p>
        </div>
      {/if}
    </div>

    <div class="help-text">
      <p>
        You can always update your token or manage active monitors from the
        extension popup.
      </p>
    </div>
  </div>
</div>