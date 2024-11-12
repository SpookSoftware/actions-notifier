import { expect, describe, it } from "bun:test";

import { shouldAddActionNotificationButton } from "../extension/helpers";

describe("shouldAddActionNotificationButton", () => {
  it("returns true for specific workflow run URLs", () => {
    expect(
      shouldAddActionNotificationButton(
        "https://github.com/SpookSoftware/github-actions-browser-notifications/actions/workflows/waitAMinute.yml"
      )
    ).toBeTrue();
  });
  it("returns true for all workflows URLs", () => {
    expect(
      shouldAddActionNotificationButton(
        "https://github.com/SpookSoftware/github-actions-browser-notifications/actions"
      )
    ).toBeTrue();
  });
  it("returns true for pull request URLs", () => {
    expect(
      shouldAddActionNotificationButton(
        "https://github.com/SpookSoftware/github-actions-browser-notifications/pull/22932/checks"
      )
    ).toBeTrue();
  });
});
