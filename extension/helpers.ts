export function shouldAddActionNotificationButton(url: string) {
  // This is black magic. Basically, this regex matches the following kinds of URLs:
  // - https://github.com/SpookSoftware/github-actions-browser-notifications/actions
  // - https://github.com/SpookSoftware/github-actions-browser-notifications/pull/22932/checks
  // - https://github.com/SpookSoftware/github-actions-browser-notifications/actions/workflows/waitAMinute.yml
  const pattern =
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/(actions|actions\/workflows\/[^/]+|pull\/[^/]+\/checks)$/;
  return pattern.test(url);
}

export function createNotificationButton({
  runId,
  jobId,
  owner,
  repository,
}: {
  runId?: string;
  jobId?: string;
  owner: string;
  repository: string;
}) {
  const button = document.createElement("button");
  button.classList.add("Button");
  button.dataset.runId = runId;
  button.dataset.jobId = jobId;
  button.dataset.owner = owner;
  button.dataset.repository = repository;
  return button;
}

export function createNotificationSVG() {
  const NOTIFICATION_BELL_PATH =
    "M12 1c3.681 0 7 2.565 7 6v4.539c0 .642.189 1.269.545 1.803l2.2 3.298A1.517 1.517 0 0 1 20.482 19H15.5a3.5 3.5 0 1 1-7 0H3.519a1.518 1.518 0 0 1-1.265-2.359l2.2-3.299A3.25 3.25 0 0 0 5 11.539V7c0-3.435 3.318-6 7-6ZM6.5 7v4.539a4.75 4.75 0 0 1-.797 2.635l-2.2 3.298-.003.01.001.007.004.006.006.004.007.001h16.964l.007-.001.006-.004.004-.006.001-.006a.017.017 0 0 0-.003-.01l-2.199-3.299a4.753 4.753 0 0 1-.798-2.635V7c0-2.364-2.383-4.5-5.5-4.5S6.5 4.636 6.5 7ZM14 19h-4a2 2 0 1 0 4 0Z";
  const NOTIFICATION_BELL_VIEW_BOX = "0 0 24 24";
  const NOTIFICATION_BELL_WIDTH = "24";
  const NOTIFICATION_BELL_HEIGHT = "24";
  const svgElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  svgElement.setAttributeNS(null, "viewBox", NOTIFICATION_BELL_VIEW_BOX);
  svgElement.setAttributeNS(null, "width", NOTIFICATION_BELL_WIDTH);
  svgElement.setAttributeNS(null, "height", NOTIFICATION_BELL_HEIGHT);

  svgElement.classList.add("octicon");
  svgElement.classList.add("color-fg-muted");

  const pathElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  pathElement.setAttributeNS(null, "d", NOTIFICATION_BELL_PATH);

  svgElement.appendChild(pathElement);
  return svgElement;
}

function addNotificationButton(element, { runId, jobId, owner, repository }) {
  const NOTIFICATION_BELL_PATH =
    "M12 1c3.681 0 7 2.565 7 6v4.539c0 .642.189 1.269.545 1.803l2.2 3.298A1.517 1.517 0 0 1 20.482 19H15.5a3.5 3.5 0 1 1-7 0H3.519a1.518 1.518 0 0 1-1.265-2.359l2.2-3.299A3.25 3.25 0 0 0 5 11.539V7c0-3.435 3.318-6 7-6ZM6.5 7v4.539a4.75 4.75 0 0 1-.797 2.635l-2.2 3.298-.003.01.001.007.004.006.006.004.007.001h16.964l.007-.001.006-.004.004-.006.001-.006a.017.017 0 0 0-.003-.01l-2.199-3.299a4.753 4.753 0 0 1-.798-2.635V7c0-2.364-2.383-4.5-5.5-4.5S6.5 4.636 6.5 7ZM14 19h-4a2 2 0 1 0 4 0Z";
  const NOTIFICATION_BELL_VIEW_BOX = "0 0 24 24";
  const NOTIFICATION_BELL_WIDTH = "24";
  const NOTIFICATION_BELL_HEIGHT = "24";

  if (jobId) {
    // Create a new button to contain the SVG
    const svgButton = document.createElement("button");
    svgButton.classList.add("Button");
    svgButton.dataset.runId = runId;
    svgButton.dataset.jobId = jobId;
    svgButton.dataset.owner = owner;
    svgButton.dataset.repository = repository;

    const svgElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    svgElement.setAttributeNS(null, "viewBox", NOTIFICATION_BELL_VIEW_BOX);
    svgElement.setAttributeNS(null, "width", NOTIFICATION_BELL_WIDTH);
    svgElement.setAttributeNS(null, "height", NOTIFICATION_BELL_HEIGHT);

    const pathElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    pathElement.setAttributeNS(null, "d", NOTIFICATION_BELL_PATH);

    svgElement.appendChild(pathElement);
    svgButton.appendChild(svgElement);
    element.appendChild(svgButton);

    svgButton.addEventListener("click", function (event) {
      const runId = event.currentTarget.dataset.runId;
      const jobId = event.currentTarget.dataset.jobId;
      const owner = event.currentTarget.dataset.owner;
      const repository = event.currentTarget.dataset.repository;

      chrome.runtime.sendMessage({
        action: "startMonitoring",
        runId,
        jobId,
        owner,
        repository,
        type: "job",
      });

      console.debug(
        `Sent message to start monitoring for job ${jobId} with owner ${owner} and repository ${repository}`
      );
    });

    console.debug(
      "Successfully added button with callback to element",
      element
    );
  } else {
    // Create a new button to contain the SVG
    const svgButton = document.createElement("button");
    svgButton.classList.add("Button");
    svgButton.dataset.runId = runId;
    svgButton.dataset.owner = owner;
    svgButton.dataset.repository = repository;

    const svgElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    svgElement.setAttributeNS(null, "viewBox", NOTIFICATION_BELL_VIEW_BOX);
    svgElement.setAttributeNS(null, "width", NOTIFICATION_BELL_WIDTH);
    svgElement.setAttributeNS(null, "height", NOTIFICATION_BELL_HEIGHT);

    const pathElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    pathElement.setAttributeNS(null, "d", NOTIFICATION_BELL_PATH);

    svgElement.appendChild(pathElement);
    svgButton.appendChild(svgElement);
    element.appendChild(svgButton);

    svgButton.addEventListener("click", function (event) {
      const runId = event.currentTarget.dataset.runId;
      const owner = event.currentTarget.dataset.owner;
      const repository = event.currentTarget.dataset.repository;

      chrome.runtime.sendMessage({
        action: "startMonitoring",
        runId,
        owner,
        repository,
        type: "action",
      });

      console.debug(
        `Sent message to start monitoring for ${runId} with owner ${owner} and repository ${repository}`
      );
    });

    console.debug(
      "Successfully added button with callback to element",
      element
    );
  }
}

export function getElementsMatchingSelectors(
  elements: NodeListOf<Element>,
  selectors: string[]
) {
  return Array.from(elements).filter((element) => {
    return selectors.some((selector) => element.matches(selector));
  });
}
