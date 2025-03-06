import React, { useState, useEffect } from "react";
import browser from "webextension-polyfill";
import { decode, createURL } from "@/helpers/pure";

// Define types for monitor data
interface Monitor {
  id: string;
  owner: string;
  repository: string;
  runId: string;
  jobId?: string;
  type: "Job" | "Workflow";
  createdAt: string;
  url: string;
}

const ITEMS_PER_PAGE = 10;

const ManagePage: React.FC = () => {
  // State variables
  const [allMonitors, setAllMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusBarClass, setStatusBarClass] = useState("status-bar");

  // Load monitors on component mount
  useEffect(() => {
    loadMonitors();
  }, []);

  // Monitor count effect
  useEffect(() => {
    updateStatusBarClass(allMonitors.length);
  }, [allMonitors]);

  // Current monitors to display based on pagination
  const currentMonitors = allMonitors.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  /**
   * Load all active monitors from storage
   */
  const loadMonitors = async () => {
    try {
      // Show loading state
      setLoading(true);
      setRefreshing(true);

      // Get all alarms (active monitors)
      const alarms = await browser.alarms.getAll();

      // Get details for each encoded alarm name from storage
      const monitorDetails: Monitor[] = [];

      for (const alarm of alarms) {
        try {
          // Get alarm details
          const encodedId = alarm.name;
          const decodedData = decode(encodedId);

          // Get time when monitor was created
          const storageData = await browser.storage.local.get(encodedId);
          const createdTime =
            storageData[encodedId] === true
              ? new Date().toLocaleString() // fallback if no timestamp stored
              : new Date(storageData[encodedId]).toLocaleString();

          monitorDetails.push({
            id: encodedId,
            owner: decodedData.owner,
            repository: decodedData.repository,
            runId: decodedData.runId,
            jobId: decodedData.jobId,
            type: decodedData.jobId ? "Job" : "Workflow",
            createdAt: createdTime,
            url: createURL(decodedData),
          });
        } catch (error) {
          console.error(`Error processing alarm ${alarm.name}:`, error);
          // Skip this alarm if it's not properly formatted
          continue;
        }
      }

      // Sort by creation time (newest first)
      const sortedMonitors = monitorDetails.sort((a, b) => {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      setAllMonitors(sortedMonitors);
    } catch (error) {
      console.error("Error loading monitors:", error);
    } finally {
      // Hide loading state
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Remove a specific monitor
   */
  const removeMonitor = async (id: string) => {
    try {
      // Clear alarm
      await browser.alarms.clear(id);

      // Remove from storage
      await browser.storage.local.remove(id);

      // Update UI
      await loadMonitors();
      return true;
    } catch (error) {
      console.error(`Error removing monitor ${id}:`, error);
      return false;
    }
  };

  /**
   * Clear all monitors
   */
  const clearAllMonitors = async () => {
    if (
      window.confirm(
        "Are you sure you want to remove all workflow monitors? This action cannot be undone."
      )
    ) {
      try {
        // Clear all alarms
        await browser.alarms.clearAll();

        // Get all keys from storage that are monitor IDs
        const monitorKeys = allMonitors.map((monitor) => monitor.id);

        // Remove all monitor keys from storage
        if (monitorKeys.length > 0) {
          await browser.storage.local.remove(monitorKeys);
        }

        // Update UI
        await loadMonitors();
        return true;
      } catch (error) {
        console.error("Error clearing all monitors:", error);
        return false;
      }
    }
  };

  /**
   * Update status bar class based on monitor count
   */
  const updateStatusBarClass = (count: number) => {
    if (count >= 475) {
      setStatusBarClass("status-bar error");
    } else if (count >= 400) {
      setStatusBarClass("status-bar warning");
    } else {
      setStatusBarClass("status-bar");
    }
  };

  /**
   * Format time for display
   */
  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);

      // If it's today, show only time
      const today = new Date();
      if (date.toDateString() === today.toDateString()) {
        return `Today, ${date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      }

      // If it's yesterday, show "Yesterday"
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday, ${date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      }

      // Otherwise show date
      return (
        date.toLocaleDateString() +
        ", " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } catch (error) {
      // Fallback if date parsing fails
      return timeString;
    }
  };

  /**
   * Open the GitHub page for a monitor
   */
  const openMonitorPage = (url: string) => {
    browser.tabs.create({ url });
  };

  /**
   * Render pagination controls
   */
  const renderPagination = () => {
    if (allMonitors.length <= ITEMS_PER_PAGE) {
      return null;
    }

    const totalPages = Math.ceil(allMonitors.length / ITEMS_PER_PAGE);
    const pageNumbers = [];

    // Previous button
    const hasPrevious = currentPage > 1;

    // Next button
    const hasNext = currentPage < totalPages;

    // Generate page numbers
    for (let i = 1; i <= totalPages; i++) {
      // Only show a few page numbers around the current page
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 2 && i <= currentPage + 2)
      ) {
        pageNumbers.push(
          <button
            key={i}
            className={`page-button ${i === currentPage ? "active" : ""}`}
            onClick={() => setCurrentPage(i)}
          >
            {i}
          </button>
        );
      } else if (
        (i === currentPage - 3 && currentPage > 3) ||
        (i === currentPage + 3 && currentPage < totalPages - 2)
      ) {
        // Add ellipsis
        pageNumbers.push(
          <span key={`ellipsis-${i}`} style={{ padding: "6px" }}>
            ...
          </span>
        );
      }
    }

    return (
      <div className="pagination">
        {hasPrevious && (
          <button
            className="page-button"
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            ← Previous
          </button>
        )}
        {pageNumbers}
        {hasNext && (
          <button
            className="page-button"
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next →
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <header>
        <img src="images/icon-48.png" alt="Extension icon" />
        <h1>Manage CI/CD Workflow Monitors</h1>
      </header>

      <div className={statusBarClass}>
        <div>
          Active monitors: <strong>{allMonitors.length}</strong> / 500
        </div>
        <div>
          <button
            className="secondary"
            onClick={loadMonitors}
            disabled={refreshing}
          >
            {refreshing && <span className="spinner"></span>}
            Refresh
          </button>
          <button
            className="danger bulk-action"
            disabled={allMonitors.length === 0}
            onClick={clearAllMonitors}
          >
            Clear All Monitors
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <span>Loading monitors...</span>
        </div>
      )}

      {!loading && (
        <div>
          {allMonitors.length > 0 ? (
            <div className="monitor-list">
              <div className="list-header">
                <div>Repository / Workflow</div>
                <div>Type</div>
                <div>Added</div>
                <div>Actions</div>
              </div>

              {currentMonitors.map((monitor) => (
                <div key={monitor.id} className="monitor-item">
                  <div>
                    <div className="repo-name">
                      {monitor.owner}/{monitor.repository}
                    </div>
                    <div className="workflow-id">
                      <a href={monitor.url} target="_blank">
                        {monitor.type} #{monitor.runId}
                        {monitor.jobId ? ` (Job ${monitor.jobId})` : ""}
                      </a>
                    </div>
                  </div>
                  <div>{monitor.type}</div>
                  <div>{formatTime(monitor.createdAt)}</div>
                  <div className="buttons">
                    <button
                      className="secondary"
                      onClick={() => openMonitorPage(monitor.url)}
                    >
                      View
                    </button>
                    <button
                      className="danger"
                      onClick={() => removeMonitor(monitor.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="monitor-list-empty">
              <p>No active workflow monitors found.</p>
              <p>
                Click the bell icon next to a running workflow on GitHub to
                start monitoring.
              </p>
            </div>
          )}

          {renderPagination()}
        </div>
      )}
    </>
  );
};

export default ManagePage;
