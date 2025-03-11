<script lang="ts">
  // Define the auth state type
  type AuthState = "success" | "warning" | "error" | null;
  
  // Props using Runes
  const authState = $props<AuthState>();
</script>

{#if authState === "success"}
  <div class="auth-state auth-state-success">
    <strong>✓ GitHub token configured</strong>
    <p>
      Your extension is ready to monitor GitHub workflows. Click the bell
      icon on any running workflow to receive a notification when it
      completes.
    </p>
  </div>
{:else if authState === "warning"}
  <div class="auth-state auth-state-warning">
    <strong>⚠️ GitHub token required</strong>
    <p>
      Please add a GitHub token with 'repo' scope to enable workflow
      monitoring.
    </p>
  </div>
{:else if authState === "error"}
  <div class="auth-state auth-state-error">
    <strong>✖ GitHub token invalid</strong>
    <p>
      The provided token could not be verified. Please make sure it has the
      correct 'repo' scope permissions.
    </p>
  </div>
{/if}

<style>
  .auth-state {
    margin-bottom: 16px;
    padding: 12px;
    border-radius: 6px;
    font-size: 14px;
  }

  .auth-state strong {
    display: block;
    margin-bottom: 4px;
    font-size: 15px;
  }

  .auth-state p {
    margin: 0;
    line-height: 1.4;
  }

  .auth-state-success {
    background-color: #dcffe4;
    color: #28a745;
  }

  .auth-state-warning {
    background-color: #fff5b1;
    color: #735c0f;
  }

  .auth-state-error {
    background-color: #ffeef0;
    color: #cb2431;
  }
</style>