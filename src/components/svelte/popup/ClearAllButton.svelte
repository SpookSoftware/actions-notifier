<script lang="ts">
  import { alarmState } from "@/helpers/helpers.svelte";
  let shouldShowAreYouSure = $state(false);
</script>

<div>
  {#if shouldShowAreYouSure}
    <button class="btn btn-danger" onclick={alarmState.clearAlarms}>
      Are you sure?
    </button>
  {:else}
    <button
      class="btn btn-secondary"
      onclick={() => (shouldShowAreYouSure = true)}
    >
      Clear all monitors
    </button>
  {/if}
</div>

<style>
  .btn {
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid;
    transition: background-color 0.2s ease;
  }

  .btn-secondary {
    background-color: #fafbfc;
    color: #24292e;
    border-color: #e1e4e8;
  }

  .btn-secondary:hover {
    background-color: #f3f4f6;
  }

  .btn-danger {
    background-color: #fafbfc;
    color: #cb2431;
    border-color: #e1e4e8;
  }

  .btn-danger:hover {
    background-color: #ffeef0;
    border-color: #cb2431;
  }
</style>
