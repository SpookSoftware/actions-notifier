import React from "react";
import StepMarker from "./StepMarker";

interface ProgressBarProps {
  steps: string[];
  currentStep: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ steps, currentStep }) => {
  return (
    <div className="progress-bar">
      {steps.map((label, index) => (
        <StepMarker
          key={index + 1}
          step={index + 1}
          currentStep={currentStep}
          label={label}
        />
      ))}
    </div>
  );
};

export default ProgressBar;
