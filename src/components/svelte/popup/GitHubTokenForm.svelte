<script lang="ts">
  import { PREFILLED_TOKEN_URL } from "@constants";

  const { onSubmit, tokenState } = $props();
</script>

<form onsubmit={onSubmit}>
  <label for="githubToken">GitHub Token:</label>
  <input
    type="password"
    id="githubToken"
    value={tokenState.token}
    required
    placeholder="ghp_..."
  />
  <div class="help-text-container">
    <a href={PREFILLED_TOKEN_URL} target="_blank" rel="noopener noreferrer">
      Create a new token with repo scope →
    </a>

    {#if tokenState && (tokenState.valid !== undefined || tokenState.isCheckingValidity)}
      <span
        class="token-status {tokenState.valid
          ? 'token-valid'
          : 'token-invalid'}"
        id="token-status-indicator"
      >
        {#if tokenState.isCheckingValidity}
          <span class="spinner-mini"></span>
          Validating...
        {:else if tokenState.valid}
          ✓ Valid token
        {:else}
          ✗ Invalid token
        {/if}
      </span>
    {/if}
  </div>

  <div class="flex-row">
    <button
      type="submit"
      id="saveButton"
      disabled={tokenState?.isCheckingValidity}
    >
      {#if tokenState?.isCheckingValidity}
        <span class="spinner"></span>
      {/if}
      Save Token
    </button>
  </div>
</form>

<style>
  form {
    margin-bottom: 16px;
  }

  label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
  }

  input {
    width: 100%;
    padding: 8px 12px;
    margin-bottom: 8px;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    font-size: 14px;
  }

  input:focus {
    outline: none;
    border-color: #0366d6;
    box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.3);
  }

  .help-text-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    margin-bottom: 12px;
  }

  .help-text-container a {
    color: #0366d6;
    text-decoration: none;
  }

  .help-text-container a:hover {
    text-decoration: underline;
  }

  .token-status {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .token-valid {
    background-color: #dcffe4;
    color: #28a745;
  }

  .token-invalid {
    background-color: #ffeef0;
    color: #cb2431;
  }

  .flex-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  button {
    background-color: #2ea44f;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  button:hover {
    background-color: #2c974b;
  }

  button:disabled {
    background-color: #94d3a2;
    cursor: not-allowed;
  }

  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-left-color: #ffffff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .spinner-mini {
    display: inline-block;
    width: 10px;
    height: 10px;
    border: 1.5px solid rgba(0, 0, 0, 0.2);
    border-left-color: currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
