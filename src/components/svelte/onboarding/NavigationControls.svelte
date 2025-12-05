<script lang="ts">
  import ExternalLinkIcon from "@/components/svelte/shared/ExternalLinkIcon.svelte";

  const {
    onPrevious,
    onNext,
    onFinish,
    currentStep,
    totalSteps,
    tokenIsValid,
  } = $props();

  const isLastStep = $derived(currentStep === totalSteps);
</script>

<div class="controls">
  <div class="buttons-container">
    {#if currentStep > 1}
      <button class="btn btn-secondary" onclick={onPrevious}> Previous </button>
    {/if}

    {#if currentStep === 2}
      {#if !tokenIsValid}
        <button
          class="btn btn-primary"
          disabled
          title="Please ensure you have a valid token to continue"
        >
          Please ensure you have a valid token to continue
        </button>
      {:else}
        <button class="btn btn-primary" onclick={onNext}> Next </button>
      {/if}
    {/if}

    {#if currentStep !== 2 && !isLastStep}
      <button class="btn btn-primary" onclick={onNext}> Next </button>
    {/if}

    {#if isLastStep}
      <a
        href="https://github.com"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-primary"
        onclick={onFinish}
      >
        Finish
        <ExternalLinkIcon />
      </a>
    {/if}
  </div>
</div>

<style>
  .controls {
    margin-top: 2rem;
    display: flex;
    justify-content: flex-end;
  }

  .buttons-container {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .btn {
    display: inline-block;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-weight: 500;
    font-size: 0.9rem;
    cursor: pointer;
    text-decoration: none;
    border: 1px solid transparent;
  }

  .btn-primary {
    background-color: var(--github-green);
    color: white;
    border: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .btn-primary:hover {
    background-color: #2c974b;
  }

  .btn-secondary {
    background-color: white;
    color: var(--github-text);
    border-color: var(--github-border);
  }

  .btn-secondary:hover {
    background-color: var(--github-bg);
  }

  .btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    background-color: #e1e4e8 !important;
    color: #6a737d !important;
    border-color: #d1d5da !important;
    box-shadow: none !important;
    text-shadow: none !important;
    pointer-events: none;
  }
</style>
