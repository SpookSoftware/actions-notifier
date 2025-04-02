<script lang="ts">
  import LoadingSpinner from "@/components/svelte/shared/LoadingSpinner.svelte";
  import OrganizationItem from "./OrganizationItem.svelte";
  import {
    fetchUserOrganizations,
    checkOrganizationAuthorization,
    getOrganizationAuthorizationUrl,
  } from "@/services/github-organization";

  const { token } = $props<string>();

  type Organization = {
    login: string;
    isAuthorized: boolean;
    authUrl: string;
  };

  let organizations = $state<Organization[]>([]);
  let isLoadingOrgs = $state(true);
  let error = $state<string | null>(null);

  // API calls to GitHub
  async function loadUserOrganizations() {
    isLoadingOrgs = true;
    error = null;

    try {
      const orgs = await fetchUserOrganizations(token);
      organizations = await Promise.all(
        orgs.map(async (org) => {
          const isAuthorized = await checkOrganizationAuthorization(
            token,
            org.login
          );
          return {
            login: org.login,
            isAuthorized,
            authUrl: getOrganizationAuthorizationUrl(org.login),
          };
        })
      );
    } catch (err) {
      error =
        err instanceof Error ? err.message : "Failed to fetch organizations";
      organizations = [];
    } finally {
      isLoadingOrgs = false;
    }
  }

  // Load organizations when the component is mounted
  $effect(() => {
    if (token) {
      loadUserOrganizations();
    }
  });
</script>

<div class="step">
  <div class="step-number">2b</div>
  <div class="step-content">
    <h2>GitHub Organization Access</h2>
    <p>
      For your token to access organization repositories, it must be authorized
      by the organization. This step helps verify that your token has the
      necessary organization permissions.
    </p>

    {#if isLoadingOrgs}
      <div class="loading-container">
        <LoadingSpinner size="medium" />
        <span>Detecting your GitHub organizations...</span>
      </div>
    {:else if error}
      <div class="error-box">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path
            d="M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z"
          ></path>
        </svg>
        <span>Error: {error}</span>
      </div>
    {:else if organizations.length === 0}
      <div class="info-box">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path
            d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z"
          ></path>
        </svg>
        <span
          >No organizations detected. If you don't need to monitor organization
          repositories, you can continue.</span
        >
      </div>
    {:else}
      <div class="organizations-list">
        <h3>Your Organizations</h3>
        {#each organizations as org}
          <OrganizationItem
            organization={org}
            {token}
            onRefresh={loadUserOrganizations}
          />
        {/each}
      </div>

      <div class="info-box">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path
            d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z"
          ></path>
        </svg>
        <span>
          You can continue with setup even if organization authorization is
          pending. The extension will work for your personal repositories and
          any authorized organizations.
        </span>
      </div>
    {/if}

    <div class="actions">
      <button
        class="btn btn-primary"
        on:click={loadUserOrganizations}
        disabled={isLoadingOrgs}
      >
        {#if isLoadingOrgs}
          <span class="spinner"></span>
        {/if}
        Refresh Organization Status
      </button>
    </div>
  </div>
</div>

<style>
  .loading-container {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 20px 0;
  }

  .error-box {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 16px 0;
    padding: 12px;
    border-radius: 6px;
    background-color: #ffebe9;
    border: 1px solid #ffaba8;
    color: #cf222e;
  }

  .info-box {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 16px 0;
    padding: 12px;
    border-radius: 6px;
    background-color: #f6f8fa;
    border: 1px solid #d0d7de;
    color: #24292f;
  }

  .organizations-list {
    margin: 16px 0;
  }

  .organizations-list h3 {
    margin-top: 0;
    margin-bottom: 12px;
    font-size: 16px;
  }

  .actions {
    margin-top: 24px;
    display: flex;
    justify-content: flex-start;
    gap: 12px;
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
</style>
