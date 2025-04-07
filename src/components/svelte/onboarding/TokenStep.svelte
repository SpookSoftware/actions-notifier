<script lang="ts">
  import { PREFILLED_TOKEN_URL } from "@constants";
  import ExternalLinkIcon from "@/components/svelte/shared/ExternalLinkIcon.svelte";

  const { handleTokenSubmit, tokenState } = $props<{
    handleTokenSubmit: (e: SubmitEvent) => Promise<void>;
    tokenState: any;
  }>();

  let showTokenInput = $state(false);
  let showValidityMessage = $state(false);
  let showPassword = $state(false);

  type TokenMessage = { type: "success" | "error"; text: string } | null;
  let tokenMessage = $derived.by<TokenMessage>(() => {
    if (!tokenState.token) {
      return null;
    }
    if (tokenState.valid) {
      return { type: "success", text: "✓ Token validated successfully!" };
    } else if (tokenState.isCheckingValidity) {
      return { type: "error", text: "Validating token..." };
    } else if (!tokenState.valid) {
      return {
        type: "error",
        text: '✖ Invalid token or insufficient permissions. Please ensure your token has the "repo" scope.',
      };
    }

    return null;
  });

  async function handleOnSubmitAndUpdateMessages(e: SubmitEvent) {
    await handleTokenSubmit(e);
    showValidityMessage = true;
  }
</script>

<div class="step">
  <div class="step-number">2</div>
  <div class="step-content">
    <h2>GitHub Token Setup</h2>
    <p>
      The extension needs a GitHub Personal Access Token with
      <strong>repo</strong> scope to monitor your workflow status.
    </p>

    <div class="permission-item">
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
        <path
          d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"
        ></path>
      </svg>
      <span>
        This token will <strong>not</strong> be sent to our servers
      </span>
    </div>
    <div class="permission-item">
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
        <path
          d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm.25 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5z"
        ></path>
      </svg>
      <span>The token is stored only in your browser</span>
    </div>
    <div class="permission-item">
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
        <path
          d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm.25 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5z"
        ></path>
      </svg>
      <span>Used only to check workflow status via GitHub API</span>
    </div>

    <!-- Organization access warning box -->
    <div class="org-warning">
      <div class="org-warning-header">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill="currentColor"
        >
          <path
            d="M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z"
          ></path>
        </svg>
        <span>Important: Organization Access Required</span>
      </div>
      <p>
        If you need to monitor workflows in GitHub organization repositories,
        your token must be explicitly authorized by each organization's
        administrators. We'll help you check and set up organization access in
        the next step.
      </p>
    </div>

    <div class="token-options">
      <a
        href={PREFILLED_TOKEN_URL}
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-primary"
      >
        Create New Token
        <ExternalLinkIcon />
      </a>
      <span>or</span>
      <button class="btn btn-secondary" onclick={() => (showTokenInput = true)}>
        I already have a token
      </button>
    </div>

    {#if showTokenInput || tokenState.token}
      <div>
        <p>Enter your GitHub token:</p>
        <form onsubmit={handleOnSubmitAndUpdateMessages}>
          <div class="input-container">
            <input
              required
              type={showPassword ? "text" : "password"}
              class="token-input"
              value={tokenState.token}
              placeholder="ghp_..."
            />
            <button
              type="button"
              class="toggle-password"
              onclick={() => (showPassword = !showPassword)}
              aria-label={showPassword ? "Hide token" : "Show token"}
            >
              {#if showPassword}
                <svg
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  fill="currentColor"
                >
                  <path
                    d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 4.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-4.168-2.457A13.134 13.134 0 0 1 1.172 8z"
                  />
                  <path
                    d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"
                  />
                </svg>
              {:else}
                <svg
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  fill="currentColor"
                >
                  <path
                    d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 4.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"
                  />
                  <path
                    d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"
                  />
                  <path
                    d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"
                  />
                </svg>
              {/if}
            </button>
          </div>
          <p class="help-text">
            Token should begin with "ghp_" and have the "repo" scope permission.
          </p>

          <button
            class="btn btn-primary"
            type="submit"
            disabled={tokenState.isCheckingValidity}
          >
            {#if tokenState.isCheckingValidity}<span class="spinner"
              ></span>{/if}
            Validate Token
          </button>
        </form>
      </div>
    {/if}

    {#if tokenMessage || tokenState.token}
      <div
        class="token-feedback {tokenMessage?.type === 'success'
          ? 'success-message'
          : 'error-message'}"
      >
        {tokenMessage?.text}
      </div>
    {/if}
  </div>
</div>

<style>
  .org-warning {
    margin: 16px 0;
    padding: 12px;
    border-radius: 6px;
    background-color: #fff8c5;
    border: 1px solid #f1e05a;
    border-left: 4px solid #e36209;
  }

  .org-warning-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-weight: 600;
    color: #24292f;
  }

  .org-warning-header svg {
    color: #e36209;
  }

  .org-warning p {
    margin: 0;
    color: #24292f;
    font-size: 14px;
    line-height: 1.5;
  }

  /* Existing styles */
  .token-feedback {
    margin-top: 0.5rem;
    font-size: 0.9rem;
  }

  .success-message {
    color: var(--github-green);
  }

  .error-message {
    color: var(--github-red);
  }

  .btn-primary {
    background-color: var(--github-green);
    color: white;
    border: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .input-container {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }

  .token-input {
    width: 100%;
    padding-right: 40px;
    height: 32px;
    line-height: 32px;
  }

  .toggle-password {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: #666;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    width: 24px;
  }

  .toggle-password:hover {
    color: #333;
  }
</style>
