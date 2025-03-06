import React from 'react';
import browser from 'webextension-polyfill';
import { Monitor } from '../../../types';

interface MonitorItemProps {
  monitor: Monitor;
  onRemove: (id: string) => Promise<boolean>;
  formatTime: (timeString: string) => string;
}

const MonitorItem: React.FC<MonitorItemProps> = ({ 
  monitor, 
  onRemove,
  formatTime
}) => {
  const openMonitorPage = (url: string) => {
    browser.tabs.create({ url });
  };

  return (
    <div className="monitor-item">
      <div>
        <div className="repo-name">
          {monitor.owner}/{monitor.repository}
        </div>
        <div className="workflow-id">
          <a href={monitor.url} target="_blank" rel="noopener noreferrer">
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
          onClick={() => onRemove(monitor.id)}
        >
          Remove
        </button>
      </div>
    </div>
  );
};

export default MonitorItem;