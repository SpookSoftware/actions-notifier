self.addEventListener("activate", (event) => {
  // Do activation stuff here
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startMonitoring") {
    const githubToken = "hehe";

    let checkWorkflowInterval;

    async function checkWorkflowStatus() {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repository}/actions/runs/${runId}`,
        {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      const data = await response.json();
      const latestRunStatus = data.status;

      return latestRunStatus;
    }

    checkWorkflowInterval = setInterval(async () => {
      const status = await checkWorkflowStatus();

      if (status === "completed") {
        chrome.notifications.create({
          type: "basic",
          title: "GitHub Actions",
          message: "Your workflow run has completed",
          iconUrl: "images/notification-24.png",
          requireInteraction: true,
        });

        clearInterval(checkWorkflowInterval);
      }
    }, 5000);
  }
});
