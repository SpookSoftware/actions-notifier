import React from "react";

interface NavigationControlsProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => Promise<void>;
}

const NavigationControls: React.FC<NavigationControlsProps> = ({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onFinish,
}) => {
  return (
    <div className="controls">
      <div className="buttons-container">
        {currentStep > 1 && (
          <button className="btn btn-secondary" onClick={onPrevious}>
            Previous
          </button>
        )}
        {currentStep < totalSteps && (
          <button className="btn btn-primary" onClick={onNext}>
            Next
          </button>
        )}
        {currentStep === totalSteps && (
          <button className="btn btn-primary" onClick={onFinish}>
            Get Started
          </button>
        )}
      </div>
    </div>
  );
};

export default NavigationControls;
