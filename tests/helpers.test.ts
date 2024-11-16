import { expect, describe, it } from "bun:test";
import {
  createNotificationButton,
  shouldAddActionNotificationButton,
  createNotificationSVG,
  selectorMatches,
} from "../extension/helpers";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Without this, the tests will fail because the extension uses the DOM API
GlobalRegistrator.register();

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
  it("returns false for all other URLs", () => {
    const urls = [
      "https://github.com/orgs/SpookSoftware/projects?query=is%3Aopen",
      "https://github.com/orgs/SpookSoftware/repositories?type=source",
      "https://github.com/SpookSoftware",
    ];
    const results = urls.map((url) => shouldAddActionNotificationButton(url));
    expect(results.every((result) => result === false)).toBeTrue();
  });
});

describe("createNotificationButton", () => {
  it("returns a button", () => {
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
});

describe("createNotificationSVG", () => {
  it("creates an SVG element with the correct attributes", () => {
    const svg = createNotificationSVG();
    expect(svg).toBeInstanceOf(SVGElement);
    expect(svg.getAttribute("viewBox")).toEqual("0 0 24 24");
    expect(svg.getAttribute("width")).toEqual("24");
    expect(svg.getAttribute("height")).toEqual("24");
  });

  it("creates a path element with the correct attributes", () => {
    const svg = createNotificationSVG();
    const path = svg.querySelector("path");
    expect(path).toBeInstanceOf(SVGPathElement);
    if (!path) {
      throw Error("Path doesn't exist but it should");
    }
    expect(path.getAttribute("d")).toEqual(
      "M12 1c3.681 0 7 2.565 7 6v4.539c0 .642.189 1.269.545 1.803l2.2 3.298A1.517 1.517 0 0 1 20.482 19H15.5a3.5 3.5 0 1 1-7 0H3.519a1.518 1.518 0 0 1-1.265-2.359l2.2-3.299A3.25 3.25 0 0 0 5 11.539V7c0-3.435 3.318-6 7-6ZM6.5 7v4.539a4.75 4.75 0 0 1-.797 2.635l-2.2 3.298-.003.01.001.007.004.006.006.004.007.001h16.964l.007-.001.006-.004.004-.006.001-.006a.017.017 0 0 0-.003-.01l-2.199-3.299a4.753 4.753 0 0 1-.798-2.635V7c0-2.364-2.383-4.5-5.5-4.5S6.5 4.636 6.5 7ZM14 19h-4a2 2 0 1 0 4 0Z"
    );
  });
});
describe("selectorMatches", () => {
  it("returns true when the selector matches an element", () => {
    const div = document.createElement("div");
    const span = document.createElement("span");
    span.classList.add("test-class");
    div.appendChild(span);

    expect(selectorMatches(div, ".test-class")).toBeTrue();
  });

  it("returns false when the selector does not match any element", () => {
    const div = document.createElement("div");
    const span = document.createElement("span");
    span.classList.add("test-class");
    div.appendChild(span);

    expect(selectorMatches(div, ".non-existent-class")).toBeFalse();
  });

  it("returns false when the element has no children", () => {
    const div = document.createElement("div");

    expect(selectorMatches(div, ".test-class")).toBeFalse();
  });

  it("returns true when the selector matches a nested element", () => {
    const div = document.createElement("div");
    const span = document.createElement("span");
    const nestedSpan = document.createElement("span");
    nestedSpan.classList.add("nested-class");
    span.appendChild(nestedSpan);
    div.appendChild(span);

    expect(selectorMatches(div, ".nested-class")).toBeTrue();
  });
});
