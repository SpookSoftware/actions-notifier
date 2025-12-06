import { expect, describe, it, beforeEach, afterEach } from "bun:test";
import {
  createNotificationButton,
  shouldMonitorActions,
  createNotificationSVG,
  extractActionDataFromURL,
  selectorMatches,
  selectorHasChildren,
  encodeRequest,
  encode,
  decode,
  getElementToInsertNotificationButtonInto,
  shouldMonitorJobs,
  extractJobDataFromURL,
  isProperlyEncoded,
  createActionURL,
  createJobURL,
  createURL,
  assertIsHTMLElement,
  isButtoned,
  buildMonitoringPayloads,
  shouldMonitorPRs,
  shouldMonitorChecks,
  isValidGithubResponse,
  NOTIFICATION_BUTTON_CLASS,
  isGitHubDarkMode,
  getThemeAppropriateColor,
  setSVGColor,
  resetSVGColor,
  isStartMonitoringRequest,
  isStopMonitoringRequest,
  messageIsEnabledStatusChange,
  isGetExtensionEnabledResponse,
  hasClickHandler,
} from "@/helpers/pure";
import { ALARM_PREFIX } from "@/helpers/constants";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Register happy-dom for DOM API support
GlobalRegistrator.register();

// Clean up DOM between tests
beforeEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-color-mode");
});

// ============================================================================
// URL Pattern Matching Tests
// ============================================================================

describe("shouldMonitorActions", () => {
  it("returns true for specific action run URLs", () => {
    expect(
      shouldMonitorActions(
        "https://github.com/SpookSoftware/github-actions-browser-notifications/actions/workflows/waitAMinute.yml"
      )
    ).toBeTrue();
  });

  it("returns true for specific action run URLs with query params", () => {
    expect(
      shouldMonitorActions(
        "https://github.com/SpookSoftware/github-actions-browser-notifications/actions/workflows/waitAMinute.yml?kory=me"
      )
    ).toBeTrue();
  });

  it("returns true for general actions URLs", () => {
    expect(
      shouldMonitorActions(
        "https://github.com/SpookSoftware/github-actions-browser-notifications/actions"
      )
    ).toBeTrue();
  });

  it("returns true for all actions URLs with query params", () => {
    expect(
      shouldMonitorActions(
        "https://github.com/SpookSoftware/github-actions-browser-notifications/actions?kory=who"
      )
    ).toBeTrue();
  });

  it("returns false for PR checks URLs (regression)", () => {
    expect(
      shouldMonitorActions(
        "https://github.com/SpookSoftware/sandbox/pull/1/checks"
      )
    ).toBeFalse();
  });

  it("returns false for all other URLs", () => {
    const urls = [
      "https://github.com/orgs/SpookSoftware/projects?query=is%3Aopen",
      "https://github.com/orgs/SpookSoftware/repositories?type=source",
      "https://github.com/SpookSoftware",
      "https://github.com/SpookSoftware/repo/issues",
      "https://github.com/SpookSoftware/repo/pulls",
    ];
    const results = urls.map((url) => shouldMonitorActions(url));
    expect(results.every((result) => result === false)).toBeTrue();
  });
});

describe("shouldMonitorJobs", () => {
  it("returns true for action run URLs", () => {
    expect(
      shouldMonitorJobs(
        "https://github.com/SpookSoftware/sandbox/actions/runs/12447719676"
      )
    ).toBeTrue();
  });

  it("returns true for job run URLs", () => {
    expect(
      shouldMonitorJobs(
        "https://github.com/SpookSoftware/sandbox/actions/runs/11827241459/job/32954981270"
      )
    ).toBeTrue();
  });

  it("returns true for job run URLs with query params", () => {
    expect(
      shouldMonitorJobs(
        "https://github.com/SpookSoftware/sandbox/actions/runs/11827241459/job/32954981270?pr=1"
      )
    ).toBeTrue();
  });

  it("returns false for non-job URLs", () => {
    expect(
      shouldMonitorJobs("https://github.com/SpookSoftware/sandbox/actions")
    ).toBeFalse();
  });
});

