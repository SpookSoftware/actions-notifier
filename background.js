self.addEventListener("activate", (event) => {
  // Do activation stuff here
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startMonitoring") {
    const {runId, owner, repository} = request;

    let checkWorkflowInterval;
    checkWorkflowInterval = setInterval(async () => {
      self.ServiceWorkerRegistration.active
      const status = await checkWorkflowStatus(runId, owner, repository);
      console.log(`Polling. Status is ${status}`)

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

async function checkWorkflowStatus(runId, owner, repository) {
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