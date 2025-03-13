<script lang="ts">
  import { onMount } from "svelte";
  import browser from "webextension-polyfill";
  import { tokenState } from "@/helpers/helpers.svelte";

  let showTokenInput = $state(false);

  let showValidityMessage = $state(false);

  type TokenMessage = { type: "success" | "error"; text: string } | null;
  let tokenMessage = $derived.by<TokenMessage>(() => {
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

  onMount(async () => {
    await tokenState.readTokenFromStorage();
  });

  // // When token validity changes, notify the runtime
  // $effect(() => {
  //   browser.runtime
  //     .sendMessage({
  //       action: "extensionStateChanged",
  //       enabled: tokenState.valid,
  //     })
  //     .catch(console.error);
  // });

  async function handleOnSubmit(e: SubmitEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const tokenInput = form.querySelector<HTMLInputElement>("input");
    if (tokenInput) {
      const submittedToken = tokenInput.value.trim();
      tokenState.token = submittedToken;
      await browser.storage.local.set({ githubToken: tokenState.token });
      showValidityMessage = true;
    }
  }
</script>

<div class="step">
  <div class="step-number">2</div>
  <div class="step-content">
    <h2>GitHub Token Setup</h2>
    <p>
      The extension needs a GitHub Personal Access Token with
      <strong> repo</strong> scope to monitor your workflow status.
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

    <div class="token-options">
      <a
        href="https://github.com/settings/tokens/new?description=CI/CD%20Workflow%20Notifications&scopes=repo"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-primary"
      >
        Create New Token
      </a>
      <span>or</span>
      <button class="btn btn-secondary" onclick={() => (showTokenInput = true)}>
        I already have a token
      </button>
    </div>

    {#if showTokenInput || tokenState.token}
      <div>
        <p>Enter your GitHub token:</p>
        <form onsubmit={handleOnSubmit}>
          <input
            required
            type="password"
            class="token-input"
            value={tokenState.token}
            placeholder="ghp_..."
          />
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

    {#if showValidityMessage && tokenMessage}
      <div
        class="token-feedback {tokenMessage.type === 'success'
          ? 'success-message'
          : 'error-message'}"
      >
        {tokenMessage.text}
      </div>
    {/if}
  </div>
</div>
