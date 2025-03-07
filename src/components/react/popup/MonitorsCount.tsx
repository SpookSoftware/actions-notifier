import React from "react";
import browser from "webextension-polyfill";

interface MonitorsCountProps {
  alarmCount: number;
}

const MonitorsCount: React.FC<MonitorsCountProps> = ({ alarmCount }) => {
  const handleManageClick = () => {
    browser.tabs.create({ url: browser.runtime.getURL("manage.html") });
  };

  return (
    <div className="monitors-count">
      <div className="flex-row">
        <span>
          Active monitors: <strong>{alarmCount}</strong> / 500
        </span>
        {alarmCount >= 400 && alarmCount < 475 && (
          <span id="alarm-count-warning">⚠️ Approaching limit</span>
        )}
        {alarmCount >= 475 && <span id="alarm-count-error">⚠️ At limit</span>}
      </div>
      {alarmCount > 0 && (
        <div className="manage-section">
          <div className="flex-row">
            <button className="secondary" onClick={handleManageClick}>
              Manage Active Monitors
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitorsCount;
