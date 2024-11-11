import { expect, describe, it } from "bun:test";

import { shouldAddActionNotificationButton } from "../extension/helpers";

describe("shouldAddActionNotificationButton", () => {
  it("should match specific workflow run URLs", () => {
    expect(
      shouldAddActionNotificationButton(
        "https://github.com/kory-smith/github-actions-browser-notifications/actions/workflows/waitAMinute.yml"
      )
    ).toBeTrue();
  });
  it("should match all workflows URLs", () => {
    expect(
      shouldAddActionNotificationButton(
        "https://github.com/kory-smith/github-actions-browser-notifications/actions"
      )
    ).toBeTrue();
  });
  it("should match pull request URLs", () => {
    expect(
      shouldAddActionNotificationButton(
        "https://github.com/kory-smith/github-actions-browser-notifications/pull/22932/checks"
      )
    ).toBeTrue();
  });
});