describe("shouldMonitorPRs", () => {
  it("returns true for PR URLs", () => {
    expect(
      shouldMonitorPRs("https://github.com/SpookSoftware/sandbox/pull/1")
    ).toBeTrue();
  });

  it("returns true for PR URLs with query params", () => {
    expect(
      shouldMonitorPRs(
        "https://github.com/SpookSoftware/sandbox/pull/1?kory=yeah"
      )
    ).toBeTrue();
  });

  it("returns false for PR checks URLs", () => {
    expect(
      shouldMonitorPRs("https://github.com/SpookSoftware/sandbox/pull/1/checks")
    ).toBeFalse();
  });

  it("returns false for non-PR URLs", () => {
    expect(
      shouldMonitorPRs("https://github.com/SpookSoftware/sandbox/issues/1")
    ).toBeFalse();
  });
});

describe("shouldMonitorChecks", () => {
  it("returns true for check URLs", () => {
    expect(
      shouldMonitorChecks(
        "https://github.com/SpookSoftware/sandbox/pull/1/checks"
      )
    ).toBeTrue();
  });

  it("returns true for check URLs with query params", () => {
    expect(
      shouldMonitorChecks(
        "https://github.com/SpookSoftware/sandbox/pull/1/checks?kory=woo"
      )
    ).toBeTrue();
  });

  it("returns false for non-check URLs", () => {
    expect(
      shouldMonitorChecks("https://github.com/SpookSoftware/sandbox/pull/1")
    ).toBeFalse();
  });
});

// ============================================================================
// URL Parsing/Creation Tests
// ============================================================================

describe("extractActionDataFromURL", () => {
  it("extracts owner, repository, and runId from a valid URL", () => {
    const url =
      "https://github.com/SpookSoftware/sandbox/actions/runs/11883722967";
    const result = extractActionDataFromURL(url);
    expect(result).toEqual({
      owner: "SpookSoftware",
      repository: "sandbox",
      runId: "11883722967",
    });
  });

  it("throws an error if the URL is invalid", () => {
    const url = "invalid-url";
    expect(() => extractActionDataFromURL(url)).toThrowError(
      "Invalid URL: invalid-url"
    );
  });

  it("strips query parameters from the URL", () => {
    const url =
      "https://github.com/SpookSoftware/sandbox/actions/runs/11883722967?pr=1";
    const { runId } = extractActionDataFromURL(url);
    expect(runId).toEqual("11883722967");
  });

  it("throws an error if any part is missing", () => {
    const url = "https://github.com/SpookSoftware/sandbox/actions/runs/";
    expect(() => extractActionDataFromURL(url)).toThrowError("Missing runId");
  });
});

describe("extractJobDataFromURL", () => {
  it("extracts owner, repository, runId, and jobId from a valid URL", () => {
    const url =
      "https://github.com/SpookSoftware/sandbox/actions/runs/12447719676/job/34751516975";
    const result = extractJobDataFromURL(url);
    expect(result).toEqual({
      owner: "SpookSoftware",
      repository: "sandbox",
      runId: "12447719676",
      jobId: "34751516975",
    });
  });

  it("throws an error if the URL is invalid", () => {
    const url = "invalid-url";
    expect(() => extractJobDataFromURL(url)).toThrowError(
      "Invalid URL: invalid-url"
    );
  });

  it("strips query parameters from the URL", () => {
    const url =
      "https://github.com/SpookSoftware/sandbox/actions/runs/13460967257/job/37615937628?pr=1";
    const { jobId } = extractJobDataFromURL(url);
    expect(jobId).toEqual("37615937628");
  });

  it("throws an error if any part is missing", () => {
    const url = "https://github.com/SpookSoftware/sandbox/actions/runs/12345";
    expect(() => extractJobDataFromURL(url)).toThrowError("Missing jobId");
  });
});

describe("createActionURL", () => {
  it("creates a URL for an action", () => {
    const decoded = {
      runId: "69",
      owner: "whoever",
      repository: "rocks-and-other-things",
    };
    expect(createActionURL(decoded)).toEqual(
      "https://github.com/whoever/rocks-and-other-things/actions/runs/69"
    );
  });
});

describe("createJobURL", () => {
  it("creates a URL for a job", () => {
    const decoded = {
      runId: "69",
      jobId: "420",
      owner: "whoever",
      repository: "rocks-and-other-things",
    };
    expect(createJobURL(decoded)).toEqual(
      "https://github.com/whoever/rocks-and-other-things/actions/runs/69/job/420"
    );
  });
});

