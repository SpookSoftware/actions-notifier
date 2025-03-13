<script lang="ts">
  // Converted from React NotificationContainer.tsx with runes
  import browser from "webextension-polyfill";

  export let id: string;
  export let borderColor: string;
  export let title: string;
  export let content: string;
  export let buttonText: string;
  export let onButtonClick: () => void;
  export let onClose: () => void;
</script>

<div
  class="cicd-workflow-in-page-notification"
  id="cicd-notification-{id}"
  style="position: fixed; bottom: 20px; right: 20px; background-color: #fff; color: #24292e; padding: 16px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); z-index: 9999; max-width: 350px; border: 1px solid #e1e4e8; display: flex; flex-direction: column; gap: 12px; border-left: 4px solid {borderColor};"
>
  <div style="display: flex; align-items: center; gap: 12px">
    <img
      src={browser.runtime.getURL("images/icon-48.png")}
      alt="Notification icon"
      style="width: 24px; height: 24px"
    />
    <div style="font-weight: 600; font-size: 16px; flex-grow: 1">
      {title}
    </div>
    <button
      on:click={onClose}
      style="background: none; border: none; color: #24292e; font-size: 20px; padding: 0; cursor: pointer; line-height: 1;"
    >
      ×
    </button>
  </div>

  <div
    style="font-size: 14px; line-height: 1.4"
  >{@html content}</div>

  <button
    on:click={onButtonClick}
    style="background: #2ea44f; color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-weight: 500; font-size: 14px; margin-top: 8px; align-self: flex-start;"
  >
    {buttonText}
  </button>
</div>