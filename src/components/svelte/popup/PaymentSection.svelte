<script lang="ts">
  import { trialIsValid } from "@/services/trial";
  import ExtPay from "extpay";

  const extpay = ExtPay("cicd-workflow-notifications");

  const { paymentStatus } = $props();

  const trialExpired = $derived.by(() => {
    return !trialIsValid(paymentStatus.trialStartedAt);
  });
  let trialEndDate = $derived.by(() => {
    return getTrialEndDate(paymentStatus.trialStartedAt);
  });
  let trialNeverStarted = $derived(!paymentStatus.trialStartedAt);
  let shouldShowTrialProgress = $derived.by(() => {
    return !paymentStatus.paid && !trialNeverStarted;
  });

  // Functions
  function getTrialEndDate(trialStartedAt: Date | null): number {
    if (!trialStartedAt) return 0;
    const in7Days = 1000 * 60 * 60 * 24 * 7;
    return trialStartedAt.getTime() + in7Days;
  }

  // Calculate trial progress
  function calculateTrialProgress() {
    if (paymentStatus.paid) return 100;
    if (!paymentStatus.trialStartedAt) return 0;
    if (trialExpired) return 100;

    const now = Date.now();
    const daysLeft = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(100, 100 - (daysLeft / 7) * 100));
  }

  // Calculate days left in trial
  function getDaysLeft() {
    if (paymentStatus.paid) return 0;
    if (!paymentStatus.trialStartedAt) return 7;
    if (trialExpired) return 0;

    const now = Date.now();
    return Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));
  }

  // Get payment button text
  function getPaymentButtonText() {
    if (paymentStatus.paid) return "";
    if (!paymentStatus.trialStartedAt)
      return "Start Free Trial (no credit card required)";
    return "Purchase License ($2.95/lifetime)";
  }

  // Get payment status message
  function getPaymentStatusMessage() {
    if (paymentStatus.paid) {
      return "Thank you for your purchase! You have lifetime access to this extension.";
    }
    if (!paymentStatus.trialStartedAt) {
      return "Start your free 7-day trial to try all features.";
    }
    if (trialExpired) {
      return "Your free trial has expired. Please purchase to continue using this extension.";
    }
    return "Your 7-day free trial is active.";
  }
</script>

<!-- {#if isLoading}
  <div class="payment-section">
    <div class="flex-row payment-header">
      <h3>License Status</h3>
      <span class="payment-badge">Loading...</span>
    </div>
    <div class="payment-info loading-container">
      <LoadingSpinner />
    </div>
  </div>
{:else} -->
<div class="payment-section">
  <div class="flex-row payment-header">
    <h3>License Status</h3>
    <span
      class="payment-badge {paymentStatus.paid ? 'paid' : ''}"
      class:expired={trialExpired}
    >
      {#if paymentStatus.paid}
        Purchased
      {:else if trialNeverStarted}
        No Trial Started
      {:else if trialExpired}
        Trial Expired
      {:else}
        Free Trial
      {/if}
    </span>
  </div>
  <div class="payment-info">
    <p>{getPaymentStatusMessage()}</p>
    {#if shouldShowTrialProgress}
      <div class="trial-progress-container">
        <div
          class="trial-progress-bar"
          style="width: {calculateTrialProgress()}%"
        ></div>
        <span class="trial-days-left">
          {getDaysLeft()} day{getDaysLeft() !== 1 ? "s" : ""}
          {trialExpired ? "ago" : "remaining"}
        </span>
      </div>
    {/if}
    {#if !paymentStatus.paid && getPaymentButtonText()}
      <button class="payment-button" onclick={() => extpay.openTrialPage()}>
        {getPaymentButtonText()}
      </button>
    {/if}
  </div>
</div>

<!-- {/if} -->

<style>
  .payment-section {
    margin-bottom: 16px;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    overflow: hidden;
  }

  .payment-header {
    padding: 12px;
    background-color: #f6f8fa;
    border-bottom: 1px solid #e1e4e8;
  }

  .flex-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  .payment-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    background-color: #f1f8ff;
    color: #0366d6;
  }

  .payment-badge.paid {
    background-color: #dcffe4;
    color: #28a745;
  }

  .payment-badge.expired {
    background-color: #ffeef0;
    color: #cb2431;
  }

  .payment-info {
    padding: 16px;
  }

  .loading-container {
    display: flex;
    justify-content: center;
    padding: 20px;
  }

  p {
    margin: 0 0 16px 0;
    line-height: 1.5;
  }

  .trial-progress-container {
    height: 8px;
    background-color: #eaecef;
    border-radius: 3px;
    margin-bottom: 16px;
    position: relative;
    overflow: hidden;
  }

  .trial-progress-bar {
    height: 100%;
    background-color: #0366d6;
  }

  .trial-days-left {
    position: absolute;
    right: 0;
    top: 12px;
    font-size: 12px;
    color: #586069;
  }

  .payment-button {
    display: block;
    width: 100%;
    padding: 8px 16px;
    margin-top: 16px;
    background-color: #2ea44f;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    text-align: center;
  }

  .payment-button:hover {
    background-color: #2c974b;
  }
</style>