describe("createURL", () => {
  it("creates a URL for an action when there is no jobId", () => {
    const decoded = {
      runId: "69",
      owner: "whoever",
      repository: "rocks-and-other-things",
    };
    expect(createURL(decoded)).toEqual(
      "https://github.com/whoever/rocks-and-other-things/actions/runs/69"
    );
  });

  it("creates a URL for a job when there is a jobId", () => {
    const decoded = {
      runId: "69",
      jobId: "420",
      owner: "whoever",
      repository: "rocks-and-other-things",
    };
    expect(createURL(decoded)).toEqual(
      "https://github.com/whoever/rocks-and-other-things/actions/runs/69/job/420"
    );
  });
});

// ============================================================================
// Encoding/Decoding Tests
// ============================================================================

describe("encode", () => {
  it("encodes action data without jobId", () => {
    const result = encode({
      runId: "123",
      owner: "SpookSoftware",
      repository: "github-actions-browser-notifications",
    });
    expect(result).toEqual(
      "123|SpookSoftware|github-actions-browser-notifications"
    );
  });

  it("encodes job data with jobId", () => {
    const result = encode({
      runId: "123",
      jobId: "456",
      owner: "SpookSoftware",
      repository: "github-actions-browser-notifications",
    });
    expect(result).toEqual(
      "123|456|SpookSoftware|github-actions-browser-notifications"
    );
  });
});

describe("encodeRequest", () => {
  it("encodes an action request correctly", () => {
    const request = {
      type: "action",
      task: "start-monitoring",
      runId: "123",
      owner: "SpookSoftware",
      repository: "github-actions-browser-notifications",
    } as const;
    const result = encodeRequest(request);
    expect(result).toEqual(
      "123|SpookSoftware|github-actions-browser-notifications"
    );
  });

  it("encodes a job request correctly", () => {
    const request = {
      type: "job",
      task: "start-monitoring",
      runId: "123",
      jobId: "456",
      owner: "SpookSoftware",
      repository: "github-actions-browser-notifications",
    } as const;
    const result = encodeRequest(request);
    expect(result).toEqual(
      "123|456|SpookSoftware|github-actions-browser-notifications"
    );
  });

  it("throws an error if the request format is not recognized", () => {
    const request = {
      type: "unknown",
    };
    expect(() => encodeRequest(request as any)).toThrow(
      "Request was in a format not recognized"
    );
  });
});

describe("decode", () => {
  it("splits the encoded string into runId, owner, and repository when appropriate", () => {
    // decode expects strings with the ALARM_PREFIX
    const encoded = `${ALARM_PREFIX}123|SpookSoftware|github-actions-browser-notifications`;
    expect(decode(encoded)).toEqual({
      runId: "123",
      owner: "SpookSoftware",
      repository: "github-actions-browser-notifications",
    });
  });

  it("splits the encoded string into runId, jobId, owner, and repository when appropriate", () => {
    const encoded = `${ALARM_PREFIX}123|456|SpookSoftware|github-actions-browser-notifications`;
    expect(decode(encoded)).toEqual({
      runId: "123",
      jobId: "456",
      owner: "SpookSoftware",
      repository: "github-actions-browser-notifications",
    });
  });

  it("throws an error if the encoded string is not in the correct format", () => {
    const badlyEncoded = "Rats...rats make me crazy";
    expect(() => decode(badlyEncoded as any)).toThrowError();
  });
});

describe("isProperlyEncoded", () => {
  it("returns true if the string is encoded as an action", () => {
    const encoded = "123|owner|repo";
    expect(isProperlyEncoded(encoded)).toBeTrue();
  });

  it("returns true if the string is encoded as a job", () => {
    const encoded = "123|456|owner|repo";
    expect(isProperlyEncoded(encoded)).toBeTrue();
  });

  it("returns false if the string is not properly encoded", () => {
    const encoded = "123|owner";
    expect(isProperlyEncoded(encoded)).toBeFalse();
  });

  it("returns false for empty string", () => {
    expect(isProperlyEncoded("")).toBeFalse();
  });

  it("returns false for string with too many parts", () => {
    expect(isProperlyEncoded("1|2|3|4|5")).toBeFalse();
  });
});

// ============================================================================
// Type Guard Tests
// ============================================================================

