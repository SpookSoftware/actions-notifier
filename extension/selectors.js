// Action stuff
export const WORKFLOW_RUN_SELECTOR =
  "#partial-actions-workflow-runs [data-url*='workflow-run']";
export const CURRENTLY_RUNNING_SELECTOR =
  "svg[aria-label*='currently running']";
export const QUEUED_SELECTOR = "svg[aria-label*='queued']";
export const SUCCESSFUL_SELECTOR = "svg[aria-label*='completed successfully']";

// These are ripped from the DOM "copy selector" option
export const WORKFLOW_RUNS_CONTAINER_SELECTOR =
  "#repo-content-pjax-container > split-page-layout > div > div > div.PageLayout-region.PageLayout-content > div > div > div.Box.Box--responsive.mt-3";
export const JOB_RUNS_CONTAINER_SELECTOR =
  "#repo-content-turbo-frame > div > div > split-page-layout > div > div.PageLayout-columns > div.PageLayout-region.PageLayout-pane.PageLayout-region--dividerNarrow-none-after.PageLayout-pane--sticky.border-right-0";

// Job stuff
export const JOB_RUN_SELECTOR = "li[data-item-id^='job']";

export const SUCCESSFUL_JOB_RUN_SELECTOR = `${JOB_RUN_SELECTOR} svg[aria-label*='completed successfully']`;
export const CURRENTLY_RUNNING_JOB_RUN_SELECTOR = `${JOB_RUN_SELECTOR} svg[aria-label*='currently running']`;
export const QUEUED_JOB_RUN_SELECTOR = `${JOB_RUN_SELECTOR} svg[aria-label*='queued']`;
export const FAILED_JOB_RUN_SELECTOR = `${JOB_RUN_SELECTOR} svg[aria-label*='failed']`;

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

// Untested
export const PR_PAGE_CONTAINER_SELECTOR = "div.branch-action-body";
export const PR_PAGE_JOB_SELECTOR = "div.merge-status-item";
export const PR_PAGE_REGEX =
  /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/[^/]+\/?$/;
