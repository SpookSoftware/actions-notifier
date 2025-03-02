import browser from "webextension-polyfill";

document.addEventListener("DOMContentLoaded", async function () {
  // Elements
  const tokenForm = document.getElementById("tokenForm");
  const tokenInput = document.getElementById("githubToken");
  const saveButton = document.getElementById("saveButton");
  const spinner = document.getElementById("spinner");
  const tokenStatus = document.getElementById("token-status");
  const authSuccess = document.getElementById("auth-success");
  const authWarning = document.getElementById("auth-warning");
  const authError = document.getElementById("auth-error");
  const welcomeMessage = document.getElementById("welcome-message");
  const monitorsSection = document.getElementById("monitors-section");
  const alarmCountElement = document.getElementById("alarm-count");
  const alarmCountWarning = document.getElementById("alarm-count-warning");
  const alarmCountError = document.getElementById("alarm-count-error");
  const manageSection = document.getElementById("manage-section");
  const extensionToggle = document.getElementById("extension-toggle");
  const extensionStatus = document.getElementById("extension-status");

  // Check if this is first run
  const firstRun = await checkFirstRun();
  if (firstRun) {
    welcomeMessage.style.display = "block";
    // Mark as no longer first run
    await browser.storage.local.set({ hasSeenOnboarding: true });
  }

  // Load and validate existing token (if any)
  await loadAndValidateToken();

  // Load extension enabled state
  await loadExtensionEnabledState();

  // Update alarm count
  await updateAlarmCount();

  // Form submission
  tokenForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveAndValidateToken();
  });

  // Create a direct click handler function to avoid code duplication
  const handleToggleClick = async (event) => {
    // Don't handle clicks on the checkbox itself or if event already handled
    if (event.target === extensionToggle || event.defaultPrevented) {
      return;
    }
    
    // Prevent double handling
    event.preventDefault();
    
    console.debug(`Toggle clicked: ${event.currentTarget.className}`);
    const newState = !extensionToggle.checked;
    extensionToggle.checked = newState;
    
    // Update UI
    updateExtensionStatusText(newState);
    
    // Update state
    await setExtensionEnabled(newState);
  };
  
  // Add handlers for all toggle-related elements to ensure it works
  document.querySelector('.toggle-container').addEventListener('click', handleToggleClick);
  document.querySelector('.toggle-switch').addEventListener('click', handleToggleClick);
  document.querySelector('.toggle-label').addEventListener('click', handleToggleClick);
  document.getElementById('extension-status').addEventListener('click', handleToggleClick);
  document.querySelector('.toggle-slider').addEventListener('click', handleToggleClick);
  
  // Change handler for the checkbox
  extensionToggle.addEventListener("change", async (event) => {
    console.debug("Toggle changed:", extensionToggle.checked);
    
    // Get the new state
    const newState = extensionToggle.checked;
    
    // Update UI
    updateExtensionStatusText(newState);
    
    // Update state
    await setExtensionEnabled(newState);
  });

  // Manage button click
  if (document.getElementById("manage-button")) {
    document.getElementById("manage-button").addEventListener("click", () => {
      browser.tabs.create({ url: browser.runtime.getURL("manage.html") });
    });
  }

  // Debug onboarding button click
  if (document.getElementById("debug-onboarding-button")) {
    document
      .getElementById("debug-onboarding-button")
      .addEventListener("click", () => {
        browser.tabs.create({ url: browser.runtime.getURL("onboarding.html") });
      });
  }

  /**
   * Save and validate the GitHub token
   */
  async function saveAndValidateToken() {
    const token = tokenInput.value.trim();

    if (!token) {
      showTokenStatus("Please enter a GitHub token", false);
      return;
    }

    // Show loading state
    saveButton.disabled = true;
    spinner.style.display = "inline-block";
    showTokenStatus("", null);

    try {
      // Validate token with GitHub API
      const isValid = await validateGitHubToken(token);

      if (isValid) {
        // Save valid token
        await browser.storage.sync.set({ githubToken: token });
        showTokenStatus("✓ Token validated successfully", true);
        updateAuthState(true);
        monitorsSection.classList.remove("hidden");
        await updateAlarmCount();
      } else {
        showTokenStatus("✖ Invalid token or insufficient permissions", false);
        updateAuthState(false);
      }
    } catch (error) {
      console.error("Error validating token:", error);
      showTokenStatus(`✖ Error: ${error.message}`, false);
      updateAuthState(false);
    } finally {
      // Reset loading state
      saveButton.disabled = false;
      spinner.style.display = "none";
    }
  }

  /**
   * Load and validate any existing token
   */
  async function loadAndValidateToken() {
    try {
      const data = await browser.storage.sync.get("githubToken");

      if (data.githubToken) {
        // Set input value
        tokenInput.value = data.githubToken;

        // Validate token
        const isValid = await validateGitHubToken(data.githubToken);

        if (isValid) {
          showTokenStatus("✓ Token valid", true);
          updateAuthState(true);
          monitorsSection.classList.remove("hidden");
        } else {
          showTokenStatus("✖ Token invalid or expired", false);
          updateAuthState(false);
        }
      } else {
        // No token exists
        updateAuthState(null);
      }
    } catch (error) {
      console.error("Error loading GitHub token:", error);
      updateAuthState(false);
    }
  }

  /**
   * Validate GitHub token against the API
   */
  async function validateGitHubToken(token) {
    try {
      // Test API call to verify token (user endpoint requires minimal permissions)
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      // Check if unauthorized or rate limited
      if (response.status === 401 || response.status === 403) {
        return false;
      }

      // For valid token, test if it has repo scope with a sample repo request
      const repoResponse = await fetch(
        "https://api.github.com/repos/octocat/hello-world",
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      // Return true if we can access repo API
      return repoResponse.status !== 403; // 403 would mean insufficient permissions
    } catch (error) {
      console.error("Error validating token:", error);
      return false;
    }
  }

  /**
   * Check if this is the first run of the extension
   */
  async function checkFirstRun() {
    try {
      const data = await browser.storage.local.get("hasSeenOnboarding");
      return !data.hasSeenOnboarding;
    } catch (error) {
      console.error("Error checking first run:", error);
      return false;
    }
  }

  /**
   * Update authentication state UI
   */
  function updateAuthState(isValid) {
    // Hide all auth states first
    authSuccess.style.display = "none";
    authWarning.style.display = "none";
    authError.style.display = "none";
    welcomeMessage.style.display = "none";

    if (isValid === true) {
      authSuccess.style.display = "block";
    } else if (isValid === false) {
      authError.style.display = "block";
    } else {
      // null = no token
      authWarning.style.display = "block";
    }
  }

  /**
   * Display token validation status
   */
  function showTokenStatus(message, isValid) {
    if (!message) {
      tokenStatus.textContent = "";
      tokenStatus.className = "";
      return;
    }

    tokenStatus.textContent = message;

    if (isValid === true) {
      tokenStatus.className = "token-valid";
    } else if (isValid === false) {
      tokenStatus.className = "token-invalid";
    } else {
      tokenStatus.className = "";
    }
  }

  /**
   * Update alarm count display
   */
  async function updateAlarmCount() {
    try {
      // Get all active alarms
      const alarms = await browser.alarms.getAll();
      const count = alarms.length;

      // Update count display
      alarmCountElement.textContent = count;

      // Show warnings based on count
      alarmCountWarning.classList.toggle("hidden", count < 400);
      alarmCountError.classList.toggle("hidden", count < 475);

      // Show manage section if there are active alarms
      manageSection.classList.toggle("hidden", count === 0);

      // Automatically disable extension if count is at or above the limit
      if (count >= 500 && extensionToggle.checked) {
        extensionToggle.checked = false;
        await setExtensionEnabled(false);
        updateExtensionStatusText(false);
      }

      return count;
    } catch (error) {
      console.error("Error getting alarm count:", error);
      return 0;
    }
  }
  
  /**
   * Load the extension enabled state
   */
  async function loadExtensionEnabledState() {
    try {
      const response = await browser.runtime.sendMessage({ action: "getExtensionEnabled" });
      
      if (response.status === "ok" && response.data) {
        extensionToggle.checked = response.data.enabled;
        updateExtensionStatusText(response.data.enabled);
      }
    } catch (error) {
      console.error("Error loading extension state:", error);
      // Default to enabled
      extensionToggle.checked = true;
      updateExtensionStatusText(true);
    }
  }
  
  /**
   * Set the extension enabled state
   */
  async function setExtensionEnabled(enabled) {
    try {
      console.debug(`Sending request to set extension state to: ${enabled}`);
      
      const response = await browser.runtime.sendMessage({ 
        action: "setExtensionEnabled", 
        enabled: enabled 
      });
      
      console.debug("Response from setting extension state:", response);
      
      // If token is valid and we're enabling, trigger a check for any issues
      if (enabled) {
        await browser.runtime.sendMessage({ action: "checkAndUpdateExtensionState" });
        // Refresh the state again to be sure
        await loadExtensionEnabledState();
      }
      
      console.debug(`Extension enabled state set to: ${enabled}`);
      
      // Force UI update regardless of backend response
      extensionToggle.checked = enabled;
      updateExtensionStatusText(enabled);
    } catch (error) {
      console.error("Error setting extension state:", error);
      // Reset UI to match the actual state
      await loadExtensionEnabledState();
    }
  }
  
  /**
   * Update the extension status text
   */
  function updateExtensionStatusText(enabled) {
    extensionStatus.textContent = enabled ? "Enabled" : "Disabled";
    extensionStatus.style.color = enabled ? "#28a745" : "#cb2431";
  }
});
