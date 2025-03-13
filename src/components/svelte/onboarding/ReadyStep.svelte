<script lang="ts">
  const { paymentState, onStartTrial, onPay, isPaidOrTrialing } = $props();
</script>

<div class="step">
  <div class="step-number">3</div>
  <div class="step-content">
    <h2>You're all set!</h2>
    <p>
      Your GitHub token has been configured successfully. You can now use the
      extension to monitor your workflows.
    </p>

    <h3>How to use:</h3>
    <ol>
      <li>Navigate to GitHub Actions or a pull request with checks</li>
      <li>Find a running or queued workflow</li>
      <li>Click the bell icon 🔔 to monitor that workflow</li>
      <li>The extension will notify you when the workflow completes</li>
    </ol>

    <div
      style="margin: 20px 0; padding: 15px; background-color: #f8f4ff; border: 1px solid #ddd2f7; border-radius: 6px; border-left: 4px solid #6f42c1;"
    >
      {#if isPaidOrTrialing}
        <div style="padding: 10px 0; color: #6f42c1;">
          <h3 style="margin-top: 0; color: #6f42c1;">
            {paymentState.paymentStatus.paid
              ? "💰 Purchase Complete"
              : "Start your free trial"}
          </h3>
        </div>
      {:else}
        <h3 style="margin-top: 0; color: #6f42c1;">💜 Free Trial Period</h3>
        <p>
          To use the extension, you need to sign up for a
          <b>
            <i>no-credit-card-required</i> 7-day free trial
          </b>
          . After the trial period, a one-time purchase is required to continue using
          the extension.
        </p>
        <p style="margin-bottom: 10px">
          <b>Price:</b> $2.95 (one-time payment, lifetime license)
        </p>
      {/if}

      {#if !paymentState.paymentStatus.paid}
        <div style="display: flex; gap: 10px; align-items: center">
          <!-- Trial Button -->
          <button class="btn btn-primary" onclick={onStartTrial}>
            {paymentState.paymentStatus.trialIsValid
              ? "Trial Activated"
              : "Start your free trial"}
          </button>

          <!-- Purchase Button -->
          <button
            class="btn"
            onclick={onPay}
            style="background: #fff; border: 1px solid #6f42c1; color: #6f42c1;"
          >
            Buy Now ($2.95)
          </button>
        </div>
      {/if}

      {#if !isPaidOrTrialing}
        <div style="margin-top: 15px; color: #e25822;">
          <p>
            <strong>
              * You must start a trial or make a purchase to complete
              onboarding.
            </strong>
          </p>
        </div>
      {/if}
    </div>

    <div class="help-text">
      <p>
        You can always update your token or manage active monitors from the
        extension popup.
      </p>
    </div>
  </div>
</div>
