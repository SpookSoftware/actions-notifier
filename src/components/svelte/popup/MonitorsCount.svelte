<script lang="ts">
  import { MAX_ALARMS } from "@constants";

  import ClearAllButton from "./ClearAllButton.svelte";

  const { alarmCount } = $props<number>();

  const nearlyFullAmt = MAX_ALARMS - 25;
  const approachingFullAmt = MAX_ALARMS - 100;

  const approachingFull = $derived(
    alarmCount > approachingFullAmt && alarmCount < nearlyFullAmt
  );

  const nearlyFull = $derived(alarmCount >= nearlyFullAmt);
</script>

<div class="monitors-count">
  <div class="flex-row">
    <span>
      Active monitors: <strong>{alarmCount}</strong> / {MAX_ALARMS}
    </span>
    {#if approachingFull}
      <span id="alarm-count-warning">⚠️ Approaching limit</span>
    {/if}
    {#if nearlyFull}
      <span id="alarm-count-error">⚠️ Nearly at limit</span>
    {/if}

    {#if alarmCount > 0}
      <ClearAllButton />
    {/if}
  </div>
</div>

<style>
  .monitors-count {
    margin-bottom: 16px;
    padding: 12px;
    border-radius: 6px;
    background-color: #f6f8fa;
  }

  .flex-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  strong {
    font-weight: 600;
  }

  #alarm-count-warning {
    color: #d29922;
    font-size: 14px;
  }

  #alarm-count-error {
    color: #cb2431;
    font-size: 14px;
  }
</style>
