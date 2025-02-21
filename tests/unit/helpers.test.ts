import {
  expect,
  describe,
  it,
  jest,
  spyOn,
  afterEach,
  beforeEach,
} from "bun:test";
import {
  createNotificationButton,
  createOnMessageCallback,
  shouldMonitorActions,
  createNotificationSVG,
  extractActionDataFromURL,
  selectorMatches,
  selectorHasChildren,
  encodeRequest,
  decode,
  createOnAlarmCallback,
  checkStatus,
  assertGithubToken,
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
  AutoDisconnectingMutationObserver,
} from "../../extension/helpers";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

import type {
  StartMonitorActionRequest,
  StartMonitorJobRequest,
  StartMonitorRequest,
} from "../../types";

// Without this, the tests will fail because the extension uses the DOM API
GlobalRegistrator.register();

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
  it("returns true for all actions URLs", () => {
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
      await import("../../extension/helpers"),
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
      await import("../../extension/helpers"),
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
      await import("../../extension/helpers"),
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
    const actionRunElement = document.querySelector(".workflow-run");
    if (actionRunElement) {
      const result = getElementToInsertNotificationButtonInto(actionRunElement);
      expect(result).toBeInstanceOf(Element);
      expect(result.classList.contains("between-branch-and-time")).toBeTrue();
    }
  });

  it("throws an error if the childDiv is not present", () => {
    document.body.innerHTML = `<div class="workflow-run"></div>`;
    const actionRunElement = document.querySelector(".workflow-run");
    if (actionRunElement) {
      expect(() =>
        getElementToInsertNotificationButtonInto(actionRunElement)
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
    const actionRunElement = document.querySelector(".workflow-run");
    if (actionRunElement) {
      expect(() =>
        getElementToInsertNotificationButtonInto(actionRunElement)
      ).toThrowError(
        "Element does not have the expected structure of a action run element"
      );
    }
  });
});

