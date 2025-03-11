<script lang="ts">
  import { onMount } from "svelte";
  import Header from "./components/svelte/popup/Header.svelte";
  import AuthStateMessage from "./components/svelte/popup/AuthStateMessage.svelte";
  import GitHubTokenForm from "./components/svelte/popup/GitHubTokenForm.svelte";
  import MonitorsCount from "./components/svelte/popup/MonitorsCount.svelte";
  import ExtensionToggle from "./components/svelte/popup/ExtensionToggle.svelte";
  import PaymentSection from "./components/svelte/popup/PaymentSection.svelte";
  import browser from "webextension-polyfill";
  import { PaymentStatus } from "./types";

  // State using Runes
  let token = $state("");
  let authState = $state<"success" | "warning" | "error" | null>(null);
  let tokenStatus = $state({ message: "", isValid: null as boolean | null });
  let isLoading = $state(false);
  let enabled = $state(true);
  let disabledReason = $state<string | undefined>(undefined);
  let alarmCount = $state(0);
  let paymentStatus = $state<PaymentStatus>({
    paid: false,
    trialStartedAt: null,
  });

  // Functions
  async function fetchToken() {
    try {
      const result = await browser.storage.local.get("githubToken");
      if (result.githubToken) {
        token = result.githubToken;
        validateToken(token);
      } else {
        authState = "warning";
      }
    } catch (error) {
      console.error("Error fetching token:", error);
    }
  }

  async function validateToken(currentToken: string) {
    if (!currentToken) {
      authState = "warning";
      return;
    }

    isLoading = true;
    tokenStatus = { message: "Validating token...", isValid: null };

    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${currentToken}`,
        },
      });

      if (response.ok) {
        tokenStatus = {
          message: "Token verified successfully!",
          isValid: true,
        };
        authState = "success";
        await browser.storage.local.set({ githubToken: currentToken });
      } else {
        tokenStatus = {
          message: `Token validation failed: ${response.statusText}`,
          isValid: false,
        };
        authState = "error";
      }
    } catch (error) {
      tokenStatus = {
        message: `Error validating token: ${error instanceof Error ? error.message : "Unknown error"}`,
        isValid: false,
      };
      authState = "error";
    } finally {
      isLoading = false;
    }
  }

  function handleTokenChange(newToken: string) {
    token = newToken;
  }

  async function handleTokenSubmit(e: SubmitEvent) {
    e.preventDefault();
    await validateToken(token);
  }

  async function fetchExtensionStatus() {
    try {
      const result = await browser.storage.local.get([
        "enabled",
        "disabledReason",
      ]);
      enabled = result.enabled !== false; // Default to true if not set
      disabledReason = result.disabledReason;
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
    fetchToken();
    fetchExtensionStatus();
    fetchMonitorCount();
    fetchPaymentStatus();
  });
</script>

<main class="popup">
  <Header />

  <AuthStateMessage {authState} />

  {#if authState !== "success"}
    <GitHubTokenForm
      {token}
      onTokenChange={handleTokenChange}
      onSubmit={handleTokenSubmit}
      {tokenStatus}
      {isLoading}
    />
  {/if}

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
