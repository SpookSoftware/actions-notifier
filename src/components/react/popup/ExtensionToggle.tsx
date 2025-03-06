import React from "react";

interface ExtensionToggleProps {
  enabled: boolean;
  onToggle: () => Promise<void>;
}

const ExtensionToggle: React.FC<ExtensionToggleProps> = ({
  enabled,
  onToggle,
}) => {
  return (
    <div className="extension-toggle-section">
      <div className="flex-row toggle-container">
        <label className="toggle-label" htmlFor="extension-toggle">
          Extension Status:
        </label>
        <div className="toggle-switch" onClick={onToggle}>
          <input
            type="checkbox"
            id="extension-toggle"
            checked={enabled}
            onChange={onToggle}
          />
          <span className="toggle-slider"></span>
        </div>
        <span
          id="extension-status"
          style={{ color: enabled ? "#28a745" : "#cb2431" }}
        >
          {enabled ? "Enabled" : "Disabled"}
        </span>
      </div>
      <div className="help-text">
        When disabled, the extension won't add buttons or monitor workflows.
      </div>
    </div>
  );
};

export default ExtensionToggle;
