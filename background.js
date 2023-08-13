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
    // this tells chrome to fire the alarm every 6 seconds
    try {

      console.debug(`Creating alarm with name ${encoded}`);

      await chrome.alarms.create(encoded, {
        periodInMinutes: 0.1,
      });

      console.debug(`Alarm ${encoded} created`);

    } catch (error) {
      console.error(error);
      throw error;
    }
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const [runId, owner, repository] = alarm.name.split("|");

  const latestRunStatus = await checkWorkflowStatus(runId, owner, repository);

  console.debug(`Alarm ${alarm.name} fired with status ${latestRunStatus}`);

  if (latestRunStatus === "completed") {
    chrome.notifications.create({
      type: "basic",
      title: "GitHub Actions",
      message: "Your workflow run has completed",
      iconUrl: "images/notification-24.png",
      requireInteraction: true,
    });

    console.debug(`Clearing alarm ${alarm.name}`);

    await chrome.alarms.clear(alarm.name);

    console.debug(`Alarm ${alarm.name} cleared`);
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
