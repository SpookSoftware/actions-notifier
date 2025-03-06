import React from 'react';

interface StepMarkerProps {
  step: number;
  currentStep: number;
  label: string;
}

const StepMarker: React.FC<StepMarkerProps> = ({ step, currentStep, label }) => {
  const isActive = step === currentStep;
  const isCompleted = step < currentStep;
  
  return (
    <div className="progress-step">
      <div 
        className={`step-marker ${
          isActive ? 'active' : isCompleted ? 'completed' : ''
        }`}
      >
        {isCompleted ? '✓' : step}
      </div>
      <div className="step-label">{label}</div>
    </div>
  );
};

export default StepMarker;