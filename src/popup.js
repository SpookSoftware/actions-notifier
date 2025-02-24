document.addEventListener("DOMContentLoaded", function () {
  chrome.storage.sync.get("githubToken", (data) => {
    if (data.githubToken) {
      document.getElementById("githubToken").value = data.githubToken;
    }
  });

  document.getElementById("tokenForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const token = document.getElementById("githubToken").value;
    chrome.storage.sync.set({ githubToken: token }, () => {
      console.debug("GitHub token saved.");
    });
  });
});
