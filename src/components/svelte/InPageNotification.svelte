<script context="module" lang="ts">
  import { NotificationType } from "@/types";
  import InPageNotification from "./InPageNotification.svelte";

  /**
   * Creates and shows an in-page notification popup on GitHub pages
   */
  export function showInPageNotification(
    type: NotificationType,
    metadata?: Record<string, any>
  ): void {
    // Remove any existing notifications first
    removeExistingNotifications();

    // Create container for Svelte component
    const container = document.createElement("div");
    document.body.appendChild(container);

    // Create Svelte component
    const component = new InPageNotification({
      target: container,
      props: {
        type,
        metadata,
        onClose: () => {
          component.$destroy();
          if (document.body.contains(container)) {
            document.body.removeChild(container);
          }
        },
      },
    });
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
</script>

<script lang="ts">
  // Converted from React InPageNotification.tsx with proper runes usage
  import { NotificationType } from "@/types";
  import NotificationContainer from "./inpage/NotificationContainer.svelte";
  import getNotificationContent from "./inpage/getNotificationContent";

  export let type: NotificationType;
  export let metadata: Record<string, any> | undefined = undefined;
  export let onClose: () => void;

  // Auto-close timer with runes
  let autoCloseTimer = $state<ReturnType<typeof setTimeout> | null>(null);

  // Get notification content configuration
  const contentConfig = getNotificationContent({ type, metadata, onClose });

  // Effect to handle the auto-close timer
  $effect(() => {
    // Auto-close after 30 seconds
    autoCloseTimer = setTimeout(() => {
      onClose();
    }, 30000);

    // Cleanup function
    return () => {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        autoCloseTimer = null;
      }
    };
  });
</script>

<NotificationContainer
  id={type}
  borderColor={contentConfig.borderColor}
  title={contentConfig.title}
  content={contentConfig.content}
  buttonText={contentConfig.buttonText}
  onButtonClick={contentConfig.handleButtonClick}
  {onClose}
/>
