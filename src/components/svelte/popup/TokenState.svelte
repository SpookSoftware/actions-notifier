<script lang="ts">
  const { isValid = true } = $props();
</script>

<div class="token-status-container">
  <div class={`status-indicator ${isValid ? "valid" : "invalid"}`}>
    <div class="icon-container">
      {#if isValid}
        <svg viewBox="0 0 20 20" fill="currentColor" class="check-icon">
          <path
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
      {:else}
        <svg viewBox="0 0 20 20" fill="currentColor" class="x-icon">
          <path
            fill-rule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      {/if}
    </div>
    <span class="status-text">
      {isValid ? "Token is valid!" : "Token is NOT valid!"}
    </span>
  </div>
</div>

<style>
  .token-status-container {
    margin-bottom: 12px;
  }

  .status-indicator {
    padding: 8px 10px;
    border-radius: 6px;
    display: flex;
    align-items: center;
  }

  .valid {
    background-color: rgba(46, 160, 67, 0.1);
    border: 1px solid rgba(46, 160, 67, 0.2);
  }

  .invalid {
    background-color: rgba(203, 36, 49, 0.1);
    border: 1px solid rgba(203, 36, 49, 0.2);
  }

  .icon-container {
    margin-right: 8px;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .valid .icon-container {
    background-color: rgba(46, 160, 67, 0.2);
  }

  .invalid .icon-container {
    background-color: rgba(203, 36, 49, 0.2);
  }

  .check-icon,
  .x-icon {
    width: 10px;
    height: 10px;
  }

  .check-icon {
    color: #28a745;
  }

  .x-icon {
    color: #cb2431;
  }

  .status-text {
    font-weight: 500;
    font-size: 13px;
  }

  .valid .status-text {
    color: #28a745;
  }

  .invalid .status-text {
    color: #cb2431;
  }
</style>
