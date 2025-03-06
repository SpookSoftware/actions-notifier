import React from "react";

interface TrialProgressBarProps {
  daysRemaining: number;
  totalDays: number;
  className?: string;
}

export const TrialProgressBar: React.FC<TrialProgressBarProps> = ({
  daysRemaining,
  totalDays,
  className = "",
}) => {
  const progress = Math.max(
    0,
    Math.min(100, (daysRemaining / totalDays) * 100)
  );

  return (
    <div className={`trial-progress-container ${className}`}>
      <div className="trial-progress-label">
        {daysRemaining} of {totalDays} days remaining
      </div>
      <div className="trial-progress-track">
        <div className="trial-progress-bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};
