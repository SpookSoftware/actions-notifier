<script lang="ts">
  import { onMount } from "svelte";
  import Header from "./components/svelte/popup/Header.svelte";
  import AuthStateMessage from "./components/svelte/popup/AuthStateMessage.svelte";
  import GitHubTokenForm from "./components/svelte/popup/GitHubTokenForm.svelte";
  import MonitorsCount from "./components/svelte/popup/MonitorsCount.svelte";
  import ExtensionToggle from "./components/svelte/popup/ExtensionToggle.svelte";
  import PaymentSection from "./components/svelte/popup/PaymentSection.svelte";
  import browser from "webextension-polyfill";
  import { tokenState } from "@/helpers/helpers.svelte";

  let authState = $state<"success" | "warning" | "error" | null>(null);
  let isLoading = $state(false);
  let enabled = $state(true);
  let disabledReason = $state<string | undefined>(undefined);
  let alarmCount = $state(0);
  let paymentStatus = $state({
    paid: false,
    trialStartedAt: null,
    trialIsValid: false,
  });

  const extensionIsValid = $derived.by(() => {
    const hasToken = tokenState.token !== "";
    const paymentStatusIsValid =
      paymentStatus.paid || paymentStatus.trialIsValid;
    const tokenIsValid = authState === "success";
    const notTooManyAlarms = alarmCount < 50;
    return hasToken && paymentStatusIsValid && tokenIsValid && notTooManyAlarms;
  });

  // Whenever extension validity changes, notify the content script.
  $effect(() => {
    console.log("extension validity changed. Running effect.");
    browser.runtime
      .sendMessage({
        action: "extensionStateChanged",
        enabled: extensionIsValid,
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

  async function fetchMonitorCount() {
    try {
      const alarms = await browser.alarms.getAll();
      alarmCount = alarms.filter((alarm) =>
        alarm.name.startsWith("workflow-")
      ).length;
    } catch (error) {
      console.error("Error fetching alarms:", error);
    }
  }

  async function fetchPaymentStatus() {
    try {
      const result = await browser.storage.local.get([
        "paid",
        "trialStartedAt",
      ]);

      paymentStatus = {
        paid: result.paid === true,
        trialStartedAt: result.trialStartedAt
          ? new Date(result.trialStartedAt)
          : null,
      };
    } catch (error) {
      console.error("Error fetching payment status:", error);
    }
  }

  async function handlePaymentClick() {
    try {
      if (!paymentStatus.trialStartedAt) {
        // Start trial
        const now = new Date();
        await browser.storage.local.set({ trialStartedAt: now.toISOString() });

        // Update local state
        paymentStatus = {
          ...paymentStatus,
          trialStartedAt: now,
        };
      } else {
        // Handle actual payment
        // Implementation depends on your payment service
        console.log("Handle actual payment flow");
      }
    } catch (error) {
      console.error("Error handling payment:", error);
    }
  }

  // Lifecycle
  onMount(() => {
    fetchExtensionStatus();
    fetchMonitorCount();
    fetchPaymentStatus();
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

  <MonitorsCount {alarmCount} />

  <ExtensionToggle {enabled} reason={disabledReason} />

  <PaymentSection {paymentStatus} onPaymentClick={handlePaymentClick} />
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
