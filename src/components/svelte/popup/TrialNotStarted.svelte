<script lang="ts">
  import ExtPay from "extpay";

  const extpay = ExtPay("cicd-workflow-notifications");
</script>

<div class="payment-section">
  <div class="payment-header">
    <h3>License Status</h3>
  </div>
  <div class="payment-info">
    <p>
      Start your free 7-day trial or purchase a license to try all features.
    </p>
    <div class="button-group">
      <button class="trial-button" onclick={() => extpay.openTrialPage()}>
        Start Free Trial
      </button>
      <button class="buy-button" onclick={() => extpay.openPaymentPage()}>
        Purchase License<span class="price">($2.95/lifetime)</span>
      </button>
    </div>
  </div>
</div>

<style>
  p {
    margin: 0;
    line-height: 1.5;
  }

  .payment-section {
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    overflow: hidden;
  }

  .payment-header {
    padding: 12px 16px;
    background-color: #f6f8fa;
    border-bottom: 1px solid #e1e4e8;
  }

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #24292e;
  }

  .payment-info {
    padding: 16px;
  }

  .payment-info p {
    margin-bottom: 16px;
  }

  .button-group {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .trial-button {
    background-color: #2ea44f;
    color: #fff;
    border: 1px solid rgba(27, 31, 35, 0.15);
    border-radius: 6px;
    padding: 5px 16px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  }

  .trial-button:hover {
    background-color: #2c974b;
  }

  .buy-button {
    background-color: #fff;
    color: #6f42c1;
    border: 1px solid #6f42c1;
    border-radius: 6px;
    padding: 5px 16px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
  }

  .buy-button:hover {
    background-color: #f6f8fa;
  }

  .price {
    margin-left: 5px;
    font-weight: normal;
  }
</style>
