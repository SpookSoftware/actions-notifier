import React from "react";
import MonitorItem from "./MonitorItem";
import { Monitor } from "../../../types";

interface MonitorListProps {
  monitors: Monitor[];
  onRemove: (id: string) => Promise<boolean>;
  formatTime: (timeString: string) => string;
}

const MonitorList: React.FC<MonitorListProps> = ({
  monitors,
  onRemove,
  formatTime,
}) => {
  if (monitors.length === 0) {
    return (
      <div className="monitor-list-empty">
        <p>No active workflow monitors found.</p>
        <p>
          Click the bell icon next to a running workflow on GitHub to start
          monitoring.
        </p>
      </div>
    );
  }

  return (
    <div className="monitor-list">
      <div className="list-header">
        <div>Repository / Workflow</div>
        <div>Type</div>
        <div>Added</div>
        <div>Actions</div>
      </div>

      {monitors.map((monitor) => (
        <MonitorItem
          key={monitor.id}
          monitor={monitor}
          onRemove={onRemove}
          formatTime={formatTime}
        />
      ))}
    </div>
  );
};

export default MonitorList;
