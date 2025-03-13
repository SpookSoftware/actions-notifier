<script lang="ts">
  import { onMount } from "svelte";
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

  onMount(async () => {
    await Promise.all([
      tokenState.readTokenFromStorage(),
      paymentState.initialize(),
    ]);
    await tokenState.checkTokenValidity();
  });
</script>

<div>
  <Header />

  <ProgressBar
    steps={["Welcome", "GitHub Token", "Payment or Trial", "Ready"]}
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
