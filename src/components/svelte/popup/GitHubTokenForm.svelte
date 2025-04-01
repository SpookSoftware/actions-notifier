<script lang="ts">
  import { PREFILLED_TOKEN_URL } from "@constants";

  const { token, onSubmit } = $props();
</script>

<form onsubmit={onSubmit}>
  <label for="githubToken">GitHub Token:</label>
  <input
    type="password"
    id="githubToken"
    value={token}
    required
    placeholder="ghp_..."
  />
  <div class="help-text">
    <a href={PREFILLED_TOKEN_URL} target="_blank" rel="noopener noreferrer">
      Create a new token with repo scope →
    </a>
  </div>
  <div class="flex-row">
    <button type="submit" id="saveButton"> Save Token </button>
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

  .help-text {
    font-size: 12px;
    margin-bottom: 12px;
  }

  .help-text a {
    color: #0366d6;
    text-decoration: none;
  }

  .help-text a:hover {
    text-decoration: underline;
  }

  #token-status {
    padding: 8px 12px;
    margin-bottom: 12px;
    border-radius: 6px;
    font-size: 14px;
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
    border: 2px solid rgba(0, 0, 0, 0.1);
    border-left-color: #0366d6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
