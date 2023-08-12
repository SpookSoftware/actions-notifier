// Get all
const workflowRunElements = document.querySelectorAll("[data-url*='workflow-run']");

const filteredDivs = Array.from(workflowRunElements).filter((div) => {
  return div.querySelector("svg[aria-label='currently running']") !== null;
});


console.log({ filteredDivs });

filteredDivs.forEach((element) => {
  // Get the first a element inside the element
  // https://github.com/kory-smith/peat/actions/runs/5786709541
  const link = element.querySelector("a");
  const [_, _2, _3, owner, repository, _4, _5, runId] = link.href.split("/");

  const btn = document.createElement("button"); // Create a new button element
  btn.innerText = "Kory added this button!"; // Set its text or innerHTML

  btn.dataset.runId = runId;
  btn.dataset.owner = owner;
  btn.dataset.repository = repository;

  btn.addEventListener("click", function (event) {
    const runId = event.target.dataset.runId;
    const owner = event.target.dataset.owner;
    const repository = event.target.dataset.repository;

    chrome.runtime.sendMessage(
      { action: "startMonitoring", runId, owner, repository }
    );
  });

  element.appendChild(btn);
});