describe("isValidGithubResponse", () => {
  it("returns true for valid GitHub response objects", () => {
    const validResponse = { status: "completed", name: "action-name" };
    expect(isValidGithubResponse(validResponse)).toBeTrue();
  });

  it("returns true for valid GitHub response with conclusion", () => {
    const validResponse = {
      status: "completed",
      name: "action-name",
      conclusion: "success",
    };
    expect(isValidGithubResponse(validResponse)).toBeTrue();
  });

  it("returns false for objects missing the status property", () => {
    const invalidResponse = { name: "action-name" };
    expect(isValidGithubResponse(invalidResponse)).toBeFalse();
  });

  it("returns false for objects missing the name property", () => {
    const invalidResponse = { status: "completed" };
    expect(isValidGithubResponse(invalidResponse)).toBeFalse();
  });

  it("returns false for non-object types", () => {
    expect(isValidGithubResponse(null)).toBeFalse();
    expect(isValidGithubResponse(undefined)).toBeFalse();
    expect(isValidGithubResponse("string")).toBeFalse();
    expect(isValidGithubResponse(123)).toBeFalse();
    expect(isValidGithubResponse(true)).toBeFalse();
  });
});

describe("isStartMonitoringRequest", () => {
  it("returns true for valid start monitoring request", () => {
    const request = {
      task: "start-monitoring",
      runId: "123",
      owner: "test",
      repository: "repo",
      type: "action",
    };
    expect(isStartMonitoringRequest(request)).toBeTrue();
  });

  it("returns false for stop monitoring request", () => {
    const request = {
      task: "stop-monitoring",
      runId: "123",
      owner: "test",
      repository: "repo",
      type: "action",
    };
    expect(isStartMonitoringRequest(request)).toBeFalse();
  });

  it("returns false for non-object types", () => {
    expect(isStartMonitoringRequest(null)).toBeFalse();
    expect(isStartMonitoringRequest(undefined)).toBeFalse();
    expect(isStartMonitoringRequest("string")).toBeFalse();
  });

  it("returns false for objects without task property", () => {
    expect(isStartMonitoringRequest({ runId: "123" })).toBeFalse();
  });
});

describe("isStopMonitoringRequest", () => {
  it("returns true for valid stop monitoring request", () => {
    const request = {
      task: "stop-monitoring",
      runId: "123",
      owner: "test",
      repository: "repo",
      type: "action",
    };
    expect(isStopMonitoringRequest(request)).toBeTrue();
  });

  it("returns false for start monitoring request", () => {
    const request = {
      task: "start-monitoring",
      runId: "123",
      owner: "test",
      repository: "repo",
      type: "action",
    };
    expect(isStopMonitoringRequest(request)).toBeFalse();
  });

  it("returns false for non-object types", () => {
    expect(isStopMonitoringRequest(null)).toBeFalse();
    expect(isStopMonitoringRequest(undefined)).toBeFalse();
  });
});

describe("messageIsEnabledStatusChange", () => {
  it("returns true for valid enabled status change message", () => {
    const message = { action: "extensionStateChanged", enabled: true };
    expect(messageIsEnabledStatusChange(message)).toBeTrue();
  });

  it("returns true when enabled is false", () => {
    const message = { action: "extensionStateChanged", enabled: false };
    expect(messageIsEnabledStatusChange(message)).toBeTrue();
  });

  it("returns false for different action", () => {
    const message = { action: "somethingElse", enabled: true };
    expect(messageIsEnabledStatusChange(message)).toBeFalse();
  });

  it("returns false when enabled is not a boolean", () => {
    const message = { action: "extensionStateChanged", enabled: "yes" };
    expect(messageIsEnabledStatusChange(message)).toBeFalse();
  });
});

describe("isGetExtensionEnabledResponse", () => {
  it("returns true for valid response with enabled true", () => {
    const response = { status: "ok", data: { enabled: true } };
    expect(isGetExtensionEnabledResponse(response)).toBeTrue();
  });

  it("returns true for valid response with enabled false", () => {
    const response = { status: "ok", data: { enabled: false } };
    expect(isGetExtensionEnabledResponse(response)).toBeTrue();
  });

  it("returns false for error status", () => {
    const response = { status: "error", data: { enabled: true } };
    expect(isGetExtensionEnabledResponse(response)).toBeFalse();
  });

  it("returns false for missing data", () => {
    const response = { status: "ok" };
    expect(isGetExtensionEnabledResponse(response)).toBeFalse();
  });

  it("returns false for non-object types", () => {
    expect(isGetExtensionEnabledResponse(null)).toBeFalse();
    expect(isGetExtensionEnabledResponse(undefined)).toBeFalse();
    expect(isGetExtensionEnabledResponse("string")).toBeFalse();
  });
});

