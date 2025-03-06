import React from "react";

interface LoadingIndicatorProps {
  message?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = "Loading...",
}) => {
  return (
    <div className="loading">
      <div className="spinner"></div>
      <span>{message}</span>
    </div>
  );
};

export default LoadingIndicator;
