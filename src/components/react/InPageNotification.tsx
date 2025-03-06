import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { NotificationType } from "../../types";
import NotificationContainer from "./inpage/NotificationContainer";
import getNotificationContent from "./inpage/getNotificationContent";

interface NotificationProps {
  type: NotificationType;
  onClose: () => void;
}

const InPageNotification: React.FC<NotificationProps> = ({ type, onClose }) => {
  useEffect(() => {
    // Auto-close after 30 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 30000);

    return () => clearTimeout(timer);
  }, [onClose]);

  // Get notification content configuration
  const { title, content, buttonText, borderColor, handleButtonClick } =
    getNotificationContent({ type, onClose });

  return (
    <NotificationContainer
      id={type}
      borderColor={borderColor}
      title={title}
      content={content}
      buttonText={buttonText}
      onButtonClick={handleButtonClick}
      onClose={onClose}
    />
  );
};

/**
 * Creates and shows an in-page notification popup on GitHub pages
 */
export function showInPageNotification(type: NotificationType): void {
  // Remove any existing notifications first
  removeExistingNotifications();

  // Create container for React component
  const container = document.createElement("div");
  document.body.appendChild(container);

  // Create React root and render component
  const root = createRoot(container);
  root.render(
    <InPageNotification
      type={type}
      onClose={() => {
        root.unmount();
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
      }}
    />
  );
}

/**
 * Remove any existing in-page notifications
 */
export function removeExistingNotifications(): void {
  const existingNotifications = document.querySelectorAll(
    ".cicd-workflow-in-page-notification"
  );
  existingNotifications.forEach((notification) => {
    if (notification.parentElement) {
      document.body.removeChild(notification.parentElement);
    }
  });
}
