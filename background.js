self.addEventListener("activate", (event) => {
  // Do activation stuff here
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "startMonitoring") {
    console.debug(
      `Received request to monitor ${request.runId} for ${request.owner}/${request.repository}`
    );

    const { runId, owner, repository } = request;

    // Let's be fancy so we don't have to use any storage
    const encoded = `${runId}|${owner}|${repository}`;
    try {
      console.debug(`Creating alarm with name ${encoded}`);

      await chrome.alarms.create(encoded, {
        periodInMinutes: 0.1,
      });

      console.debug(`Resgistering notification click handler for ${encoded}`);
      await chrome.notifications.onClicked.addListener((notificationId) => {
        const [runId, owner, repository] = notificationId.split("|");
        const resultsURL = `https://github.com/${owner}/${repository}/actions/runs/${runId}`;
        chrome.tabs.create({
          active: true,
          url: resultsURL,
        });
        chrome.notifications.clear(encoded)
      });
      console.debug(`Notification click handler registered for ${encoded}`);

      console.debug(`Alarm ${encoded} created`);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const [runId, owner, repository] = alarm.name.split("|");

  const latestRunStatus = await checkActionStatus(runId, owner, repository);

  console.debug(`Alarm ${alarm.name} fired with status ${latestRunStatus}`);

  if (latestRunStatus === "completed") {
    chrome.notifications.create(alarm.name, {
      type: "basic",
      title: "Action Completed",
      message: `Action ${runId} has completed. Click the notification to view the results.`,
      iconUrl: "images/notification-24.png",
      requireInteraction: true,
    });

    console.debug(`Clearing alarm ${alarm.name}`);

    await chrome.alarms.clear(alarm.name);

    console.debug(`Alarm ${alarm.name} cleared`);
  }
});

async function checkActionStatus(runId, owner, repository) {
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

async function checkJobStatus(jobId, owner, repository) {}
