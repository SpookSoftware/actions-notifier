<script lang="ts">
  const { onRefresh, onClearAll } = $props();

  let monitorCount = $state(0);
  let refreshing = $state(false);
  let hasMonitors = $derived(monitorCount > 0);

  // Determine status bar class based on monitor count - proper runes usage
  const statusBarClass = $derived(
    monitorCount >= 475
      ? "status-bar error"
      : monitorCount >= 400
        ? "status-bar warning"
        : "status-bar"
  );
</script>

<div class={statusBarClass}>
  <div>
    Active monitors: <strong>{monitorCount}</strong> / 500
  </div>
  <div>
    <button class="secondary" onclick={onRefresh} disabled={refreshing}>
      {#if refreshing}<span class="spinner"></span>{/if}
      Refresh
    </button>
    <button
      class="danger bulk-action"
      disabled={!hasMonitors}
      onclick={onClearAll}
    >
      Clear All Monitors
    </button>
  </div>
</div>
