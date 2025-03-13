<script lang="ts">
  import { onMount } from "svelte";
  import browser from "webextension-polyfill";
  import Header from "./Header.svelte";
  import WelcomeStep from "./WelcomeStep.svelte";
  import TokenStep from "./TokenStep.svelte";
  import ReadyStep from "./ReadyStep.svelte";
  import NavigationControls from "./NavigationControls.svelte";
  import ProgressBar from "./ProgressBar.svelte";
  import { finishOnboarding } from "@/services/trial";

  import { tokenState, paymentState } from "@/helpers/helpers.svelte";

  let currentStep = $state(1);

  let isPaidOrTrialing = $derived(
    paymentState.paymentStatus.paid || paymentState.paymentStatus.trialIsValid
  );

  // Navigate to previous step
  function goToPreviousStep() {
    if (currentStep > 1) {
      currentStep--;
    }
  }

  async function handleTokenSubmit(e: SubmitEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const tokenInput = form.querySelector<HTMLInputElement>("input");
    if (tokenInput) {
      const submittedToken = tokenInput.value.trim();
      tokenState.token = submittedToken;
      await browser.storage.local.set({ githubToken: tokenState.token });
    }
  }

  // Navigate to next step
  async function goToNextStep() {
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

  onMount(async () => {
    await tokenState.readTokenFromStorage();
    await paymentState.initialize();
  });
</script>

<div>
  <Header />

  <ProgressBar steps={["Welcome", "GitHub Token", "Ready"]} {currentStep} />

  <div class="steps-container">
    {#if currentStep === 1}
      <WelcomeStep />
    {/if}

    {#if currentStep === 2}
      <TokenStep {handleTokenSubmit} {tokenState} />
    {/if}

    {#if currentStep === 3}
      <ReadyStep
        onPaymentStatusChange={(status) => (isPaidOrTrialing = status)}
      />
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
