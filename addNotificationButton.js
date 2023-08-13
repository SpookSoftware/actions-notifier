function processElements() {
  const workflowRunElements = document.querySelectorAll(
    "[data-url*='workflow-run']"
  );

  const filteredDivs = Array.from(workflowRunElements).filter((div) => {
    return (
      div.querySelector("svg[aria-label='currently running']") !== null ||
      div.querySelector("svg[aria-label='queued']") !== null
    );
  });

  filteredDivs.forEach((element) => {
    // Get the first a element inside the element
    const link = element.querySelector("a");
    const [_, _2, _3, owner, repository, _4, _5, runId] = link.href.split("/");

    // Create a new button to contain the SVG
    const svgButton = document.createElement("button");
    svgButton.dataset.runId = runId;
    svgButton.dataset.owner = owner;
    svgButton.dataset.repository = repository;

    // Create the SVG using the provided path
    const svgElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    svgElement.setAttributeNS(null, "viewBox", "0 0 24 24");
    svgElement.setAttributeNS(null, "width", "24");
    svgElement.setAttributeNS(null, "height", "24");

    const pathElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    pathElement.setAttributeNS(
      null,
      "d",
      "M12 1c3.681 0 7 2.565 7 6v4.539c0 .642.189 1.269.545 1.803l2.2 3.298A1.517 1.517 0 0 1 20.482 19H15.5a3.5 3.5 0 1 1-7 0H3.519a1.518 1.518 0 0 1-1.265-2.359l2.2-3.299A3.25 3.25 0 0 0 5 11.539V7c0-3.435 3.318-6 7-6ZM6.5 7v4.539a4.75 4.75 0 0 1-.797 2.635l-2.2 3.298-.003.01.001.007.004.006.006.004.007.001h16.964l.007-.001.006-.004.004-.006.001-.006a.017.017 0 0 0-.003-.01l-2.199-3.299a4.753 4.753 0 0 1-.798-2.635V7c0-2.364-2.383-4.5-5.5-4.5S6.5 4.636 6.5 7ZM14 19h-4a2 2 0 1 0 4 0Z"
    );

    svgElement.appendChild(pathElement);
    svgButton.appendChild(svgElement);

    element.appendChild(svgButton);

    // Add a click listener to handle clicks
    svgButton.addEventListener("click", function (event) {
      const runId = event.currentTarget.dataset.runId;
      const owner = event.currentTarget.dataset.owner;
      const repository = event.currentTarget.dataset.repository;

      chrome.runtime.sendMessage({
        action: "startMonitoring",
        runId,
        owner,
        repository,
      });
    });
  });
}

// This is ripped from the DOM "copy selector" option and will surely need to be refactored
const targetNode = document.querySelector(
  "#repo-content-pjax-container > split-page-layout > div > div > div.PageLayout-region.PageLayout-content > div > div > div.Box.Box--responsive.mt-3"
);

const config = { attributes: true, childList: true, subtree: true };

const callback = function (mutationsList, observer) {
  mutationsList.forEach((mutation) => {
    if (mutation.type === "childList" && mutation.addedNodes.length > 0) {

      console.debug("Nodes added:", mutation.addedNodes);

      for (const addedNode of mutation.addedNodes) {
        if (weWantIt(addedNode)) {
          // If I coded this correctly, only now do we want to process the elements!

          console.debug("We want it:", addedNode);

        }
      }
    }
  });
};

function weWantIt(node) {
  return node.id && node.id.startsWith('check_suite')
}

const observer = new MutationObserver(callback);
observer.observe(targetNode, config);
