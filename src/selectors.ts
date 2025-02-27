// Action stuff
export const ACTION_RUNS_SELECTOR =
  "#partial-actions-workflow-runs [data-url*='workflow-run']";
export const CURRENTLY_RUNNING_SELECTOR =
  "svg[aria-label*='currently running']";
// Basically a synonym for "currently running"
export const IN_PROGRESS_SELECTOR = "svg[aria-label*='In progress']";
export const QUEUED_SELECTOR = "svg[aria-label*='queued']";
export const SUCCESSFUL_SELECTOR = "svg[aria-label*='completed successfully']";

// These are ripped from the DOM "copy selector" option
export const ACTION_RUNS_CONTAINER_SELECTOR =
  "#repo-content-pjax-container > split-page-layout > div > div > div.PageLayout-region.PageLayout-content > div > div > div.Box.Box--responsive.mt-3";

// Job stuff
export const JOB_RUN_SELECTOR = "li[data-item-id^='job']";
export const JOB_RUNS_CONTAINER_SELECTOR =
  "#repo-content-turbo-frame > div > div > split-page-layout > div > div.PageLayout-columns > div.PageLayout-region.PageLayout-pane.PageLayout-region--dividerNarrow-none-after.PageLayout-pane--sticky.border-right-0";
export const SUCCESSFUL_JOB_RUN_SELECTOR = `${JOB_RUN_SELECTOR} svg[aria-label*='completed successfully']`;
export const CURRENTLY_RUNNING_JOB_RUN_SELECTOR = `${JOB_RUN_SELECTOR} svg[aria-label*='currently running']`;
export const QUEUED_JOB_RUN_SELECTOR = `${JOB_RUN_SELECTOR} svg[aria-label*='queued']`;
export const FAILED_JOB_RUN_SELECTOR = `${JOB_RUN_SELECTOR} svg[aria-label*='failed']`;

// PR stuff
export const PR_CHECKS_CONTAINER_PARENT_SELECTOR = "div#partial-pull-merging";
export const PR_CHECKS_CONTAINER_GRANDPARENT_SELECTOR =
  "div.discussion-timeline-actions";
export const PR_CHECKS_CONTAINER_SELECTOR =
  "div.branch-action-body.timeline-comment--caret";
export const PR_CHECKS_CONTAINER_IS_OPEN_SELECTOR =
  "div.branch-action-item.js-details-container.Details.open";
export const PR_RUN_SELECTOR = "div.merge-status-item";
export const PR_RUN_LINK_SELECTOR = "a.status-actions";

// Checks page stuff
export const CHECKS_PAGE_CONTAINER_SELECTOR =
  "aside[aria-label='Check suites']";
