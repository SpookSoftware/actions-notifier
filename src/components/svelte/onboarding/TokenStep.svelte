<script lang="ts">
  // Converted from React TokenStep.tsx with runes
  import browser from "webextension-polyfill";
  import { validateGitHubToken } from "@/services/github";
  import { saveGitHubToken } from "@/services/storage";
  
  // Props with runes
  export let showTokenInput: boolean;
  export let githubToken: string;
  export let validatingToken: boolean;
  export let tokenValidated: boolean;
  
  // Token message uses the same type as the React component
  type TokenMessage = { type: "success" | "error"; text: string } | null;
  export let tokenMessage: TokenMessage;
  
  // Event handlers
  async function validateToken() {
    if (!githubToken.trim()) {
      tokenMessage = {
        type: "error",
        text: "Please enter a token."
      };
      return;
    }
    
    try {
      validatingToken = true;
      tokenMessage = {
        type: "error",
        text: "Validating token..."
      };
      
      const isValid = await validateGitHubToken(githubToken);
      
      if (isValid) {
        tokenValidated = true;
        tokenMessage = {
          type: "success",
          text: "✓ Token validated successfully!"
        };
        
        // Save token
        await saveGitHubToken(githubToken);
        
        // Notify background script to check extension state
        try {
          await browser.runtime.sendMessage({
            action: "checkAndUpdateExtensionState"
          });
        } catch (error) {
          console.error("Error updating extension state:", error);
        }
      } else {
        tokenValidated = false;
        tokenMessage = {
          type: "error",
          text: '✖ Invalid token or insufficient permissions. Please ensure your token has the "repo" scope.'
        };
      }
    } catch (error) {
      console.error("Token validation error:", error);
      tokenMessage = {
        type: "error",
        text: `✖ Error: ${error instanceof Error ? error.message : "Network error"}`
      };
    } finally {
      validatingToken = false;
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
        <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"></path>
      </svg>
      <span>
        This token will <strong>not</strong> be sent to our servers
      </span>
    </div>
    <div class="permission-item">
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm.25 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5z"></path>
      </svg>
      <span>The token is stored only in your browser</span>
    </div>
    <div class="permission-item">
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm.25 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5z"></path>
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
      <button
        class="btn btn-secondary"
        on:click={() => showTokenInput = true}
      >
        I already have a token
      </button>
    </div>

    {#if showTokenInput}
      <div>
        <p>Enter your GitHub token:</p>
        <input
          type="password"
          class="token-input"
          placeholder="ghp_..."
          bind:value={githubToken}
        />
        <p class="help-text">
          Token should begin with "ghp_" and have the "repo" scope
          permission.
        </p>

        <button
          class="btn btn-primary"
          on:click={validateToken}
          disabled={validatingToken}
        >
          {#if validatingToken}<span class="spinner"></span>{/if}
          Validate Token
        </button>
      </div>
    {/if}
    
    <!-- Always show token messages, regardless of input visibility -->
    {#if tokenMessage}
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