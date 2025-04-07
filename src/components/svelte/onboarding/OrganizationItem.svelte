<script lang="ts">
  import { testRepositoryAccess } from "@/services/github-organization";
  import ExternalLinkIcon from "@/components/svelte/shared/ExternalLinkIcon.svelte";

  const { organization, token, onRefresh } = $props<{
    organization: {
      login: string;
      isAuthorized: boolean;
      authUrl: string;
    };
    token: string;
    onRefresh: () => void;
  }>();

  // Local state for this specific organization
  let repoName = $state("");
  let isTesting = $state(false);
  let testMessage = $state<string | null>(null);

  async function handleTestAccess() {
    if (!repoName.trim()) return;

    isTesting = true;
    testMessage = null;

    try {
      const result = await testRepositoryAccess(
        token,
        organization.login,
        repoName
      );
      testMessage = result.message;

      // If the test was successful and showed authorization, trigger a refresh
      if (result.success) {
        setTimeout(onRefresh, 500);
      }
    } catch (err) {
      testMessage = `✖ Error testing access: ${err instanceof Error ? err.message : "Unknown error"}`;
    } finally {
      isTesting = false;
    }
  }
</script>

<div class="organization-item">
  <div class="org-header">
    <div class="org-name">{organization.login}</div>
    <div
      class="org-status {organization.isAuthorized
        ? 'authorized'
        : 'unauthorized'}"
    >
      {organization.isAuthorized ? "✓ Authorized" : "❌ Not authorized"}
    </div>
  </div>

  {#if !organization.isAuthorized}
    <div class="org-authorize-info">
      <p>Your token needs to be authorized for this organization. You can:</p>
      <ol>
        <li>
          <a
            href={organization.authUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="auth-link"
          >
            Visit organization's authorization page
            <ExternalLinkIcon />
          </a>
        </li>
        <li>
          Find your token in the "Third-party Access" section and approve it
        </li>
        <li>
          If you can't find it, you may need to ask an organization admin for
          approval
        </li>
      </ol>
    </div>
  {/if}

  <div class="org-test-access">
    <div class="test-header">Test repository access:</div>
    <div class="test-input">
      <select disabled>
        <option value={organization.login}>{organization.login}</option>
      </select>
      <span>/</span>
      <input
        type="text"
        placeholder="repository-name"
        bind:value={repoName}
        onkeydown={(e) => {
          if (e.key === "Enter" && repoName && !isTesting) {
            e.preventDefault();
            handleTestAccess();
          }
        }}
      />
      <button
        class="btn btn-secondary"
        onclick={handleTestAccess}
        disabled={isTesting || !repoName}
      >
        {#if isTesting}
          <span class="spinner"></span>
        {/if}
        Test Access
      </button>
    </div>
    {#if testMessage}
      <div
        class={`test-message ${testMessage.startsWith("✓") ? "success" : "error"}`}
      >
        {testMessage}
      </div>
    {/if}
  </div>
</div>

<style>
  .organization-item {
    margin-bottom: 16px;
    padding: 12px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
  }

  .org-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .org-name {
    font-weight: 600;
    font-size: 16px;
  }

  .org-status {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }

  .org-status.authorized {
    background-color: #dafbe1;
    color: #1a7f37;
  }

  .org-status.unauthorized {
    background-color: #ffebe9;
    color: #cf222e;
  }

  .org-authorize-info {
    margin-bottom: 16px;
    padding: 12px;
    background-color: #f6f8fa;
    border-radius: 6px;
  }

  .org-authorize-info p {
    margin-top: 0;
    margin-bottom: 8px;
  }

  .org-authorize-info ol {
    margin: 0;
    padding-left: 24px;
  }

  .org-authorize-info li {
    margin-bottom: 4px;
  }

  .org-test-access {
    margin-top: 12px;
  }

  .test-header {
    margin-bottom: 8px;
    font-weight: 500;
  }

  .test-input {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .test-input input {
    flex-grow: 1;
    padding: 6px 8px;
    border: 1px solid #d0d7de;
    border-radius: 4px;
  }

  .test-input select {
    padding: 6px 8px;
    border: 1px solid #d0d7de;
    border-radius: 4px;
  }

  .test-message {
    padding: 8px;
    border-radius: 4px;
    font-size: 14px;
  }

  .test-message.success {
    background-color: #dafbe1;
    color: #1a7f37;
  }

  .test-message.error {
    background-color: #ffebe9;
    color: #cf222e;
  }

  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(0, 0, 0, 0.1);
    border-top-color: #0366d6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 8px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .auth-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--github-link);
    text-decoration: none;
  }

  .auth-link:hover {
    text-decoration: underline;
  }
</style>
