import React from "react";

type StatusType = "success" | "error" | "warning" | "info";

interface StatusMessageProps {
  type: StatusType;
  message: string | React.ReactNode;
  className?: string;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({
  type,
  message,
  className = "",
}) => {
  return (
    <div className={`status-message status-${type} ${className}`}>
      {message}
    </div>
  );
};
