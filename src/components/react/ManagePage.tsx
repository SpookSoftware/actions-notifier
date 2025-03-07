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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Load monitors on mount and whenever refresh is triggered
  const fetchMonitors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching monitors...");
      const data = await loadMonitors();
      console.log(`Fetched ${data.length} monitors`);
      
      setMonitors(data);
    } catch (err) {
      console.error("Error loading monitors:", err);
      setError("Failed to load monitors. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchMonitors();
  }, []);

  // Handle refreshing the monitors list
  const handleRefresh = () => {
    setRefreshing(true);
    fetchMonitors();
  };

  // Handle removing a monitor
  const handleRemoveMonitor = async (id: string) => {
    try {
      const success = await removeMonitor(id);
      if (success) {
        // Remove from local state instead of full refresh
        setMonitors(prev => prev.filter(monitor => monitor.id !== id));
        
        // If current page is now empty and not the first page, go to previous page
        const remainingMonitors = monitors.filter(monitor => monitor.id !== id);
        const totalPages = Math.ceil(remainingMonitors.length / ITEMS_PER_PAGE);
        if (currentPage > totalPages && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      }
      return success;
    } catch (err) {
      console.error(`Error removing monitor ${id}:`, err);
      return false;
    }
  };

  // Handle clearing all monitors
  const handleClearAllMonitors = async () => {
    if (
      window.confirm(
        "Are you sure you want to remove all workflow monitors? This action cannot be undone."
      )
    ) {
      try {
        const success = await clearAllMonitors();
        if (success) {
          setMonitors([]);
          setCurrentPage(1);
        }
        return success;
      } catch (err) {
        console.error("Error clearing all monitors:", err);
        return false;
      }
    }
    return false;
  };

  // Calculate current page slice of monitors
  const currentMonitors = monitors.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Render monitors content based on state
  const renderContent = () => {
    if (loading && monitors.length === 0) {
      return <LoadingIndicator message="Loading monitors..." />;
    }

    if (error) {
      return (
        <div className="error-message">
          {error}
          <button onClick={handleRefresh} className="retry-button">
            Retry
          </button>
        </div>
      );
    }

    if (monitors.length === 0) {
      return (
        <div className="empty-state">
          <p>No active workflow monitors found.</p>
          <p>
            Click the bell icon next to a running workflow on GitHub to start
            monitoring.
          </p>
        </div>
      );
    }

    return (
      <div>
        <MonitorList
          monitors={currentMonitors}
          onRemove={handleRemoveMonitor}
          formatTime={formatTime}
        />

        <Pagination
          currentPage={currentPage}
          totalItems={monitors.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>
    );
  };

  return (
    <>
      <Header />

      <StatusBar
        monitorCount={monitors.length}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onClearAll={handleClearAllMonitors}
        hasMonitors={monitors.length > 0}
      />

      {renderContent()}
    </>
  );
};

export default ManagePage;