import React, { useState, useEffect } from "react";
import { Monitor } from "../../types";
import Header from "./manage/Header";
import StatusBar from "./manage/StatusBar";
import MonitorList from "./manage/MonitorList";
import Pagination from "./manage/Pagination";
import LoadingIndicator from "./shared/LoadingIndicator";
import {
  clearAllMonitors,
  formatTime,
  loadMonitors,
  removeMonitor,
} from "../../services/monitors";

const ITEMS_PER_PAGE = 10;

const ManagePage: React.FC = () => {
  // State variables
  const [allMonitors, setAllMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Load monitors on component mount
  useEffect(() => {
    handleLoadMonitors();
  }, []);

  // Current monitors to display based on pagination
  const currentMonitors = allMonitors.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Handle loading monitors
  const handleLoadMonitors = async () => {
    try {
      // Show loading state
      setLoading(true);
      setRefreshing(true);

      // Load monitors from service
      const monitors = await loadMonitors();
      setAllMonitors(monitors);
    } catch (error) {
      console.error("Error loading monitors:", error);
    } finally {
      // Hide loading state
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle removing a monitor
  const handleRemoveMonitor = async (id: string) => {
    const success = await removeMonitor(id);
    if (success) {
      // Reload monitors to update UI
      await handleLoadMonitors();
    }
    return success;
  };

  // Handle clearing all monitors
  const handleClearAllMonitors = async () => {
    const success = await clearAllMonitors();
    if (success) {
      // Reload monitors to update UI
      await handleLoadMonitors();
    }
    return success;
  };

  return (
    <>
      <Header />

      <StatusBar
        monitorCount={allMonitors.length}
        refreshing={refreshing}
        onRefresh={handleLoadMonitors}
        onClearAll={handleClearAllMonitors}
        hasMonitors={allMonitors.length > 0}
      />

      {loading ? (
        <LoadingIndicator message="Loading monitors..." />
      ) : (
        <div>
          <MonitorList
            monitors={currentMonitors}
            onRemove={handleRemoveMonitor}
            formatTime={formatTime}
          />

          <Pagination
            currentPage={currentPage}
            totalItems={allMonitors.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </>
  );
};

export default ManagePage;
