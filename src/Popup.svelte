<script lang="ts">
  import { onMount } from "svelte";
  import Header from "@/components/svelte/popup/Header.svelte";
  import GitHubTokenForm from "@/components/svelte/popup/GitHubTokenForm.svelte";
  import MonitorsCount from "@/components/svelte/popup/MonitorsCount.svelte";
  import EnabledStatus from "@/components/svelte/popup/EnabledStatus.svelte";
  import LoadingSpinner from "@/components/svelte/shared/LoadingSpinner.svelte";
  import TrialNotStarted from "@/components/svelte/popup/TrialNotStarted.svelte";
  import TrialExpired from "@/components/svelte/popup/TrialExpired.svelte";
  import PaidFor from "@/components/svelte/popup/PaidFor.svelte";
  import TrialInProgress from "@/components/svelte/popup/TrialInProgress.svelte";
  // skeletons
  import TokenStatusSkeleton from "@/components/svelte/skeletons/TokenStatusSkeleton.svelte";
  import MonitorsCountSkeleton from "@/components/svelte/skeletons/MonitorsCountSkeleton.svelte";
  import EnabledStatusSkeleton from "@/components/svelte/skeletons/EnabledStatusSkeleton.svelte";
  import PaymentStatusSkeleton from "@/components/svelte/skeletons/PaymentStatusSkeleton.svelte";
  import browser from "webextension-polyfill";
  import {
    tokenState,
    alarmState,
    paymentState,
  } from "@/helpers/helpers.svelte";

  // We want to avoid sending an update to the browser if the extension state is still loading.
  let isInitializing = $state(true);

  const extensionIsValid = $derived.by(() => {
    if (isInitializing) {
      return { isValid: undefined, reason: "initializing" };
    }
    const hasToken = tokenState.token !== "";
    const paymentStatusIsValid =
      paymentState.paymentStatus.paid ||
      paymentState.paymentStatus.trialIsValid;
    const tokenIsValid = tokenState.valid;
    const notTooManyAlarms = alarmState.alarmCount < 500;

    let reason = "";
    if (!hasToken) reason = "no token";
    if (!paymentStatusIsValid) reason = "payment status invalid";
    if (!tokenIsValid) reason = "token invalid";
    if (!notTooManyAlarms) reason = "too many alarms";
    return {
      isValid:
        hasToken && paymentStatusIsValid && tokenIsValid && notTooManyAlarms,
      reason,
    };
  });

  // Whenever extension validity changes, notify the content script.
  $effect(() => {
    // Skip the effect while we're still initializing
    if (isInitializing || extensionIsValid.isValid === undefined) {
      console.debug("Skipping effect because initializing");
      return;
    }
    console.log("extension validity changed. Running effect.");
    browser.storage.sync.set({ extensionIsEnabled: extensionIsValid.isValid });
  });

  onMount(async () => {
    await Promise.all([
      tokenState.readTokenFromStorage(),
      alarmState.getAlarmCount(),
      paymentState.initialize(),
    ]);
    // Comes after because we can't check token validity until we have the token.
    await tokenState.checkTokenValidity();
    isInitializing = false;
  });

  async function handleTokenSubmit(e: SubmitEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const tokenInput = form.querySelector<HTMLInputElement>("input");
    if (tokenInput) {
      const submittedToken = tokenInput.value.trim();
      tokenState.token = submittedToken;
      await browser.storage.sync.set({ githubToken: tokenState.token });
    }
  }
</script>

<main class="popup">
  <Header />

  <!-- Token section with skeleton -->
  {#if tokenState.isLoadingToken || tokenState.isCheckingValidity || isInitializing}
    <TokenStatusSkeleton />
  {:else}
    <p>{tokenState.valid ? "Token is valid!" : "Token is NOT valid!"}</p>
    <GitHubTokenForm token={tokenState.token} onSubmit={handleTokenSubmit} />
  {/if}

  <!-- Monitors count section with skeleton -->
  {#if alarmState.isLoading || isInitializing}
    <MonitorsCountSkeleton />
  {:else}
    <MonitorsCount alarmCount={alarmState.alarmCount} />
  {/if}

  <!-- Extension status section with skeleton -->
  {#if isInitializing}
    <EnabledStatusSkeleton />
  {:else}
    <EnabledStatus
      enabled={extensionIsValid.isValid}
      reason={extensionIsValid.reason}
    />
  {/if}

  <!-- Payment status section with skeleton -->
  {#if paymentState.isLoading || isInitializing}
    <PaymentStatusSkeleton />
  {:else if paymentState.paymentStatus.trialNeverStarted}
    <TrialNotStarted />
  {:else if paymentState.paymentStatus.trialExpired}
    <TrialExpired />
  {:else if paymentState.paymentStatus.paid}
    <PaidFor />
  {:else if paymentState.paymentStatus.trialIsValid}
    <TrialInProgress
      trialExpirationDate={paymentState.paymentStatus.trialExpirationDate}
    />
  {/if}
</main>

<style>
  .popup {
    min-width: 350px;
    max-width: 400px;
    padding: 16px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial,
      sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #24292e;
  }
</style>
