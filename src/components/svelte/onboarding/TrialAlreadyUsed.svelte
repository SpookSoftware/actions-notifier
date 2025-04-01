<script lang="ts">
  import ExtPay from "extpay";
  import { EXTPAY_ID } from "@constants";

  const extpay = ExtPay(EXTPAY_ID);
</script>

<div class="payment-section">
  <div class="flex-row payment-header">
    <h3>License Status</h3>
    <span class="payment-badge expired">Trial Used</span>
  </div>
  <div class="payment-info">
    <p>
      You've already used your free trial. To continue using all features,
      please purchase a license.
    </p>
    <div class="info-box">
      <svg viewBox="0 0 16 16" width="16" height="16" class="info-icon">
        <path
          fill-rule="evenodd"
          d="M8 16A8 8 0 108 0a8 8 0 000 16zm1-11a1 1 0 11-2 0 1 1 0 012 0zm-1 3a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 008 8z"
        ></path>
      </svg>
      <span>One-time payment grants lifetime access to all features</span>
    </div>
    <button class="payment-button" onclick={() => extpay.openPaymentPage()}>
      Purchase License ($2.95/lifetime)
    </button>
    <p class="login-note">
      Already purchased? Click "Purchase License" and then log in using the
      popup.
    </p>
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

  .payment-badge.expired {
    background-color: #ffeef0;
    color: #cb2431;
  }

  .payment-info {
    padding: 16px;
  }

  p {
    margin: 0 0 16px 0;
    line-height: 1.5;
  }

  .info-box {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background-color: #f6f8fa;
    border-radius: 6px;
    margin-bottom: 16px;
    font-size: 14px;
    color: #586069;
  }

  .info-icon {
    fill: #0366d6;
    flex-shrink: 0;
  }

  .payment-button {
    display: block;
    width: 100%;
    padding: 8px 16px;
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

  .login-note {
    text-align: center;
    font-size: 13px;
    margin-top: 12px;
    color: #586069;
  }

  .login-note a {
    color: #0366d6;
    text-decoration: none;
  }

  .login-note a:hover {
    text-decoration: underline;
  }
</style>
