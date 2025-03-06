import React from 'react';
import browser from 'webextension-polyfill';

interface DebugToolsProps {
  onDebugTokenNotification: () => Promise<void>;
  onDebugAlarmNotification: () => Promise<void>;
}

const DebugTools: React.FC<DebugToolsProps> = ({
  onDebugTokenNotification,
  onDebugAlarmNotification,
}) => {
  const handleDebugOnboardingClick = () => {
    browser.tabs.create({ url: browser.runtime.getURL("onboarding.html") });
  };

  return (
    <div className="debug-buttons">
      <h3 style={{ fontSize: '14px', marginTop: '16px', marginBottom: '10px' }}>
        Debug Tools:
      </h3>
      <div className="flex-row" style={{ flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between' }}>
        <button
          className="secondary"
          onClick={handleDebugOnboardingClick}
          style={{ flex: 1 }}
        >
          Debug Onboarding
        </button>
        <button
          className="secondary"
          onClick={onDebugTokenNotification}
          style={{ flex: 1, backgroundColor: '#ffeef0', borderColor: '#f97583' }}
        >
          Test Token Alert
        </button>
        <button
          className="secondary"
          onClick={onDebugAlarmNotification}
          style={{ flex: 1, backgroundColor: '#fffbdd', borderColor: '#f9c513' }}
        >
          Test Alarm Alert
        </button>
      </div>
    </div>
  );
};

export default DebugTools;