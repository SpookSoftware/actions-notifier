// This file provides a mock implementation of the browser API for testing
// and conditionally imports the real webextension-polyfill in extension environments

let browserPolyfill: any;

// Check if we're in a browser extension environment
const isExtensionEnvironment = () => {
  return typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;
};

// Create a mock browser object for testing environments
const createMockBrowser = () => {
  return {
    runtime: {
      sendMessage: async () => ({}),
    },
    storage: {
      local: {
        get: async () => ({}),
        set: async () => {},
        remove: async () => {},
      },
      sync: {
        get: async () => ({}),
        set: async () => {},
      },
    },
    alarms: {
      create: async () => {},
      clear: async () => true,
      clearAll: async () => {},
    },
    notifications: {
      create: async () => {},
    },
    tabs: {
      create: async () => {},
    },
  };
};

try {
  if (isExtensionEnvironment()) {
    // We're in a browser extension, use the real polyfill
    browserPolyfill = require("webextension-polyfill");
  } else {
    // We're in a test environment, use the mock
    browserPolyfill = createMockBrowser();
  }
} catch (error) {
  // If anything goes wrong, fall back to the mock
  console.warn("Using mock browser API:", error);
  browserPolyfill = createMockBrowser();
}

export default browserPolyfill;
