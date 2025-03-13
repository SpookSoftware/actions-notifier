<script lang="ts">
  // Converted from React MonitorList.tsx with runes
  import MonitorItem from "./MonitorItem.svelte";
  import { Monitor } from "@/types";

  export let monitors: Monitor[];
  export let onRemove: (id: string) => Promise<boolean>;
  export let formatTime: (timeString: string) => string;
</script>

{#if monitors.length === 0}
  <div class="monitor-list-empty">
    <p>No active workflow monitors found.</p>
    <p>
      Click the bell icon next to a running workflow on GitHub to start
      monitoring.
    </p>
  </div>
{:else}
  <div class="monitor-list">
    <div class="list-header">
      <div>Repository / Workflow</div>
      <div>Type</div>
      <div>Added</div>
      <div>Actions</div>
    </div>

    {#each monitors as monitor (monitor.id)}
      <MonitorItem
        {monitor}
        {onRemove}
        {formatTime}
      />
    {/each}
  </div>
{/if}