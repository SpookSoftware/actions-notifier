<script lang="ts">
  import ExtPay from "extpay";
  import { EXTPAY_ID } from "@constants";

  const extpay = ExtPay(EXTPAY_ID);

  const { trialExpirationDate } = $props();

  const trialProgress = $derived.by(() => {
    const now = Date.now();
    const daysLeft = Math.ceil(
      (trialExpirationDate - now) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, Math.min(100, 100 - (daysLeft / 7) * 100));
  });

  const daysLeft = $derived.by(() => {
    const now = Date.now();
    return Math.ceil((trialExpirationDate - now) / (1000 * 60 * 60 * 24));
  });
</script>

<div class="payment-section">
  <div class="flex-row payment-header">
    <h3>License Status</h3>
    <span class="payment-badge"> Free Trial </span>
  </div>
  <div class="payment-info">
    <p>Your 7-day free trial is active.</p>
    <div class="trial-progress-container">
      <div class="trial-progress-bar" style="width: {trialProgress}%"></div>
      <span class="trial-days-left">
        {daysLeft} day{daysLeft !== 1 ? "s" : ""}
        remaining
      </span>
    </div>
    <button class="payment-button" onclick={() => extpay.openPaymentPage()}>
      Purchase License ($2.95/lifetime)
    </button>
  </div>
</div>

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
