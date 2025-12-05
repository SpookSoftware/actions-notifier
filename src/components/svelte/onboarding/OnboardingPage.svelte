<script lang="ts">
  import { onMount } from "svelte";
  import browser from "webextension-polyfill";
  import Header from "./Header.svelte";
  import WelcomeStep from "./WelcomeStep.svelte";
  import TokenStep from "./TokenStep.svelte";
  import OrganizationAuthStep from "./OrganizationAuthStep.svelte";
  import ReadyStep from "./ReadyStep.svelte";
  import NavigationControls from "./NavigationControls.svelte";
  import ProgressBar from "./ProgressBar.svelte";
  import { setExtensionEnabled } from "@/helpers/browser";

  import { tokenState } from "@/helpers/helpers.svelte";

  // Get initial step from URL or default to 1
  const urlParams = new URLSearchParams(window.location.search);
  const initialStep = parseInt(urlParams.get("step") || "1", 10);
  let currentStep = $state(Math.min(Math.max(initialStep, 1), 4)); // Ensure step is between 1 and 4

  // Update URL when step changes
  function updateUrlWithStep(step: number) {
    const url = new URL(window.location.href);
    url.searchParams.set("step", step.toString());
    window.history.pushState({ step }, "", url.toString());
  }

  // Handle browser back/forward navigation
  function handlePopState(event: PopStateEvent) {
    const urlParams = new URLSearchParams(window.location.search);
    const step = parseInt(urlParams.get("step") || "1", 10);
    currentStep = Math.min(Math.max(step, 1), 4);
  }

  onMount(() => {
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  });

  const extensionIsValid = $derived.by(() => {
    const hasToken = tokenState.token !== "";
    const tokenIsValid = tokenState.valid;

    let reason = "";
    if (!hasToken) reason = "no token";
    if (!tokenIsValid) reason = "token invalid";
    return {
      isValid: hasToken && tokenIsValid,
      reason,
    };
  });

  function goToPreviousStep() {
    if (currentStep > 1) {
      currentStep--;
      updateUrlWithStep(currentStep);
    }
  }

  async function goToNextStep() {
    if (currentStep < 4) {
      currentStep++;
      updateUrlWithStep(currentStep);
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

      // Auto-advance to organization auth step when token is valid
      if (tokenState.valid) {
        setTimeout(() => {
          currentStep = 3; // Go directly to organization auth step
          updateUrlWithStep(currentStep);
        }, 1000);
      }
    }
  }

  async function handleFinishOnboarding() {
    if (extensionIsValid) {
      try {
        await setExtensionEnabled(true);
      } catch (error) {
        console.error("Error finishing onboarding:", error);
        throw error;
      }
    }
  }

  onMount(async () => {
    await setExtensionEnabled(false, "Didn't complete onboarding");

    await tokenState.readTokenFromStorage();
    await tokenState.checkTokenValidity();
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
    steps={["Welcome", "GitHub Token", "Organization Access", "Ready"]}
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
      <ReadyStep />
    {/if}
  </div>

  <NavigationControls
    {currentStep}
    totalSteps={4}
    onPrevious={goToPreviousStep}
    onNext={goToNextStep}
    onFinish={handleFinishOnboarding}
    tokenIsValid={tokenState.valid}
  />
</div>
