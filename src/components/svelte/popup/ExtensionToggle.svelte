<script lang="ts">
  // Props using Runes
  const { enabled, reason } = $props<boolean>();
</script>

<div class="extension-toggle-section">
  <div class="flex-row status-container">
    <label class="status-label" for="extension-status">Extension Status:</label>
    <span
      id="extension-status"
      class={enabled ? "status-enabled" : "status-disabled"}
      role="status"
    >
      {enabled ? "Enabled" : "Disabled"}
    </span>
  </div>
  <div class="help-text">
    {reason ||
      (enabled
        ? "The extension is monitoring workflows and adding notification buttons."
        : "The extension is not monitoring workflows or adding buttons.")}
  </div>
</div>

<style>
  .extension-toggle-section {
    margin-bottom: 16px;
    padding: 12px;
    border-radius: 6px;
    background-color: #f6f8fa;
  }

  .flex-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-label {
    font-weight: 500;
  }

  #extension-status {
    font-weight: 600;
  }

  .status-enabled {
    color: #28a745;
  }

  .status-disabled {
    color: #cb2431;
  }

  .help-text {
    margin-top: 4px;
    font-size: 13px;
    color: #586069;
  }
</style>
