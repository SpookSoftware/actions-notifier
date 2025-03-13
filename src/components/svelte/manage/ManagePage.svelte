<script lang="ts">
  import Header from "./Header.svelte";
  import StatusBar from "./StatusBar.svelte";
  import MonitorList from "./MonitorList.svelte";
  import Pagination from "./Pagination.svelte";
  import LoadingIndicator from "../shared/LoadingSpinner.svelte";
  import {
    clearAllMonitors,
    formatTime,
    loadMonitors,
    removeMonitor,
  } from "@/services/monitors";
  import { Monitor } from "@/types";

  const ITEMS_PER_PAGE = 10;

  // State variables with runes
  let loading = $state(true);
  let error = $state<string | null>(null);
  let monitors = $state<Monitor[]>([]);
  let refreshing = $state(false);
  let currentPage = $state(1);

  // Load monitors on mount and whenever refresh is triggered
  async function fetchMonitors() {
    try {
      loading = true;
      error = null;

      console.log("Fetching monitors...");
      const data = await loadMonitors();
      console.log(`Fetched ${data.length} monitors`);

      monitors = data;
    } catch (err) {
      console.error("Error loading monitors:", err);
      error = "Failed to load monitors. Please try again.";
    } finally {
      loading = false;
      refreshing = false;
    }
  }

  // Initial load with effect
  $effect(() => {
    fetchMonitors();
  });

  // Handle refreshing the monitors list
  async function handleRefresh() {
    refreshing = true;
    await fetchMonitors();
  }

  // Handle removing a monitor
  async function handleRemoveMonitor(id: string) {
    try {
      const success = await removeMonitor(id);
      if (success) {
        // Remove from local state instead of full refresh
        monitors = monitors.filter((monitor) => monitor.id !== id);

        // If current page is now empty and not the first page, go to previous page
        const remainingMonitors = monitors.filter(
          (monitor) => monitor.id !== id
        );
        const totalPages = Math.ceil(remainingMonitors.length / ITEMS_PER_PAGE);
        if (currentPage > totalPages && currentPage > 1) {
          currentPage = currentPage - 1;
        }
      }
      return success;
    } catch (err) {
      console.error(`Error removing monitor ${id}:`, err);
      return false;
    }
  }

  // Handle clearing all monitors
  async function handleClearAllMonitors() {
    if (
      window.confirm(
        "Are you sure you want to remove all workflow monitors? This action cannot be undone."
      )
    ) {
      try {
        const success = await clearAllMonitors();
        if (success) {
          monitors = [];
          currentPage = 1;
        }
        return success;
      } catch (err) {
        console.error("Error clearing all monitors:", err);
        return false;
      }
    }
    return false;
  }

  // Calculate current page slice of monitors
  const currentMonitors = $derived(
    monitors.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    )
  );

  // Derived values for UI conditions
  const isLoading = $derived(loading && monitors.length === 0);
  const isEmpty = $derived(!loading && monitors.length === 0 && !error);
  const hasMonitors = $derived(monitors.length > 0);
</script>

<Header />

<StatusBar
  monitorCount={monitors.length}
  {refreshing}
  onRefresh={handleRefresh}
  onClearAll={handleClearAllMonitors}
  {hasMonitors}
/>

<!-- Render content based on state -->
{#if isLoading}
  <LoadingIndicator />
  <p style="text-align: center">Loading monitors...</p>
{:else if error}
  <div class="error-message">
    {error}
    <button on:click={handleRefresh} class="retry-button"> Retry </button>
  </div>
{:else if isEmpty}
  <div class="empty-state">
    <p>No active workflow monitors found.</p>
    <p>
      Click the bell icon next to a running workflow on GitHub to start
      monitoring.
    </p>
  </div>
{:else}
  <div>
    <MonitorList
      monitors={currentMonitors}
      onRemove={handleRemoveMonitor}
      {formatTime}
    />

    <Pagination
      {currentPage}
      totalItems={monitors.length}
      itemsPerPage={ITEMS_PER_PAGE}
      onPageChange={(page) => (currentPage = page)}
    />
  </div>
{/if}
