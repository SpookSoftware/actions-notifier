export const WORKFLOW_RUN_ATTRIBUTE_SELECTOR =
  "#partial-actions-workflow-runs [data-url*='workflow-run']";

export const CURRENTLY_RUNNING_ATTRIBUTE_SELECTOR =
  "svg[aria-label*='currently running']";
export const QUEUED_ATTRIBUTE_SELECTOR = "svg[aria-label*='queued']";
export const SUCCESSFUL_ATTRIBUTE_SELECTOR =
  "svg[aria-label*='completed successfully']";

// This is ripped from the DOM "copy selector" option and will surely need to be refactored
export const WORKFLOW_RUNS_CONTAINER_ATTRIBUTE_SELECTOR =
  "#repo-content-pjax-container > split-page-layout > div > div > div.PageLayout-region.PageLayout-content > div > div > div.Box.Box--responsive.mt-3";

// Action URLs
// https://github.com/SpookSoftware/github-actions-browser-notifications/actions/workflows/waitAMinute.yml
export const specificWorkflowPageRegex =
  /https:\/\/github\.com\/[-a-zA-Z0-9._~:\/?#[\]@!$&'()*+,;=%]+\/[-a-zA-Z0-9._~:\/?#[\]@!$&'()*+,;=%]+\/actions\/workflows\/.*/;
// https://github.com/SpookSoftware/github-actions-browser-notifications/actions
export const allWorkflowsPageRegex =
  /https:\/\/github\.com\/[-a-zA-Z0-9._~:\/?#[\]@!$&'()*+,;=%]+\/[-a-zA-Z0-9._~:\/?#[\]@!$&'()*+,;=%]+\/actions/;
// https://github.com/krogertechnology/esperanto/pull/22932/checks
export const prChecksPageRegex =
  /https:\/\/github\.com\/[-a-zA-Z0-9._~:\/?#[\]@!$&'()*+,;=%]+\/[-a-zA-Z0-9._~:\/?#[\]@!$&'()*+,;=%]+\/pull\/[-a-zA-Z0-9._~:\/?#[\]@!$&'()*+,;=%]+\/checks/;

export const PR_CHECKS_CONTAINER_SELECTOR = "aside";
export const PR_CHECKS_ACTION_LINK_SELECTOR = ".checks-list-item-name a";
