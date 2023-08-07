document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("notifyButton").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "startMonitoring" });
  });
});
