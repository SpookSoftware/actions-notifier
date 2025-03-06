import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import browser from 'webextension-polyfill';

export enum NotificationType {
  TOKEN_EXPIRED = "token-expired",
  ALARM_LIMIT_REACHED = "alarm-limit-reached",
  TRIAL_EXPIRED = "trial-expired"
}

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

  // Configure notification content based on type
  let title = '';
  let content = '';
  let buttonText = '';
  let borderColor = '';
  let handleButtonClick = () => {};

  if (type === NotificationType.TOKEN_EXPIRED) {
    title = "GitHub Token Issue";
    content = "Your GitHub token has expired or is invalid. Please update your token to continue monitoring workflows.";
    buttonText = "Update Token";
    borderColor = "#f97583"; // Red border for error
    
    handleButtonClick = () => {
      // Use a message to open the options page
      browser.runtime.sendMessage({ 
        action: "openOptionsPage" 
      }).catch(error => {
        console.error("Error sending message to open options page:", error);
        // Fallback method if messaging fails
        const optionsPage = browser.runtime.getURL ? 
          browser.runtime.getURL("popup.html") : 
          chrome.runtime.getURL("popup.html");
        window.open(optionsPage, "_blank");
      });
      onClose();
    };
  } else if (type === NotificationType.ALARM_LIMIT_REACHED) {
    title = "Workflow Monitor Limit Reached";
    content = "You've reached the maximum number of workflows that can be monitored simultaneously. Please manage your active monitors.";
    buttonText = "Manage Monitors";
    borderColor = "#f9c513"; // Yellow border for warning
    
    handleButtonClick = () => {
      // Use a message to open the manage page instead of direct browser.tabs API
      browser.runtime.sendMessage({ 
        action: "openManagePage" 
      }).catch(error => {
        console.error("Error sending message to open manage page:", error);
        // Fallback method if messaging fails
        const managePage = browser.runtime.getURL ? 
          browser.runtime.getURL("manage.html") : 
          chrome.runtime.getURL("manage.html");
        window.open(managePage, "_blank");
      });
      onClose();
    };
  } else if (type === NotificationType.TRIAL_EXPIRED) {
    title = "Free Trial Expired";
    content = "Your 7-day free trial has ended. Please purchase the extension to continue monitoring workflows.";
    buttonText = "Purchase Extension";
    borderColor = "#6f42c1"; // Purple border for payment
    
    handleButtonClick = () => {
      // Use a message to open the payment page
      browser.runtime.sendMessage({ 
        action: "openPaymentPage" 
      }).catch(error => {
        console.error("Error sending message to open payment page:", error);
        // Fallback method if messaging fails
        const popupPage = browser.runtime.getURL ? 
          browser.runtime.getURL("popup.html") : 
          chrome.runtime.getURL("popup.html");
        window.open(popupPage, "_blank");
      });
      onClose();
    };
  }

  return (
    <div 
      className="cicd-workflow-in-page-notification"
      id={`cicd-notification-${type}`}
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        backgroundColor: "#fff",
        color: "#24292e",
        padding: "16px",
        borderRadius: "6px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        zIndex: 9999,
        maxWidth: "350px",
        border: "1px solid #e1e4e8",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        borderLeft: `4px solid ${borderColor}`
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <img 
          src={browser.runtime.getURL("images/icon-48.png")} 
          alt="Notification icon"
          style={{ width: "24px", height: "24px" }}
        />
        <div style={{ fontWeight: 600, fontSize: "16px", flexGrow: 1 }}>{title}</div>
        <button 
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#24292e",
            fontSize: "20px",
            padding: 0,
            cursor: "pointer",
            lineHeight: 1
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ fontSize: "14px", lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: content }} />
      
      <button 
        onClick={handleButtonClick}
        style={{
          background: "#2ea44f",
          color: "white",
          border: "none",
          borderRadius: "6px",
          padding: "8px 16px",
          cursor: "pointer",
          fontWeight: 500,
          fontSize: "14px",
          marginTop: "8px",
          alignSelf: "flex-start"
        }}
      >
        {buttonText}
      </button>
    </div>
  );
};

/**
 * Creates and shows an in-page notification popup on GitHub pages
 */
export function showInPageNotification(type: NotificationType): void {
  // Remove any existing notifications first
  removeExistingNotifications();

  // Create container for React component
  const container = document.createElement('div');
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
  const existingNotifications = document.querySelectorAll(".cicd-workflow-in-page-notification");
  existingNotifications.forEach(notification => {
    if (notification.parentElement) {
      document.body.removeChild(notification.parentElement);
    }
  });
}