import React from "react";

interface StatusBarProps {
  monitorCount: number;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  onClearAll: () => Promise<boolean | undefined>;
  hasMonitors: boolean;
}

const StatusBar: React.FC<StatusBarProps> = ({
  monitorCount,
  refreshing,
  onRefresh,
  onClearAll,
  hasMonitors,
}) => {
  // Determine status bar class based on monitor count
  const getStatusBarClass = () => {
    if (monitorCount >= 475) {
      return "status-bar error";
    } else if (monitorCount >= 400) {
      return "status-bar warning";
    } else {
      return "status-bar";
    }
  };

  return (
    <div className={getStatusBarClass()}>
      <div>
        Active monitors: <strong>{monitorCount}</strong> / 500
      </div>
      <div>
        <button className="secondary" onClick={onRefresh} disabled={refreshing}>
          {refreshing && <span className="spinner"></span>}
          Refresh
        </button>
        <button
          className="danger bulk-action"
          disabled={!hasMonitors}
          onClick={onClearAll}
        >
          Clear All Monitors
        </button>
      </div>
    </div>
  );
};

export default StatusBar;
