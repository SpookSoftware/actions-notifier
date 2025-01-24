import { expect, describe, it, jest, spyOn } from "bun:test";
import {
  createNotificationButton,
  createOnMessageCallback,
  shouldAddActionNotificationButton,
  createNotificationSVG,
  extractActionDataFromURL,
  selectorMatches,
  selectorHasChildren,
  createMonitoringHandler,
  encodeRequest,
  parseRequest,
  decode,
  createOnAlarmCallback,
  checkStatus,
  checkActionStatus,
  checkJobStatus,
  assertGithubToken,
  getElementToInsertNotificationButtonInto,
  shouldAddJobNotificationButton,
  extractJobDataFromURL,
  isProperlyEncoded,
  createActionURL,
  createJobURL,
  createURL,
} from "../extension/helpers";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

import type {
  MonitorActionRequest,
  MonitorJobRequest,
  MonitorRequest,
} from "../types";

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

describe("shouldAddJobNotificationButton", () => {
  it("returns true for job run URLs", () => {
    expect(
      shouldAddJobNotificationButton(
        "https://github.com/SpookSoftware/sandbox/actions/runs/12447719676"
      )
    ).toBeTrue();
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

  it("throws an error if any part is missing", () => {
    const url = "https://github.com/SpookSoftware/sandbox/actions/runs/12345";
    expect(() => extractJobDataFromURL(url)).toThrowError("Missing jobId");
  });
});
describe("selectorMatches", () => {
  it("returns true if the item matches the selector", () => {
    document.body.innerHTML = `<div class="test"></div>`;
    const item = document.querySelector(".test");
    if (item) {
      expect(selectorMatches(".test", item)).toBeTrue();
    }
  });

  it("returns false if the item does not match the selector", () => {
    document.body.innerHTML = `<div class="test"></div>`;
    const item = document.querySelector(".test");
    if (item) {
      expect(selectorMatches(".nonexistent", item)).toBeFalse();
    }
  });
});
describe("selectorHasChildren", () => {
  it("returns true if the item has a child matching the selector", () => {
    document.body.innerHTML = `<div class="parent"><div class="child"></div></div>`;
    const item = document.querySelector(".parent");
    if (item) {
      expect(selectorHasChildren(".child", item)).toBeTrue();
    }
  });

  it("returns false if the item does not have a child matching the selector", () => {
    document.body.innerHTML = `<div class="parent"><div class="child"></div></div>`;
    const item = document.querySelector(".parent");
    if (item) {
      expect(selectorHasChildren(".nonexistent", item)).toBeFalse();
    }
  });
});
describe("createMonitoringHandler", () => {
  it("updates the SVG color to yellow if the response status is 'ok'", () => {
    const runId = "123";
    const owner = "SpookSoftware";
    const repository = "github-actions-browser-notifications";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    const callback = createMonitoringHandler({
      runId,
      owner,
      repository,
      svg,
    });

    global.chrome = {
      runtime: {
        // @ts-ignore
        sendMessage: (_message, callback) => {
          callback({ status: "ok" });
        },
      },
    };

    callback(new MouseEvent("click"));

    expect(svg.style.color).toBe("yellow");
    expect(svg.classList.contains("color-fg-muted")).toBeFalse();
  });

  it("updates the SVG color to red if the response status is not 'ok'", () => {
    const runId = "123";
    const owner = "SpookSoftware";
    const repository = "github-actions-browser-notifications";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    const callback = createMonitoringHandler({
      runId,
      owner,
      repository,
      svg,
    });

    global.chrome = {
      runtime: {
        // @ts-ignore
        sendMessage: (_message, callback) => {
          callback({ status: "error" });
        },
      },
    };

    callback(new MouseEvent("click"));

    expect(svg.style.color).toBe("red");
    expect(svg.classList.contains("color-fg-muted")).toBeFalse();
  });

  it("handles when there's a job id as well", () => {
    const runId = "123";
    const jobId = "456";
    const owner = "SpookSoftware";
    const repository = "github-actions-browser-notifications";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    const callback = createMonitoringHandler({
      runId,
      jobId,
      owner,
      repository,
      svg,
    });

    global.chrome = {
      runtime: {
        // @ts-ignore
        sendMessage: (_message, callback) => {
          callback({ status: "ok" });
        },
      },
    };

    callback(new MouseEvent("click"));

    expect(svg.style.color).toBe("yellow");
    expect(svg.classList.contains("color-fg-muted")).toBeFalse();
  });
});
describe("parseRequest", () => {
  it("parses an action request correctly", () => {
    const request: MonitorActionRequest = {
      type: "action",
      runId: "123",
      owner: "SpookSoftware",
      repository: "github-actions-browser-notifications",
    };
    const result = parseRequest(request);
    expect(result).toEqual({
      runId: "123",
      owner: "SpookSoftware",
      repository: "github-actions-browser-notifications",
    });
  });

  it("parses a job request correctly", () => {
    const request: MonitorJobRequest = {
      type: "job",
      runId: "123",
      jobId: "456",
      owner: "SpookSoftware",
      repository: "github-actions-browser-notifications",
    };
    const result = parseRequest(request);
    expect(result).toEqual({
      runId: "123",
      jobId: "456",
      owner: "SpookSoftware",
      repository: "github-actions-browser-notifications",
    });
  });

  it("throws an error if the request format is not recognized", () => {
    const request = {
      type: "unknown",
    };
    expect(() => parseRequest(request as any)).toThrow(
      "Request was in a format not recognized"
    );
  });
});

describe("encodeRequest", () => {
  it("encodes an action request correctly", () => {
    const request: MonitorActionRequest = {
      type: "action",
      runId: "123",
      owner: "SpookSoftware",
      repository: "github-actions-browser-notifications",
    };
    const result = encodeRequest(request);
    expect(result).toEqual(
      "123|SpookSoftware|github-actions-browser-notifications"
    );
  });

  it("encodes a job request correctly", () => {
    const request: MonitorJobRequest = {
      type: "job",
      runId: "123",
      jobId: "456",
      owner: "SpookSoftware",
      repository: "github-actions-browser-notifications",
    };
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
    const encoded = "123|SpookSoftware|github-actions-browser-notifications";
    expect(decode(encoded)).toEqual({
      runId: "123",
      owner: "SpookSoftware",
      repository: "github-actions-browser-notifications",
    });
  });
  it("splits the encoded string into runId, jobId, owner, and repository when appropriate", () => {
    const encoded =
      "123|456|SpookSoftware|github-actions-browser-notifications";
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

describe("assertGithubToken", () => {
  it("returns the GitHub token if it exists", async () => {
    const mockToken = { githubToken: "mock-token" };
    global.chrome = {
      storage: {
        // @ts-ignore
        sync: {
          get: jest.fn().mockResolvedValue(mockToken),
        },
      },
    };

    const token = await assertGithubToken();
    expect(token).toEqual("mock-token");
  });

  it("throws an error if the GitHub token does not exist", async () => {
    global.chrome = {
      storage: {
        // @ts-ignore
        sync: {
          get: jest.fn().mockResolvedValue(null),
        },
      },
    };

    expect(assertGithubToken()).rejects.toThrow();
  });
});

describe("checkStatus", () => {
  it("calls checkJobStatus if jobId is provided", async () => {
    const mockJobStatus = { status: "completed", name: "job-name" };
    const checkJobStatusMock = spyOn(
      await import("../extension/helpers"),
      "checkJobStatus"
    ).mockResolvedValue(mockJobStatus);

    const result = await checkStatus({
      runId: "123",
      owner: "owner",
      repository: "repo",
      jobId: "456",
    });

    expect(checkJobStatusMock).toHaveBeenCalledWith({
      jobId: "456",
      owner: "owner",
      repository: "repo",
    });
    expect(result).toEqual(mockJobStatus);
  });

  it("calls checkActionStatus if jobId is not provided", async () => {
    const mockActionStatus = { status: "completed", name: "action-name" };
    const checkActionStatusMock = spyOn(
      await import("../extension/helpers"),
      "checkActionStatus"
    ).mockResolvedValue(mockActionStatus);

    const result = await checkStatus({
      runId: "123",
      owner: "owner",
      repository: "repo",
    });

    expect(checkActionStatusMock).toHaveBeenCalledWith({
      runId: "123",
      owner: "owner",
      repository: "repo",
    });
    expect(result).toEqual(mockActionStatus);
  });
});

describe("createOnAlarmCallback", () => {
  it("checks the status of the relevant workflow and calls the callback if completed", async () => {
    const mockAlarm = {
      name: "123|owner|repo",
    } as chrome.alarms.Alarm;
    const mockStatus = { status: "completed", name: "task-name" };
    const checkStatusMock = spyOn(
      await import("../extension/helpers"),
      "checkStatus"
    ).mockResolvedValue(mockStatus);
    const whenStatusIsCompleteCallback = jest.fn();

    const onAlarmCallback = createOnAlarmCallback(whenStatusIsCompleteCallback);
    await onAlarmCallback(mockAlarm);

    expect(checkStatusMock).toHaveBeenCalledWith({
      runId: "123",
      owner: "owner",
      repository: "repo",
    });
    expect(whenStatusIsCompleteCallback).toHaveBeenCalledWith(
      mockAlarm,
      "task-name"
    );
  });

  it("throws an error if the alarm name format is unexpected", async () => {
    const mockAlarm = {
      name: "As far as names go, I am the worst",
    } as chrome.alarms.Alarm;
    const whenStatusIsCompleteCallback = jest.fn();

    const onAlarmCallback = createOnAlarmCallback(whenStatusIsCompleteCallback);

    expect(onAlarmCallback(mockAlarm)).rejects.toThrow();
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
    const workflowRunElement = document.querySelector(".workflow-run");
    if (workflowRunElement) {
      const result =
        getElementToInsertNotificationButtonInto(workflowRunElement);
      expect(result).toBeInstanceOf(Element);
      expect(result.classList.contains("between-branch-and-time")).toBeTrue();
    }
  });

  it("throws an error if the childDiv is not present", () => {
    document.body.innerHTML = `<div class="workflow-run"></div>`;
    const workflowRunElement = document.querySelector(".workflow-run");
    if (workflowRunElement) {
      expect(() =>
        getElementToInsertNotificationButtonInto(workflowRunElement)
      ).toThrowError("Expected children to be present");
    }
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
    const workflowRunElement = document.querySelector(".workflow-run");
    if (workflowRunElement) {
      expect(() =>
        getElementToInsertNotificationButtonInto(workflowRunElement)
      ).toThrowError(
        "Element does not have the expected structure of a workflow run element"
      );
    }
  });
});

describe("createOnMessageCallback", () => {
  it("calls setupMonitoring with the correct parameters and sends a success response", async () => {
    const setupMonitoring = jest.fn().mockResolvedValue([]);
    const sendResponse = jest.fn();
    const request: MonitorRequest = {
      type: "action",
      runId: "123",
      owner: "SpookSoftware",
      repository: "github-actions-browser-notifications",
    };

    const callback = createOnMessageCallback(setupMonitoring);
    const result = callback(
      request,
      {} as chrome.runtime.MessageSender,
      sendResponse
    );

    expect(result).toBeTrue();
    expect(setupMonitoring).toHaveBeenCalledWith(
      "123|SpookSoftware|github-actions-browser-notifications",
      0.1
    );
    await setupMonitoring();
    expect(sendResponse).toHaveBeenCalledWith({ status: "ok" });
  });

  it("calls setupMonitoring and sends an error response if it fails", async () => {
    const setupMonitoring = jest.fn().mockRejectedValue(new Error("Failed"));
    const sendResponse = jest.fn();
    const request: MonitorRequest = {
      type: "action",
      runId: "123",
      owner: "SpookSoftware",
      repository: "github-actions-browser-notifications",
    };

    const callback = createOnMessageCallback(setupMonitoring);
    const result = callback(
      request,
      {} as chrome.runtime.MessageSender,
      sendResponse
    );

    expect(result).toBeTrue();
    await setupMonitoring().catch(() => {});
    expect(sendResponse).toHaveBeenCalledWith({
      status: "error",
      error: new Error("Failed"),
    });
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
      "https://github.com/whoever/rocks-and-other-things/actions/runs/69/jobs/420"
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
      "https://github.com/whoever/rocks-and-other-things/actions/runs/69/jobs/420"
    );
  });
});
