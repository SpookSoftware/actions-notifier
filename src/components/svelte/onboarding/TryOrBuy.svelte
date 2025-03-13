<script lang="ts">
  const { onPay, onStartTrial } = $props();
</script>

<div
  style="margin: 20px 0; padding: 15px; background-color: #f8f4ff; border: 1px solid #ddd2f7; border-radius: 6px; border-left: 4px solid #6f42c1;"
>
  <h3 style="margin-top: 0; color: #6f42c1;">💜 Free Trial Period</h3>
  <p>
    Start with a
    <b>
      <i>no-credit-card-required</i> 7-day free trial.
    </b>
    {" "}
    After the trial period, a one-time purchase is required to continue using the
    extension.
  </p>
  <p style="margin-bottom: 10px">
    <b>Price:</b> $2.95 (one-time payment, lifetime license)
  </p>

  <div style="display: flex; gap: 10px; align-items: center">
    <button class="btn btn-primary" onclick={onStartTrial}>
      Start your no-credit-card-required free trial
    </button>

    <button
      class="btn"
      onclick={onPay}
      style="background: #fff; border: 1px solid #6f42c1; color: #6f42c1;"
    >
      Buy Now ($2.95)
    </button>
  </div>

  <div style="margin-top: 15px; color: #e25822;">
    <p>
      <strong>
        * You must start a trial or make a purchase to continue.
      </strong>
    </p>
  </div>
</div>
