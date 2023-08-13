document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("notifyButton").addEventListener("click", () => {
    // chrome.runtime.sendMessage({ action: "startMonitoring" });
    console.debug("Creating alarm with name Kory")
    chrome.alarms.create("Kory", {
      periodInMinutes: .1
    })
  });
});
