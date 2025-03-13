<script lang="ts">
  import browser from "webextension-polyfill";

  const { alarmCount } = $props<number>();

  function handleManageClick() {
    browser.tabs.create({ url: browser.runtime.getURL("manage.html") });
  }
</script>

<div class="monitors-count">
  <div class="flex-row">
    <span>
      Active monitors: <strong>{alarmCount}</strong> / 500
    </span>
    {#if alarmCount >= 400 && alarmCount < 475}
      <span id="alarm-count-warning">⚠️ Approaching limit</span>
    {/if}
    {#if alarmCount >= 475}
      <span id="alarm-count-error">⚠️ At limit</span>
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

  .manage-section {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #e1e4e8;
  }

  button.secondary {
    background-color: #fafbfc;
    border: 1px solid rgba(27, 31, 35, 0.15);
    color: #24292e;
    font-size: 14px;
    padding: 5px 12px;
    border-radius: 6px;
    cursor: pointer;
  }

  button.secondary:hover {
    background-color: #f3f4f6;
  }
</style>