describe("createOnMessageCallback", () => {
  describe("for actions", () => {
    it("calls setupMonitoring with the correct parameters and sends a success response", async () => {
      const setupMonitoring = jest.fn().mockResolvedValue([]);
      const cancelMonitoring = jest.fn();

      const sendResponse = jest.fn();
      const request: StartMonitorRequest = {
        type: "action",
        runId: "123",
        owner: "SpookSoftware",
        repository: "github-actions-browser-notifications",
        task: "start-monitoring",
      };

      const callback = createOnMessageCallback(
        setupMonitoring,
        cancelMonitoring
      );
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
      const cancelMonitoring = jest.fn();
      const sendResponse = jest.fn();
      const request: StartMonitorRequest = {
        type: "action",
        runId: "123",
        owner: "SpookSoftware",
        repository: "github-actions-browser-notifications",
        task: "start-monitoring",
      };

      const callback = createOnMessageCallback(
        setupMonitoring,
        cancelMonitoring
      );
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

    it("calls cancelMonitoring with the correct parameters and sends a success response", async () => {
      const setupMonitoring = jest.fn();
      const cancelMonitoring = jest.fn().mockResolvedValue([]);

      const sendResponse = jest.fn();
      const request = {
        type: "action",
        runId: "123",
        owner: "SpookSoftware",
        repository: "github-actions-browser-notifications",
        task: "stop-monitoring",
      } as const;

      const callback = createOnMessageCallback(
        setupMonitoring,
        cancelMonitoring
      );
      const result = callback(
        request,
        {} as chrome.runtime.MessageSender,
        sendResponse
      );

      expect(result).toBeTrue();
      expect(cancelMonitoring).toHaveBeenCalledWith(
        "123|SpookSoftware|github-actions-browser-notifications"
      );
      await setupMonitoring();
      expect(sendResponse).toHaveBeenCalledWith({ status: "ok" });
    });

    it("calls cancelMonitoring and sends an error response if it fails", async () => {
      const setupMonitoring = jest.fn();
      const cancelMonitoring = jest.fn().mockRejectedValue(new Error("Failed"));
      const sendResponse = jest.fn();
      const request = {
        type: "action",
        runId: "123",
        owner: "SpookSoftware",
        repository: "github-actions-browser-notifications",
        task: "stop-monitoring",
      } as const;

      const callback = createOnMessageCallback(
        setupMonitoring,
        cancelMonitoring
      );
      const result = callback(
        request,
        {} as chrome.runtime.MessageSender,
        sendResponse
      );

      expect(result).toBeTrue();
      await cancelMonitoring().catch(() => {});
      expect(sendResponse).toHaveBeenCalledWith({
        status: "error",
        error: new Error("Failed"),
      });
    });
  });

  describe("for jobs", () => {
    it("calls setupMonitoring with the correct parameters and sends a success response", async () => {
      const setupMonitoring = jest.fn().mockResolvedValue([]);
      const cancelMonitoring = jest.fn();

      const sendResponse = jest.fn();
      const request: StartMonitorRequest = {
        type: "job",
        runId: "123",
        jobId: "456",
        owner: "SpookSoftware",
        repository: "github-actions-browser-notifications",
        task: "start-monitoring",
      };

      const callback = createOnMessageCallback(
        setupMonitoring,
        cancelMonitoring
      );
      const result = callback(
        request,
        {} as chrome.runtime.MessageSender,
        sendResponse
      );

      expect(result).toBeTrue();
      expect(setupMonitoring).toHaveBeenCalledWith(
        "123|456|SpookSoftware|github-actions-browser-notifications",
        0.1
      );
      await setupMonitoring();
      expect(sendResponse).toHaveBeenCalledWith({ status: "ok" });
    });

    it("calls setupMonitoring and sends an error response if it fails", async () => {
      const setupMonitoring = jest.fn().mockRejectedValue(new Error("Failed"));
      const cancelMonitoring = jest.fn();
      const sendResponse = jest.fn();
      const request: StartMonitorRequest = {
        type: "job",
        runId: "123",
        jobId: "456",
        owner: "SpookSoftware",
        repository: "github-actions-browser-notifications",
        task: "start-monitoring",
      };

      const callback = createOnMessageCallback(
        setupMonitoring,
        cancelMonitoring
      );
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

    it("calls cancelMonitoring with the correct parameters and sends a success response", async () => {
      const setupMonitoring = jest.fn();
      const cancelMonitoring = jest.fn().mockResolvedValue([]);

      const sendResponse = jest.fn();
      const request = {
        type: "job",
        runId: "123",
        jobId: "456",
        owner: "SpookSoftware",
        repository: "github-actions-browser-notifications",
        task: "stop-monitoring",
      } as const;

      const callback = createOnMessageCallback(
        setupMonitoring,
        cancelMonitoring
      );
      const result = callback(
        request,
        {} as chrome.runtime.MessageSender,
        sendResponse
      );

      expect(result).toBeTrue();
      expect(cancelMonitoring).toHaveBeenCalledWith(
        "123|456|SpookSoftware|github-actions-browser-notifications"
      );
      await setupMonitoring();
      expect(sendResponse).toHaveBeenCalledWith({ status: "ok" });
    });

    it("calls cancelMonitoring and sends an error response if it fails", async () => {
      const setupMonitoring = jest.fn();
      const cancelMonitoring = jest.fn().mockRejectedValue(new Error("Failed"));
      const sendResponse = jest.fn();
      const request = {
        type: "job",
        runId: "123",
        jobId: "456",
        owner: "SpookSoftware",
        repository: "github-actions-browser-notifications",
        task: "stop-monitoring",
      } as const;

      const callback = createOnMessageCallback(
        setupMonitoring,
        cancelMonitoring
      );
      const result = callback(
        request,
        {} as chrome.runtime.MessageSender,
        sendResponse
      );

      expect(result).toBeTrue();
      await cancelMonitoring().catch(() => {});
      expect(sendResponse).toHaveBeenCalledWith({
        status: "error",
        error: new Error("Failed"),
      });
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

  describe("assertIsHTMLElement", () => {
    it("does not throw an error if the element is an HTMLElement", () => {
      const div = document.createElement("div");
      expect(() => assertIsHTMLElement(div)).not.toThrow();
    });

    it("throws an error if the element is not an HTMLElement", () => {
      const textNode = document.createTextNode("I am not an HTMLElement");
      expect(() => assertIsHTMLElement(textNode as any)).toThrow(
        "Expected element to be an HTMLElement"
      );
    });
  });
});

describe("isButtoned", () => {
  it("should return the button element if it exists", () => {
    const element = document.createElement("div");
    const button = document.createElement("button");
    button.classList.add("gh-action-notifier-button");
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

describe("AutoDisconnectingMutationObserver", () => {
  let observer: AutoDisconnectingMutationObserver;
  let callback: MutationCallback;
  let target: Element;

  beforeEach(() => {
    callback = jest.fn();
    observer = new AutoDisconnectingMutationObserver(callback);
    target = document.createElement("div");
    document.body.appendChild(target);
  });

  afterEach(() => {
    document.body.removeChild(target);
  });

  it("should attach MutationObserver to the target element", () => {
    observer.observe(target);
    expect(observer["activeTarget"]).toBe(target);
  });

  it("should disconnect MutationObserver on pagehide event", () => {
    observer.observe(target);
    window.dispatchEvent(new Event("pagehide"));
    expect(observer["activeTarget"]).toBeNull();
  });

  it("should disconnect MutationObserver on turbo:before-render event", () => {
    observer.observe(target);
    document.dispatchEvent(new Event("turbo:before-render"));
    expect(observer["activeTarget"]).toBeNull();
  });

  it("should disconnect MutationObserver on turbo:before-cache event", () => {
    observer.observe(target);
    document.dispatchEvent(new Event("turbo:before-cache"));
    expect(observer["activeTarget"]).toBeNull();
  });

  it("should call the callback when mutations occur", (done) => {
    observer.observe(target);
    const child = document.createElement("div");
    target.appendChild(child);
    setTimeout(() => {
      expect(callback).toHaveBeenCalled();
      done();
    }, 0);
  });
});
