import React from "react";

interface ExtensionToggleProps {
  enabled: boolean;
  reason?: string;
}

const ExtensionToggle: React.FC<ExtensionToggleProps> = ({
  enabled,
  reason,
}) => {
  return (
    <div className="extension-toggle-section">
      <div className="flex-row status-container">
        <label className="status-label">Extension Status:</label>
        <span
          id="extension-status"
          style={{ color: enabled ? "#28a745" : "#cb2431" }}
        >
          {enabled ? "Enabled" : "Disabled"}
        </span>
      </div>
      <div className="help-text">
        {reason || (enabled 
          ? "The extension is monitoring workflows and adding notification buttons."
          : "The extension is not monitoring workflows or adding buttons.")}
      </div>
    </div>
  );
};

export default ExtensionToggle;