// ============================================================================
// DOM Utility Tests
// ============================================================================

describe("selectorMatches", () => {
  it("returns true if the item matches the selector", () => {
    document.body.innerHTML = `<div class="test"></div>`;
    const item = document.querySelector(".test");
    expect(item).not.toBeNull();
    expect(selectorMatches(".test", item!)).toBeTrue();
  });

  it("returns false if the item does not match the selector", () => {
    document.body.innerHTML = `<div class="test"></div>`;
    const item = document.querySelector(".test");
    expect(item).not.toBeNull();
    expect(selectorMatches(".nonexistent", item!)).toBeFalse();
  });
});

describe("selectorHasChildren", () => {
  it("returns true if the item has a child matching the selector", () => {
    document.body.innerHTML = `<div class="parent"><div class="child"></div></div>`;
    const item = document.querySelector(".parent");
    expect(item).not.toBeNull();
    expect(selectorHasChildren(".child", item!)).toBeTrue();
  });

  it("returns false if the item does not have a child matching the selector", () => {
    document.body.innerHTML = `<div class="parent"><div class="child"></div></div>`;
    const item = document.querySelector(".parent");
    expect(item).not.toBeNull();
    expect(selectorHasChildren(".nonexistent", item!)).toBeFalse();
  });
});

describe("assertIsHTMLElement", () => {
  it("does not throw an error if the element is an HTMLElement", () => {
    const div = document.createElement("div");
    expect(() => assertIsHTMLElement(div)).not.toThrow();
  });

  it("throws an error if the element is not an HTMLElement", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    expect(() => assertIsHTMLElement(svg as any)).toThrow(
      "Expected element to be an HTMLElement"
    );
  });
});

describe("isButtoned", () => {
  it("should return the button element if it exists", () => {
    const element = document.createElement("div");
    const button = document.createElement("button");
    button.classList.add(NOTIFICATION_BUTTON_CLASS);
    element.appendChild(button);

    const result = isButtoned(element);
    expect(result).toBe(button);
  });

  it("should return null if the button element does not exist", () => {
    const element = document.createElement("div");
    const result = isButtoned(element);
    expect(result).toBeNull();
  });
});

describe("hasClickHandler", () => {
  it("returns true if element has onclick handler", () => {
    const element = document.createElement("button");
    element.onclick = () => {};
    expect(hasClickHandler(element)).toBeTrue();
  });

  it("returns false if element has no onclick handler", () => {
    const element = document.createElement("button");
    expect(hasClickHandler(element)).toBeFalse();
  });

  it("returns false for non-HTMLElement", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    expect(hasClickHandler(svg)).toBeFalse();
  });
});

describe("getElementToInsertNotificationButtonInto", () => {
  it("returns the correct element to insert the notification button into", () => {
    document.body.innerHTML = `
      <div class="workflow-run">
        <div>
          <div></div>
          <div></div>
          <div class="between-branch-and-time"></div>
        </div>
      </div>
    `;
    const actionRunElement = document.querySelector(".workflow-run");
    expect(actionRunElement).not.toBeNull();
    const result = getElementToInsertNotificationButtonInto(actionRunElement!);
    expect(result).toBeInstanceOf(Element);
    expect(result.classList.contains("between-branch-and-time")).toBeTrue();
  });

  it("throws an error if the childDiv is not present", () => {
    document.body.innerHTML = `<div class="workflow-run"></div>`;
    const actionRunElement = document.querySelector(".workflow-run");
    expect(actionRunElement).not.toBeNull();
    expect(() =>
      getElementToInsertNotificationButtonInto(actionRunElement!)
    ).toThrowError("Expected children to be present");
  });

  it("throws an error if the betweenBranchAndTime element is not present", () => {
    document.body.innerHTML = `
      <div class="workflow-run">
        <div>
          <div></div>
          <div></div>
        </div>
      </div>
    `;
    const actionRunElement = document.querySelector(".workflow-run");
    expect(actionRunElement).not.toBeNull();
    expect(() =>
      getElementToInsertNotificationButtonInto(actionRunElement!)
    ).toThrowError(
      "Element does not have the expected structure of a action run element"
    );
  });
});

