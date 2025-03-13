<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import browser from "webextension-polyfill";
  import Header from "./Header.svelte";
  import WelcomeStep from "./WelcomeStep.svelte";
  import TokenStep from "./TokenStep.svelte";
  import PaymentStep from "./PaymentStep.svelte";
  import ReadyStep from "./ReadyStep.svelte";
  import NavigationControls from "./NavigationControls.svelte";
  import ProgressBar from "./ProgressBar.svelte";
  import { finishOnboarding } from "@/services/trial";
  import ExtPay from "extpay";
  const extpay = ExtPay("cicd-workflow-notifications");

  import { tokenState, paymentState } from "@/helpers/helpers.svelte";

  let currentStep = $state(1);

  let isPaidOrTrialing = $derived(
    paymentState.paymentStatus.paid || paymentState.paymentStatus.trialIsValid
  );

  function goToPreviousStep() {
    if (currentStep > 1) {
      currentStep--;
    }
  }
  async function goToNextStep() {
    if (currentStep < 4) {
      currentStep++;
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

  async function handleFinishOnboarding() {
    if (isPaidOrTrialing) {
      await finishOnboarding();
    }
  }

  let pollingInterval: ReturnType<typeof setInterval>;

  onMount(async () => {
    await Promise.all([
      tokenState.readTokenFromStorage(),
      paymentState.initialize(),
    ]);
    await tokenState.checkTokenValidity();

    // Start polling for payment status
    let pollCount = 0;
    const maxPolls = 300; // 5 minutes × 60 seconds = 300 polls at 1-second intervals

    pollingInterval = setInterval(async () => {
      await paymentState.initialize();
      pollCount++;

      // If payment is confirmed or we've reached the maximum polling time, stop polling
      if (
        paymentState.paymentStatus.paid ||
        paymentState.paymentStatus.trialIsValid ||
        pollCount >= maxPolls
      ) {
        clearInterval(pollingInterval);
      }
    }, 1000); // Poll every 1 second
  });

  onDestroy(() => {
    clearInterval(pollingInterval);
  });
</script>

<div>
  <Header />

  <ProgressBar
    steps={["Welcome", "GitHub Token", "Trial or Payment", "Ready"]}
    {currentStep}
  />

  <div class="steps-container">
    {#if currentStep === 1}
      <WelcomeStep />
    {/if}

    {#if currentStep === 2}
      <TokenStep {handleTokenSubmit} {tokenState} />
    {/if}

    {#if currentStep === 3}
      <PaymentStep
        {paymentState}
        {isPaidOrTrialing}
        onPay={() => extpay.openPaymentPage()}
        onStartTrial={() => extpay.openTrialPage()}
      />
    {/if}

    {#if currentStep === 4}
      <ReadyStep />
    {/if}
  </div>

  <NavigationControls
    {currentStep}
    totalSteps={4}
    onPrevious={goToPreviousStep}
    onNext={goToNextStep}
    onFinish={handleFinishOnboarding}
    {isPaidOrTrialing}
    tokenIsValid={tokenState.valid}
  />
</div>
