import React from "react";
import { getPaymentStatus } from "@/services/payment";

interface NavigationControlsProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => Promise<void>;
  isPaidOrTrialing?: boolean;
}

const NavigationControls: React.FC<NavigationControlsProps> = ({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onFinish,
  isPaidOrTrialing: externalPaidStatus,
}) => {
  const [internalPaidStatus, setInternalPaidStatus] = React.useState(false);

  // If external status is provided, use it, otherwise use internal status
  const isPaidOrTrialing = externalPaidStatus !== undefined ? externalPaidStatus : internalPaidStatus;

  // Check payment status when we're on the last step
  React.useEffect(() => {
    // Only run our own check if no external status is provided
    if (currentStep === totalSteps && externalPaidStatus === undefined) {
      const checkPaymentStatus = async () => {
        try {
          const status = await getPaymentStatus();
          setInternalPaidStatus(status.paid || status.trialIsValid);
        } catch (error) {
          console.error("Error checking payment status:", error);
          setInternalPaidStatus(false);
        }
      };
      
      // Run initial check
      checkPaymentStatus();
      
      // Set up polling to check every second
      const intervalId = setInterval(checkPaymentStatus, 1000);
      
      // Clear interval when component unmounts or step changes
      return () => clearInterval(intervalId);
    }
  }, [currentStep, totalSteps, externalPaidStatus]);

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
          <div style={{ position: "relative" }}>
            <button 
              className="btn btn-primary" 
              onClick={onFinish} 
              disabled={!isPaidOrTrialing}
              title={!isPaidOrTrialing ? "Please start a trial or make a purchase to continue" : ""}
            >
              Get Started
            </button>
            {!isPaidOrTrialing && (
              <div style={{ 
                position: "absolute", 
                top: "-25px", 
                left: "50%", 
                transform: "translateX(-50%)",
                backgroundColor: "#e25822",
                color: "white",
                padding: "3px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                whiteSpace: "nowrap"
              }}>
                Start trial or buy first
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NavigationControls;
