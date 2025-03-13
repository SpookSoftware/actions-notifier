<script lang="ts">
  const {
    onPrevious,
    onNext,
    onFinish,
    currentStep,
    totalSteps,
    isPaidOrTrialing,
  } = $props();

  const isLastStep = $derived(currentStep === totalSteps);
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
          disabled={!isPaidOrTrialing}
          title={!isPaidOrTrialing
            ? "Please start a trial or make a purchase to continue"
            : ""}
        >
          Get Started
        </button>

        {#if !isPaidOrTrialing}
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
