import browser from "webextension-polyfill";
import { decode, createURL, isProperlyEncoded } from "./helpers/pure";

// Track monitors and pagination
let allMonitors = [];
const ITEMS_PER_PAGE = 10;
let currentPage = 1;

document.addEventListener("DOMContentLoaded", async function () {
  // Elements
  const statusBar = document.getElementById("status-bar");
  const monitorCountEl = document.getElementById("count");
  const monitorList = document.getElementById("monitor-list");
  const emptyState = document.getElementById("empty-state");
  const monitorContainer = document.getElementById("monitor-container");
  const loadingIndicator = document.getElementById("loading");
  const refreshButton = document.getElementById("refresh-button");
  const refreshSpinner = document.getElementById("refresh-spinner");
  const clearAllButton = document.getElementById("clear-all-button");
  const paginationContainer = document.getElementById("pagination");

  // Initialize
  await loadMonitors();

  // Event listeners
  refreshButton!.addEventListener("click", loadMonitors);

  clearAllButton!.addEventListener("click", async () => {
    if (
      confirm(
        "Are you sure you want to remove all workflow monitors? This action cannot be undone."
      )
    ) {
      await clearAllMonitors();
      await loadMonitors();
    }
  });

  /**
   * Load all active monitors from storage
   */
  async function loadMonitors() {
    try {
      // Show loading state
      loadingIndicator!.style.display = "flex";
      monitorContainer!.style.display = "none";
      refreshSpinner!.style.display = "inline-block";

      // Get all alarms (active monitors)
      const alarms = await browser.alarms.getAll();

      // Get details for each encoded alarm name from storage
      const monitorDetails = [];

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
      allMonitors = monitorDetails.sort((a, b) => {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      // Update UI
      updateMonitorCount(allMonitors.length);
      renderMonitorList();
      setupPagination();
    } catch (error) {
      console.error("Error loading monitors:", error);
      monitorList.innerHTML = `
        <div class="monitor-list-empty">
          <p>Error loading monitors: ${error.message}</p>
        </div>
      `;
    } finally {
      // Hide loading state
      loadingIndicator.style.display = "none";
      monitorContainer.style.display = "block";
      refreshSpinner.style.display = "none";
    }
  }

  /**
   * Render the list of monitors with pagination
   */
  function renderMonitorList() {
    // Clear existing items except the header
    const listHeader = monitorList.querySelector(".list-header");
    monitorList.innerHTML = "";
    monitorList.appendChild(listHeader);

    // Calculate items for current page
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentItems = allMonitors.slice(startIndex, endIndex);

    // Show empty state if no monitors
    if (allMonitors.length === 0) {
      monitorList.style.display = "none";
      emptyState.style.display = "block";
      paginationContainer.style.display = "none";
      clearAllButton.disabled = true;
      return;
    }

    // Show monitor list if we have monitors
    monitorList.style.display = "block";
    emptyState.style.display = "none";
    clearAllButton.disabled = false;

    // Create list items
    currentItems.forEach((monitor) => {
      const monitorItem = document.createElement("div");
      monitorItem.className = "monitor-item";
      monitorItem.innerHTML = `
        <div>
          <div class="repo-name">${monitor.owner}/${monitor.repository}</div>
          <div class="workflow-id">
            <a href="${monitor.url}" target="_blank">
              ${monitor.type} #${monitor.runId}${
        monitor.jobId ? ` (Job ${monitor.jobId})` : ""
      }
            </a>
          </div>
        </div>
        <div>${monitor.type}</div>
        <div>${formatTime(monitor.createdAt)}</div>
        <div class="buttons">
          <button class="secondary view-btn" data-url="${
            monitor.url
          }">View</button>
          <button class="danger remove-btn" data-id="${
            monitor.id
          }">Remove</button>
        </div>
      `;

      // Add event listeners to buttons
      const viewBtn = monitorItem.querySelector(".view-btn");
      const removeBtn = monitorItem.querySelector(".remove-btn");

      viewBtn.addEventListener("click", () => {
        browser.tabs.create({ url: monitor.url });
      });

      removeBtn.addEventListener("click", async () => {
        await removeMonitor(monitor.id);
        await loadMonitors();
      });

      monitorList.appendChild(monitorItem);
    });
  }

  /**
   * Set up pagination controls
   */
  function setupPagination() {
    paginationContainer.innerHTML = "";

    // Only show pagination if needed
    if (allMonitors.length <= ITEMS_PER_PAGE) {
      paginationContainer.style.display = "none";
      return;
    }

    paginationContainer.style.display = "flex";

    // Calculate total pages
    const totalPages = Math.ceil(allMonitors.length / ITEMS_PER_PAGE);

    // Previous button
    if (currentPage > 1) {
      const prevButton = document.createElement("button");
      prevButton.className = "page-button";
      prevButton.textContent = "← Previous";
      prevButton.addEventListener("click", () => {
        currentPage--;
        renderMonitorList();
        setupPagination();
      });
      paginationContainer.appendChild(prevButton);
    }

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      // Only show a few page numbers around the current page
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 2 && i <= currentPage + 2)
      ) {
        const pageButton = document.createElement("button");
        pageButton.className = `page-button ${
          i === currentPage ? "active" : ""
        }`;
        pageButton.textContent = i.toString();
        pageButton.addEventListener("click", () => {
          currentPage = i;
          renderMonitorList();
          setupPagination();
        });
        paginationContainer.appendChild(pageButton);
      } else if (
        (i === currentPage - 3 && currentPage > 3) ||
        (i === currentPage + 3 && currentPage < totalPages - 2)
      ) {
        // Add ellipsis
        const ellipsis = document.createElement("span");
        ellipsis.textContent = "...";
        ellipsis.style.padding = "6px";
        paginationContainer.appendChild(ellipsis);
      }
    }

    // Next button
    if (currentPage < totalPages) {
      const nextButton = document.createElement("button");
      nextButton.className = "page-button";
      nextButton.textContent = "Next →";
      nextButton.addEventListener("click", () => {
        currentPage++;
        renderMonitorList();
        setupPagination();
      });
      paginationContainer.appendChild(nextButton);
    }
  }

  /**
   * Update monitor count display and status bar
   */
  function updateMonitorCount(count) {
    monitorCountEl.textContent = count;

    // Update status bar class based on count
    statusBar.className = "status-bar";

    if (count >= 400 && count < 475) {
      statusBar.className = "status-bar warning";
    } else if (count >= 475) {
      statusBar.className = "status-bar error";
    }
  }

  /**
   * Remove a specific monitor
   */
  async function removeMonitor(id) {
    try {
      // Clear alarm
      await browser.alarms.clear(id);

      // Remove from storage
      await browser.storage.local.remove(id);

      return true;
    } catch (error) {
      console.error(`Error removing monitor ${id}:`, error);
      return false;
    }
  }

  /**
   * Clear all monitors
   */
  async function clearAllMonitors() {
    try {
      // Clear all alarms
      await browser.alarms.clearAll();

      // Get all keys from storage that are monitor IDs
      const monitorKeys = allMonitors.map((monitor) => monitor.id);

      // Remove all monitor keys from storage
      if (monitorKeys.length > 0) {
        await browser.storage.local.remove(monitorKeys);
      }

      return true;
    } catch (error) {
      console.error("Error clearing all monitors:", error);
      return false;
    }
  }

  /**
   * Format time for display
   */
  function formatTime(timeString) {
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
  }
});
