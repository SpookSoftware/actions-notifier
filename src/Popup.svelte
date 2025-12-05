<script lang="ts">
  import { onMount } from "svelte";
  import Header from "@/components/svelte/popup/Header.svelte";
  import GitHubTokenForm from "@/components/svelte/popup/GitHubTokenForm.svelte";
  import MonitorsCount from "@/components/svelte/popup/MonitorsCount.svelte";
  import EnabledStatus from "@/components/svelte/popup/EnabledStatus.svelte";
  // skeletons
  import TokenStatusSkeleton from "@/components/svelte/skeletons/TokenStatusSkeleton.svelte";
  import MonitorsCountSkeleton from "@/components/svelte/skeletons/MonitorsCountSkeleton.svelte";
  import EnabledStatusSkeleton from "@/components/svelte/skeletons/EnabledStatusSkeleton.svelte";
  import browser from "webextension-polyfill";
  import { tokenState, alarmState } from "@/helpers/helpers.svelte";
  import { setExtensionEnabled } from "./helpers/browser";
  import { MAX_ALARMS } from "@constants";

  // We want to avoid sending an update to the browser if the extension state is still loading.
  let isInitializing = $state(true);

  const extensionIsValid = $derived.by(() => {
    if (isInitializing) {
      return { isValid: undefined, reason: "initializing" };
    }
    const hasToken = tokenState.token !== "";
    const tokenIsValid = tokenState.valid;
    const notTooManyAlarms = alarmState.alarmCount < MAX_ALARMS;

    let reason = "";
    if (!hasToken) reason = "no token";
    if (!tokenIsValid) reason = "token invalid";
    if (!notTooManyAlarms) reason = "too many alarms";
    return {
      isValid: hasToken && tokenIsValid && notTooManyAlarms,
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
    console.log("extension validity changed. Running effect (inside popup)");

    let userFriendlyReason = "";
    if (!extensionIsValid.isValid) {
      switch (extensionIsValid.reason) {
        case "no token":
          userFriendlyReason =
            "No token. Please add a GitHub token in the extension settings";
          break;
        case "token invalid":
          userFriendlyReason =
            "Your GitHub token is invalid or expired. Please open the extension settings and enter a valid token.";
          break;
        case "too many alarms":
          userFriendlyReason = `You've reached the maximum limit of ${alarmState.alarmCount}/${MAX_ALARMS} active monitors. Please clear all monitors from the extension settings or wait a few minutes for monitors to clear.`;
          break;
        default:
          userFriendlyReason = "The extension encountered an unknown issue";
      }
    }

    if (!extensionIsValid.isValid) {
      setExtensionEnabled(extensionIsValid.isValid, userFriendlyReason);
    } else {
      setExtensionEnabled(extensionIsValid.isValid);
    }
  });

  onMount(async () => {
    await Promise.all([
      tokenState.readTokenFromStorage(),
      alarmState.getAlarms(),
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
    <GitHubTokenForm onSubmit={handleTokenSubmit} {tokenState} />
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

  <div class="support-info">
    <p>
      <a href={browser.runtime.getURL("onboarding.html")} target="_blank"
        >Click here to redo onboarding</a
      >
    </p>
  </div>

  <div class="support-info">
    <p>Questions? Problems? Concerns?</p>
    <p>
      Please email us at <a
        target="_blank"
        href="mailto:actions-notifier@spook.software"
        >actions-notifier@spook.software</a
      >
    </p>
  </div>
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
  .support-info {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid #e1e4e8;
    text-align: center;
    font-size: 12px;
    color: #586069;
  }

  .support-info a {
    color: #0366d6;
    text-decoration: none;
  }

  .support-info a:hover {
    text-decoration: underline;
  }
</style>