// ============================================================================
// Theme/Color Function Tests
// ============================================================================

describe("isGitHubDarkMode", () => {
  it("returns true when data-color-mode is dark", () => {
    document.documentElement.setAttribute("data-color-mode", "dark");
    expect(isGitHubDarkMode()).toBeTrue();
  });

  it("returns false when data-color-mode is light", () => {
    document.documentElement.setAttribute("data-color-mode", "light");
    expect(isGitHubDarkMode()).toBeFalse();
  });

  it("returns false when data-color-mode is not set", () => {
    document.documentElement.removeAttribute("data-color-mode");
    expect(isGitHubDarkMode()).toBeFalse();
  });
});

describe("getThemeAppropriateColor", () => {
  it("returns bright yellow for dark mode", () => {
    document.documentElement.setAttribute("data-color-mode", "dark");
    expect(getThemeAppropriateColor("yellow")).toEqual("#ffd700");
  });

  it("returns dimmer yellow for light mode", () => {
    document.documentElement.setAttribute("data-color-mode", "light");
    expect(getThemeAppropriateColor("yellow")).toEqual("#ffdf5d");
  });

  it("returns bright red for dark mode", () => {
    document.documentElement.setAttribute("data-color-mode", "dark");
    expect(getThemeAppropriateColor("red")).toEqual("#ff6b6b");
  });

  it("returns dimmer red for light mode", () => {
    document.documentElement.setAttribute("data-color-mode", "light");
    expect(getThemeAppropriateColor("red")).toEqual("#d73a49");
  });

  it("returns original color for unknown colors", () => {
    expect(getThemeAppropriateColor("blue")).toEqual("blue");
    expect(getThemeAppropriateColor("green")).toEqual("green");
  });
});

describe("setSVGColor", () => {
  it("sets the color on the SVG element", () => {
    const svg = createNotificationSVG();
    setSVGColor(svg, "yellow");
    expect(svg.style.color).not.toBe("");
    expect(svg.classList.contains("color-fg-muted")).toBeFalse();
  });

  it("removes color-fg-muted class", () => {
    const svg = createNotificationSVG();
    expect(svg.classList.contains("color-fg-muted")).toBeTrue();
    setSVGColor(svg, "yellow");
    expect(svg.classList.contains("color-fg-muted")).toBeFalse();
  });

  it("applies drop-shadow filter for yellow", () => {
    const svg = createNotificationSVG();
    setSVGColor(svg, "yellow");
    expect(svg.style.filter).toContain("drop-shadow");
  });

  it("applies drop-shadow filter for red", () => {
    const svg = createNotificationSVG();
    setSVGColor(svg, "red");
    expect(svg.style.filter).toContain("drop-shadow");
  });
});

describe("resetSVGColor", () => {
  it("resets the SVG color to default", () => {
    const svg = createNotificationSVG();
    setSVGColor(svg, "yellow");
    resetSVGColor(svg);
    expect(svg.style.color).toBe("");
    expect(svg.style.filter).toBe("");
    expect(svg.classList.contains("color-fg-muted")).toBeTrue();
  });
});

// ============================================================================
// Button/SVG Creation Tests
// ============================================================================

