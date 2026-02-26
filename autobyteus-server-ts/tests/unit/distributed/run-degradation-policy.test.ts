import { describe, expect, it } from "vitest";
import { RunDegradationPolicy } from "../../../src/distributed/policies/run-degradation-policy.js";

describe("RunDegradationPolicy", () => {
  it("transitions run to degraded on first failure", () => {
    const policy = new RunDegradationPolicy();
    const transition = policy.recordRouteFailure({
      teamRunId: "run-1",
      isCoordinatorFailure: false,
      atMs: 1_000,
    });

    expect(transition).toBe("degraded");
    expect(policy.getRunStatus("run-1")).toBe("degraded");
  });

  it("transitions degraded run to stop when coordinator failures reach threshold", () => {
    const policy = new RunDegradationPolicy({
      coordinatorFailureThreshold: 2,
      globalFailureThreshold: 99,
    });

    expect(
      policy.recordRouteFailure({
        teamRunId: "run-2",
        isCoordinatorFailure: true,
        atMs: 1_000,
      }),
    ).toBe("degraded");
    expect(
      policy.recordRouteFailure({
        teamRunId: "run-2",
        isCoordinatorFailure: true,
        atMs: 1_500,
      }),
    ).toBe("stop");
    expect(policy.getRunStatus("run-2")).toBe("stopped");
  });

  it("transitions degraded run to stop when global failures reach threshold in window", () => {
    const policy = new RunDegradationPolicy({
      coordinatorFailureThreshold: 10,
      globalFailureThreshold: 3,
      globalFailureWindowMs: 10_000,
    });

    expect(
      policy.recordRouteFailure({ teamRunId: "run-3", isCoordinatorFailure: false, atMs: 1_000 }),
    ).toBe("degraded");
    expect(
      policy.recordRouteFailure({ teamRunId: "run-3", isCoordinatorFailure: false, atMs: 2_000 }),
    ).toBe("none");
    expect(
      policy.recordRouteFailure({ teamRunId: "run-3", isCoordinatorFailure: false, atMs: 3_000 }),
    ).toBe("stop");
  });

  it("resets coordinator streak when coordinator-target route succeeds", () => {
    const policy = new RunDegradationPolicy({
      coordinatorFailureThreshold: 2,
      globalFailureThreshold: 10,
    });

    policy.recordRouteFailure({ teamRunId: "run-4", isCoordinatorFailure: true, atMs: 1_000 });
    policy.recordRouteSuccess({ teamRunId: "run-4", isCoordinatorTarget: true });

    const transition = policy.recordRouteFailure({
      teamRunId: "run-4",
      isCoordinatorFailure: true,
      atMs: 2_000,
    });
    expect(transition).toBe("none");
    expect(policy.getRunStatus("run-4")).toBe("degraded");
  });
});
