<script lang="ts">
  const { paymentState, onStartTrial, onPay, isPaidOrTrialing } = $props();

  import Paid from "./Paid.svelte";
  import TrialAlreadyUsed from "./TrialAlreadyUsed.svelte";
  import Trialed from "./Trialed.svelte";
  import TryOrBuy from "./TryOrBuy.svelte";
</script>

<div class="step">
  <div class="step-number">3</div>
  <div class="step-content">
    <h2>Try or Buy</h2>
    <p>
      To use the extension, you need to either start a no-credit-card-required
      7-day free trial or purchase a license. The license is for lifetime use,
      and costs $2.95.
    </p>

    {#if paymentState.paymentStatus.paid}
      <Paid />
    {:else if paymentState.paymentStatus.trialIsValid}
      <Trialed />
      <!-- I can already tell that this doesn't cover all the cases. What if they previously had a trial? What if they already bought and are signing in?-->
    {:else if paymentState.paymentStatus.trialExpired}
      <TrialAlreadyUsed />
    {:else}
      <TryOrBuy {onPay} {onStartTrial} />
    {/if}
  </div>
</div>
