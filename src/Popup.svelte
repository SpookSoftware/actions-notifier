<script lang="ts">
  import { onMount } from "svelte";
  import Header from "@/components/svelte/popup/Header.svelte";
  import GitHubTokenForm from "@/components/svelte/popup/GitHubTokenForm.svelte";
  import MonitorsCount from "@/components/svelte/popup/MonitorsCount.svelte";
  import EnabledStatus from "@/components/svelte/popup/EnabledStatus.svelte";
  import PaymentSection from "@/components/svelte/popup/PaymentSection.svelte";
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

  let isLoading = $state(false);
  let enabled = $state(true);
  let disabledReason = $state<string | undefined>(undefined);

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
    const submittedToken = e?.currentTarget?.elements.githubToken.value;

    tokenState.token = submittedToken;
    await browser.storage.local.set({ githubToken: tokenState.token });
  }

  async function fetchExtensionStatus() {
    try {
      const result = await browser.storage.local.get([
        "enabled",
        "disabledReason",
      ]);
      enabled = result.enabled !== false; // Default to true if not set
      disabledReason = String(result.disabledReason);
    } catch (error) {
      console.error("Error fetching extension status:", error);
    }
  }

  // Lifecycle
  onMount(() => {
    fetchExtensionStatus();
  });
</script>

<main class="popup">
  <Header />

  <!-- This checks token validity on every render. Is there a way to only check validity if the token changes? -->
  {#await tokenState.checkTokenValidity()}
    <p>Checking if token is valid...</p>
  {:then isValid}
    {#if isValid}
      <p>Token is valid!</p>
    {:else}
      <p>Token is NOT valid!</p>
    {/if}
  {:catch error}
    <p>Error checking token validity: {error.message}</p>
  {/await}

  {#await tokenState.readTokenFromStorage()}
    <p>Reading token from storage...</p>
  {:then token}
    <GitHubTokenForm {token} onSubmit={handleTokenSubmit} {isLoading} />
  {/await}

  <!-- Note that this gets alarms on component mount and then never again. So we're re-getting the alarms every time the user opens the popup -->
  {#await alarmState.getAlarmCount()}
    <p>Fetching alarm count...</p>
  {:then alarmCount}
    <MonitorsCount {alarmCount} />
  {/await}

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
