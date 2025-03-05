import browser from "webextension-polyfill";

export enum NotificationType {
  TOKEN_EXPIRED = "token-expired",
  ALARM_LIMIT_REACHED = "alarm-limit-reached"
}

/**
 * Creates and shows an in-page notification popup on GitHub pages
 */
export function showInPageNotification(type: NotificationType): void {
  // Remove any existing notifications first
  removeExistingNotifications();

  // Create the notification container
  const notification = document.createElement("div");
  notification.className = "cicd-workflow-in-page-notification";
  notification.id = `cicd-notification-${type}`;
  notification.style.position = "fixed";
  notification.style.bottom = "20px";
  notification.style.right = "20px";
  notification.style.backgroundColor = "#fff";
  notification.style.color = "#24292e";
  notification.style.padding = "16px";
  notification.style.borderRadius = "6px";
  notification.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
  notification.style.zIndex = "9999";
  notification.style.maxWidth = "350px";
  notification.style.border = "1px solid #e1e4e8";
  notification.style.display = "flex";
  notification.style.flexDirection = "column";
  notification.style.gap = "12px";

  // Header with icon and title
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.gap = "12px";
  
  // Icon
  const icon = document.createElement("img");
  icon.src = browser.runtime.getURL("images/icon-48.png");
  icon.style.width = "24px";
  icon.style.height = "24px";
  
  // Title
  const title = document.createElement("div");
  title.style.fontWeight = "600";
  title.style.fontSize = "16px";
  title.style.flexGrow = "1";
  
  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "×";
  closeBtn.style.background = "none";
  closeBtn.style.border = "none";
  closeBtn.style.color = "#24292e";
  closeBtn.style.fontSize = "20px";
  closeBtn.style.padding = "0";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.lineHeight = "1";
  
  // Add elements to header
  header.appendChild(icon);
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  // Content and action elements
  const content = document.createElement("div");
  content.style.fontSize = "14px";
  content.style.lineHeight = "1.4";
  
  const actionButton = document.createElement("button");
  actionButton.style.background = "#2ea44f";
  actionButton.style.color = "white";
  actionButton.style.border = "none";
  actionButton.style.borderRadius = "6px";
  actionButton.style.padding = "8px 16px";
  actionButton.style.cursor = "pointer";
  actionButton.style.fontWeight = "500";
  actionButton.style.fontSize = "14px";
  actionButton.style.marginTop = "8px";
  actionButton.style.alignSelf = "flex-start";
  
  // Configure notification content based on type
  if (type === NotificationType.TOKEN_EXPIRED) {
    title.textContent = "GitHub Token Issue";
    content.innerHTML = "Your GitHub token has expired or is invalid. Please update your token to continue monitoring workflows.";
    actionButton.textContent = "Update Token";
    notification.style.borderLeft = "4px solid #f97583"; // Red border for error
    
    actionButton.addEventListener("click", () => {
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
      removeExistingNotifications();
    });
  } else if (type === NotificationType.ALARM_LIMIT_REACHED) {
    title.textContent = "Workflow Monitor Limit Reached";
    content.innerHTML = "You've reached the maximum number of workflows that can be monitored simultaneously. Please manage your active monitors.";
    actionButton.textContent = "Manage Monitors";
    notification.style.borderLeft = "4px solid #f9c513"; // Yellow border for warning
    
    actionButton.addEventListener("click", () => {
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
      removeExistingNotifications();
    });
  }
  
  // Close button event
  closeBtn.addEventListener("click", () => {
    removeExistingNotifications();
  });
  
  // Add all elements to container
  notification.appendChild(header);
  notification.appendChild(content);
  notification.appendChild(actionButton);
  
  // Add to page
  document.body.appendChild(notification);
  
  // Auto-close after 30 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 30000);
}

/**
 * Remove any existing in-page notifications
 */
export function removeExistingNotifications(): void {
  const existingNotifications = document.querySelectorAll(".cicd-workflow-in-page-notification");
  existingNotifications.forEach(notification => {
    document.body.removeChild(notification);
  });
}