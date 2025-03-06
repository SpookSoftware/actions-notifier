import { NotificationType } from "@/types";
import browser from "webextension-polyfill";

interface getNotificationContentProps {
  type: NotificationType;
  onClose: () => void;
}

const getNotificationContent = ({
  type,
  onClose,
}: getNotificationContentProps) => {
  // Configure notification content based on type
  let title = "";
  let content = "";
  let buttonText = "";
  let borderColor = "";
  let handleButtonClick = () => {};

  if (type === NotificationType.TOKEN_EXPIRED) {
    title = "GitHub Token Issue";
    content =
      "Your GitHub token has expired or is invalid. Please update your token to continue monitoring workflows.";
    buttonText = "Update Token";
    borderColor = "#f97583"; // Red border for error

    handleButtonClick = () => {
      // Use a message to open the options page
      browser.runtime
        .sendMessage({
          action: "openOptionsPage",
        })
        .catch((error) => {
          console.error("Error sending message to open options page:", error);
          // Fallback method if messaging fails
          const optionsPage = browser.runtime.getURL
            ? browser.runtime.getURL("popup.html")
            : chrome.runtime.getURL("popup.html");
          window.open(optionsPage, "_blank");
        });
      onClose();
    };
  } else if (type === NotificationType.ALARM_LIMIT_REACHED) {
    title = "Workflow Monitor Limit Reached";
    content =
      "You've reached the maximum number of workflows that can be monitored simultaneously. Please manage your active monitors.";
    buttonText = "Manage Monitors";
    borderColor = "#f9c513"; // Yellow border for warning

    handleButtonClick = () => {
      // Use a message to open the manage page instead of direct browser.tabs API
      browser.runtime
        .sendMessage({
          action: "openManagePage",
        })
        .catch((error) => {
          console.error("Error sending message to open manage page:", error);
          // Fallback method if messaging fails
          const managePage = browser.runtime.getURL
            ? browser.runtime.getURL("manage.html")
            : chrome.runtime.getURL("manage.html");
          window.open(managePage, "_blank");
        });
      onClose();
    };
  } else if (type === NotificationType.TRIAL_EXPIRED) {
    title = "Free Trial Expired";
    content =
      "Your 7-day free trial has ended. Please purchase the extension to continue monitoring workflows.";
    buttonText = "Purchase Extension";
    borderColor = "#6f42c1"; // Purple border for payment

    handleButtonClick = () => {
      // Use a message to open the payment page
      browser.runtime
        .sendMessage({
          action: "openPaymentPage",
        })
        .catch((error) => {
          console.error("Error sending message to open payment page:", error);
          // Fallback method if messaging fails
          const popupPage = browser.runtime.getURL
            ? browser.runtime.getURL("popup.html")
            : chrome.runtime.getURL("popup.html");
          window.open(popupPage, "_blank");
        });
      onClose();
    };
  }

  return {
    title,
    content,
    buttonText,
    borderColor,
    handleButtonClick,
  };
};

export default getNotificationContent;
