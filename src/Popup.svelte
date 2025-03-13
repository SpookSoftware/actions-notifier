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
  import browser from "webextension-polyfill";
  import {
    tokenState,
    alarmState,
    paymentState,
  } from "@/helpers/helpers.svelte";

  const extensionIsValid = $derived.by(() => {
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
    console.log("extension validity changed. Running effect.");
    browser.runtime
      .sendMessage({
        action: "extensionStateChanged",
        enabled: extensionIsValid.isValid,
      })
      .catch(console.error);
  });

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

  onMount(async () => {
    await tokenState.readTokenFromStorage();
    await tokenState.checkTokenValidity();
    await alarmState.getAlarmCount();
  });
</script>

<main class="popup">
  <Header />

  {#if tokenState.isCheckingValidity}
    <p>Checking if token is valid...</p>
  {:else if tokenState.valid}
    <p>Token is valid!</p>
  {:else}
    <p>Token is NOT valid!</p>
  {/if}

  {#if tokenState.isLoadingToken}
    <p>Reading token from storage...</p>
  {:else}
    <GitHubTokenForm token={tokenState.token} onSubmit={handleTokenSubmit} />
  {/if}

  {#if alarmState.isLoading}
    <p>Fetching alarms...</p>
  {:else}
    <MonitorsCount alarmCount={alarmState.alarmCount} />
  {/if}

  <EnabledStatus
    enabled={extensionIsValid.isValid}
    reason={extensionIsValid.reason}
  />

  {#await paymentState.initialize()}
    <LoadingSpinner />
  {:then { paid, trialExpired, trialExpirationDate, trialIsValid, trialNeverStarted }}
    {#if trialNeverStarted}
      <TrialNotStarted />
    {:else if trialExpired}
      <TrialExpired />
    {:else if paid}
      <PaidFor />
    {:else if trialIsValid}
      <TrialInProgress {trialExpirationDate} />
    {/if}
  {/await}
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
