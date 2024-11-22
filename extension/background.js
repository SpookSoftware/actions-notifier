self.addEventListener("activate", (event) => {
  console.log("I'm active! Whee!");

  chrome.alarms.clearAll(() => {
    console.log("Cleared all old alarms.");
  });
});

// ASYNC AWAIT NOT SUPPORTED
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "action" && request.action === "startMonitoring") {
    console.debug(
      `Received request to monitor action ${request.runId} for ${request.owner}/${request.repository}`
    );

    const { runId, owner, repository } = request;

    // Let's be fancy so we don't have to use any storage
    const encoded = `${runId}|${owner}|${repository}`;
    console.debug(`Creating alarm with name ${encoded}`);

    chrome.alarms
      .create(encoded, {
        periodInMinutes: 1,
      })
      .then((_res) => {
        console.debug(`Alarm ${encoded} created`);
        sendResponse({ status: "ok" });
      })
      .catch((err) => {
        sendResponse({ status: "error", error: err });
      });
  } else if (request.type === "job" && request.action === "startMonitoring") {
    console.debug(
      `Received request to monitor job ${request.jobId} in action action ${request.runId} for ${request.owner}/${request.repository}`
    );

    const { runId, jobId, owner, repository } = request;

    const encoded = `${runId}|${jobId}|${owner}|${repository}`;
    console.debug(`Creating alarm with name ${encoded}`);

    chrome.alarms
      .create(encoded, {
        periodInMinutes: 1,
      })
      .then((_res) => {
        console.debug(`Alarm ${encoded} created`);
        sendResponse({ status: "ok" });
      })
      .catch((err) => {
        sendResponse({ status: "error", error: err });
      });
  }
  // This signals to chrome that the connection will remain open until sendResponse is called.
  return true;
});

// chrome.alarms.onAlarm.addListener(async (alarm) => {
//   const isActionRun = alarm.name.split("|").length === 3;
//   if (isActionRun) {
//     const [runId, owner, repository] = alarm.name.split("|");

//     const { status, name } = await checkActionStatus(runId, owner, repository);

//     console.debug(`Alarm ${alarm.name} fired with status ${status}`);

//     if (status === "completed") {
//       chrome.notifications.create(alarm.name, {
//         type: "basic",
//         title: "Action Completed",
//         message: `Action ${name} has completed. Click the notification to view the results.`,
//         iconUrl: "images/notification-24.png",
//         requireInteraction: true,
//       });

//       console.debug(`Clearing alarm ${alarm.name}`);

//       await chrome.alarms.clear(alarm.name);

//       console.debug(`Alarm ${alarm.name} cleared`);
//     }
//   } else {
//     const [runId, jobId, owner, repository] = alarm.name.split("|");

//     const { status, name } = await checkJobStatus(jobId, owner, repository);

//     console.debug(`Alarm ${alarm.name} fired with status ${status}`);

//     if (status === "completed") {
//       chrome.notifications.create(alarm.name, {
//         type: "basic",
//         title: "Job completed",
//         message: `Job ${name} has completed. Click the notification to view the results.`,
//         iconUrl: "images/notification-24.png",
//         requireInteraction: true,
//       });

//       console.debug(`Clearing alarm ${alarm.name}`);

//       await chrome.alarms.clear(alarm.name);

//       console.debug(`Alarm ${alarm.name} cleared`);
//     }
//   }
// });

async function checkActionStatus(runId, owner, repository) {
  const url = `https://api.github.com/repos/${owner}/${repository}/actions/runs/${runId}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${githubToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  const data = await response.json();

  console.log(`Queried ${url} and got response ${JSON.stringify(data)}`);
  return {
    status: data.status,
    name: data.name,
  };
}

async function checkJobStatus(jobId, owner, repository) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repository}/actions/jobs/${jobId}`,
    {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  const data = await response.json();

  return {
    status: data.status,
    name: data.name,
  };
}
