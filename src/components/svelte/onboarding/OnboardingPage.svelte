<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import browser from "webextension-polyfill";
  import Header from "./Header.svelte";
  import WelcomeStep from "./WelcomeStep.svelte";
  import TokenStep from "./TokenStep.svelte";
  import OrganizationAuthStep from "./OrganizationAuthStep.svelte";
  import PaymentStep from "./PaymentStep.svelte";
  import ReadyStep from "./ReadyStep.svelte";
  import NavigationControls from "./NavigationControls.svelte";
  import ProgressBar from "./ProgressBar.svelte";
  import { setExtensionEnabled } from "@/helpers/browser";
  import { EXTPAY_ID } from "@constants";
  import ExtPay from "extpay";

  const extpay = ExtPay(EXTPAY_ID);

  import { tokenState, paymentState } from "@/helpers/helpers.svelte";

  let currentStep = $state(1);

  let isPaidOrTrialing = $derived(
    paymentState.paymentStatus.paid || paymentState.paymentStatus.trialIsValid
  );

  const extensionIsValid = $derived.by(() => {
    const hasToken = tokenState.token !== "";
    const paymentStatusIsValid =
      paymentState.paymentStatus.paid ||
      paymentState.paymentStatus.trialIsValid;
    const tokenIsValid = tokenState.valid;

    let reason = "";
    if (!hasToken) reason = "no token";
    if (!paymentStatusIsValid) reason = "payment status invalid";
    if (!tokenIsValid) reason = "token invalid";
    return {
      isValid: hasToken && paymentStatusIsValid && tokenIsValid,
      reason,
    };
  });

  function goToPreviousStep() {
    if (currentStep > 1) {
      currentStep--;
    }
  }

  async function goToNextStep() {
    if (currentStep < 5) {
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
      await browser.storage.sync.set({ githubToken: tokenState.token });

      // Auto-advance to next step when token is valid
      if (tokenState.valid) {
        setTimeout(() => {
          currentStep++;
        }, 1000);
      }
    }
  }

  async function handleFinishOnboarding() {
    if (extensionIsValid) {
      try {
        await setExtensionEnabled(true);

        window.location.href = "https://github.com";
      } catch (error) {
        console.error("Error finishing onboarding:", error);
        throw error;
      }
    }
  }

  let pollingInterval: ReturnType<typeof setInterval>;

  onMount(async () => {
    await setExtensionEnabled(false, "Didn't complete onboarding");

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

  $effect(() => {
    console.log(
      "extension validity changed. Running effect (inside OnboardingPage)"
    );
    if (!extensionIsValid.isValid) {
      setExtensionEnabled(extensionIsValid.isValid, extensionIsValid.reason);
    } else setExtensionEnabled(extensionIsValid.isValid);
  });
</script>

<div>
  <Header />

  <ProgressBar
    steps={[
      "Welcome",
      "GitHub Token",
      "Organization Access",
      "Try or Payment",
      "Ready",
    ]}
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
      <OrganizationAuthStep token={tokenState.token} />
    {/if}

    {#if currentStep === 4}
      <PaymentStep
        {paymentState}
        {isPaidOrTrialing}
        onPay={() => extpay.openPaymentPage()}
        onStartTrial={() => extpay.openTrialPage()}
      />
    {/if}

    {#if currentStep === 5}
      <ReadyStep />
    {/if}
  </div>

  <NavigationControls
    {currentStep}
    totalSteps={5}
    onPrevious={goToPreviousStep}
    onNext={goToNextStep}
    onFinish={handleFinishOnboarding}
    {isPaidOrTrialing}
    tokenIsValid={tokenState.valid}
  />
</div>
