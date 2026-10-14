import { describe, expect, it } from "vitest";
import { ModelCallRequestBoundary } from "../../../../../src/agent-execution/backends/shared/model-call-request-boundary.js";

describe("ModelCallRequestBoundary", () => {
  it("uses the latest boundary before output, freezes on output, and opens the next call at completion", () => {
    const boundary = new ModelCallRequestBoundary();
    boundary.markBoundary(100); // prompt send
    boundary.markBoundary(140); // user input item completed
    boundary.markOutput();
    boundary.markBoundary(900); // inside the call: ignored
    expect(boundary.completeCall(1000)).toBe(140);
    boundary.markBoundary(5000); // a tool finished after the call
    boundary.markOutput();
    expect(boundary.completeCall(6000)).toBe(5000);
    expect(boundary.completeCall(6001)).toBe(6000); // a repeat right after: a ~0 ms window
  });

  it("returns null without a boundary and keeps a call that began before reset unmeasured", () => {
    const boundary = new ModelCallRequestBoundary();
    expect(boundary.completeCall(10)).toBeNull();
    boundary.reset();
    boundary.markOutput();
    boundary.markBoundary(50); // a later boundary inside an unmeasured call cannot shorten it
    expect(boundary.completeCall(60)).toBeNull();
    expect(boundary.completeCall(70)).toBe(60);
  });
});
