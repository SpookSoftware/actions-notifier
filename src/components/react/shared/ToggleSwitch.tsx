import React from 'react';

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  enabled,
  onChange,
  label,
  className = '',
}) => {
  return (
    <div className={`toggle-switch-container ${className}`}>
      {label && <span className="toggle-label">{label}</span>}
      <button
        type="button"
        className={`toggle-switch ${enabled ? 'enabled' : 'disabled'}`}
        onClick={() => onChange(!enabled)}
        aria-checked={enabled}
        role="switch"
      >
        <span className="toggle-slider" />
      </button>
    </div>
  );
};