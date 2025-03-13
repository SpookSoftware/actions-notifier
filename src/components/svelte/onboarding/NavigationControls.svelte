<script lang="ts">
  // Converted from React NavigationControls.tsx with runes
  import { getPaymentStatus } from "@/services/payment";

  const { onPrevious, onNext, onFinish } = $props();

  let currentStep = $state(1);
  let totalSteps = $state(3);
  // Pass in value from outside, but fall back to our own check if not provided

  let internalPaidStatus = $state(false);
  let intervalId: ReturnType<typeof setInterval> | null = $state(null);

  let isPaidOrTrialing = $state(false);

  // Derived value using effect values
  const effectivePaidStatus = $derived(
    isPaidOrTrialing !== undefined ? isPaidOrTrialing : internalPaidStatus
  );

  const isLastStep = $derived(currentStep === totalSteps);

  // Check payment status function
  async function checkPaymentStatus() {
    try {
      const status = await getPaymentStatus();
      internalPaidStatus = status.paid || status.trialIsValid;
    } catch (error) {
      console.error("Error checking payment status:", error);
      internalPaidStatus = false;
    }
  }

  // Run when currentStep changes
  $effect(() => {
    if (currentStep === totalSteps && isPaidOrTrialing === undefined) {
      checkPaymentStatus();
    }
  });

  // Setup polling when on last step
  $effect(() => {
    // Clean up previous interval if it exists
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    // Only run our own check if no external status is provided
    if (currentStep === totalSteps && isPaidOrTrialing === undefined) {
      // Initial check
      checkPaymentStatus();

      // Set up polling to check every second
      intervalId = setInterval(checkPaymentStatus, 1000);
    }

    // Clean up when component is destroyed
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  });
</script>

<div class="controls">
  <div class="buttons-container">
    {#if currentStep > 1}
      <button class="btn btn-secondary" onclick={onPrevious}> Previous </button>
    {/if}

    {#if currentStep < totalSteps}
      <button class="btn btn-primary" onclick={onNext}> Next </button>
    {/if}

    {#if isLastStep}
      <div style="position: relative">
        <button
          class="btn btn-primary"
          onclick={onFinish}
          disabled={!effectivePaidStatus}
          title={!effectivePaidStatus
            ? "Please start a trial or make a purchase to continue"
            : ""}
        >
          Get Started
        </button>

        {#if !effectivePaidStatus}
          <div
            style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); background-color: #e25822; color: white; padding: 3px 8px; border-radius: 4px; font-size: 12px; white-space: nowrap"
          >
            Start trial or buy first
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
