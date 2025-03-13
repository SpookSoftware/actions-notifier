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
  import { alarmState } from "@/helpers/helpers.svelte";
  import { onMount } from "svelte";

  const ITEMS_PER_PAGE = 10;

  let currentPage = $state(1);

  // On first load, get the real monitors, but don't perform that calculation again
  let optimisticMonitors = $state(alarmState.alarms);

  let currentPageMonitors = $derived.by(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = currentPage * ITEMS_PER_PAGE;
    return optimisticMonitors.slice(start, end);
  });

  onMount(async () => {
    await alarmState.refresh();
  });

  // Handle removing a monitor
  async function handleRemoveMonitor(id: string) {
    try {
      const success = await removeMonitor(id);
      if (success) {
        // Remove from local state instead of full refresh
        optimisticMonitors = optimisticMonitors.filter(
          (monitor) => monitor.id !== id
        );

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
    alarmState.alarms.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    )
  );

  const isEmpty = $derived(alarmState.alarmCount === 0);
  const hasMonitors = $derived(alarmState.alarmCount !== 0);
</script>

<Header />

<StatusBar
  monitorCount={optimisticMonitors.length}
  refreshing={alarmState.isLoading}
  onRefresh={handleRefresh}
  onClearAll={handleClearAllMonitors}
  {hasMonitors}
/>

{#if alarmState.isLoading}
  <LoadingIndicator />
  <p style="text-align: center">Loading monitors...</p>
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
      monitors={currentPageMonitors}
      onRemove={handleRemoveMonitor}
      {formatTime}
    />

    <Pagination
      {currentPage}
      totalItems={optimisticMonitors.length}
      itemsPerPage={ITEMS_PER_PAGE}
      onPageChange={(page) => (currentPage = page)}
    />
  </div>
{/if}
