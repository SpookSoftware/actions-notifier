import { expect, describe, it } from "bun:test";
import { createNotificationButton } from "../extension/addNotificationButton";

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
  })
  it("returns a button with an SVG child", () => {
    const button = createNotificationButton({
      runId: "1",
      jobId: "1",
      repository: "not-what-we-are-testing-this-time",
      owner: "sad-guy",
    });
    expect(button.children[0]).toBeInstanceOf(SVGElement);
  });
  it("returns a button with an SVG child where the SVG is the Github notification icon", () => {
    const button = createNotificationButton();
    const svg = button.children[0] as SVGElement;
    expect(svg.getAttributeNS(null, "d")).toEqual("0 0 16 16");
  });
});