describe("createNotificationButton", () => {
  it("returns a button element", () => {
    const button = createNotificationButton({
      runId: "123",
      jobId: "123",
      repository: "SpookSoftware/github-actions-browser-notifications",
      owner: "SpookSoftware",
    });
    expect(button).toBeInstanceOf(HTMLButtonElement);
  });

  it("adds datasets to the button with the arguments given", () => {
    const button = createNotificationButton({
      runId: "123",
      jobId: "111",
      repository: "bitcoin-miner-for-clams",
      owner: "Hingle McCringleberry",
    });
    expect(button.dataset.runId).toEqual("123");
    expect(button.dataset.jobId).toEqual("111");
    expect(button.dataset.repository).toEqual("bitcoin-miner-for-clams");
    expect(button.dataset.owner).toEqual("Hingle McCringleberry");
  });

  it("adds the NOTIFICATION_BUTTON_CLASS", () => {
    const button = createNotificationButton({
      runId: "123",
      owner: "test",
      repository: "repo",
    });
    expect(button.classList.contains(NOTIFICATION_BUTTON_CLASS)).toBeTrue();
  });

  it("applies disabled styles when disabled is true", () => {
    const button = createNotificationButton({
      runId: "123",
      owner: "test",
      repository: "repo",
      disabled: true,
    });
    expect(button.classList.contains("disabled")).toBeTrue();
    expect(button.style.opacity).toEqual("0.6");
    expect(button.style.cursor).toEqual("not-allowed");
    expect(button.title).toEqual("Extension disabled");
  });

  it("does not apply disabled styles when disabled is false", () => {
    const button = createNotificationButton({
      runId: "123",
      owner: "test",
      repository: "repo",
      disabled: false,
    });
    expect(button.classList.contains("disabled")).toBeFalse();
    expect(button.style.cursor).toEqual("pointer");
  });

  it("applies dark mode styles when GitHub is in dark mode", () => {
    document.documentElement.setAttribute("data-color-mode", "dark");
    const button = createNotificationButton({
      runId: "123",
      owner: "test",
      repository: "repo",
    });
    expect(button.style.color).toEqual("#c9d1d9");
  });

  it("applies light mode styles when GitHub is in light mode", () => {
    document.documentElement.setAttribute("data-color-mode", "light");
    const button = createNotificationButton({
      runId: "123",
      owner: "test",
      repository: "repo",
    });
    expect(button.style.color).toEqual("#24292e");
  });
});

describe("createNotificationSVG", () => {
  it("creates an SVG element with the correct attributes", () => {
    const svg = createNotificationSVG();
    expect(svg).toBeInstanceOf(SVGElement);
    expect(svg.getAttribute("viewBox")).toEqual("0 0 24 24");
    // Note: actual implementation uses 16x16
    expect(svg.getAttribute("width")).toEqual("16");
    expect(svg.getAttribute("height")).toEqual("16");
  });

  it("creates a bell path element", () => {
    const svg = createNotificationSVG();
    const paths = svg.querySelectorAll("path");
    // Should have both bell and clapper paths
    expect(paths.length).toEqual(2);
  });

  it("has the octicon class", () => {
    const svg = createNotificationSVG();
    expect(svg.classList.contains("octicon")).toBeTrue();
  });

  it("has the color-fg-muted class initially", () => {
    const svg = createNotificationSVG();
    expect(svg.classList.contains("color-fg-muted")).toBeTrue();
  });

  it("uses stroke for the paths", () => {
    const svg = createNotificationSVG();
    const path = svg.querySelector("path");
    expect(path).not.toBeNull();
    expect(path!.getAttribute("stroke")).toEqual("currentColor");
    expect(path!.getAttribute("fill")).toEqual("none");
  });
});

// ============================================================================
// Payload Building Tests
// ============================================================================

describe("buildMonitoringPayloads", () => {
  it("builds start and stop payloads for an action", () => {
    const payloads = buildMonitoringPayloads({
      runId: "123",
      owner: "SpookSoftware",
      repository: "github-actions-browser-notifications",
    });

    expect(payloads.start).toEqual({
      runId: "123",
      owner: "SpookSoftware",
      repository: "github-actions-browser-notifications",
      task: "start-monitoring",
      type: "action",
    });

    expect(payloads.stop).toEqual({
      runId: "123",
      owner: "SpookSoftware",
      repository: "github-actions-browser-notifications",
      task: "stop-monitoring",
      type: "action",
    });
  });

  it("builds start and stop payloads for a job", () => {
    const payloads = buildMonitoringPayloads({
      runId: "123",
      jobId: "456",
      owner: "SpookSoftware",
      repository: "github-actions-browser-notifications",
    });

    expect(payloads.start).toEqual({
      runId: "123",
      jobId: "456",
      owner: "SpookSoftware",
      repository: "github-actions-browser-notifications",
      task: "start-monitoring",
      type: "job",
    });

    expect(payloads.stop).toEqual({
      runId: "123",
      jobId: "456",
      owner: "SpookSoftware",
      repository: "github-actions-browser-notifications",
      task: "stop-monitoring",
      type: "job",
    });
  });
});
