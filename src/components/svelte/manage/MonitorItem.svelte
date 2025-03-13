<script lang="ts">
  // Converted from React MonitorItem.tsx with runes
  import browser from "webextension-polyfill";
  import { Monitor } from "@/types";

  export let monitor: Monitor;
  export let onRemove: (id: string) => Promise<boolean>;
  export let formatTime: (timeString: string) => string;

  function openMonitorPage(url: string) {
    browser.tabs.create({ url });
  }
</script>

<div class="monitor-item">
  <div>
    <div class="repo-name">
      {monitor.owner}/{monitor.repository}
    </div>
    <div class="workflow-id">
      <a href={monitor.url} target="_blank" rel="noopener noreferrer">
        {monitor.type} #{monitor.runId}
        {monitor.jobId ? ` (Job ${monitor.jobId})` : ""}
      </a>
    </div>
  </div>
  <div>{monitor.type}</div>
  <div>{formatTime(monitor.createdAt)}</div>
  <div class="buttons">
    <button
      class="secondary"
      on:click={() => openMonitorPage(monitor.url)}
    >
      View
    </button>
    <button class="danger" on:click={() => onRemove(monitor.id)}>
      Remove
    </button>
  </div>
</div>