import { describe, expect, it } from "vitest";
import { deriveTeamApiStatus } from "../../../src/agent-team-execution/domain/team-status-aggregation.js";

describe("deriveTeamApiStatus", () => {
  it("returns idle when the native team and every member are idle", () => {
    expect(deriveTeamApiStatus({
      nativeTeamStatus: "idle",
      memberStatuses: [{ status: "idle" }, { status: "idle" }],
    })).toBe("idle");
  });

  it("returns running when any member or the native team status is running", () => {
    expect(deriveTeamApiStatus({
      nativeTeamStatus: "idle",
      memberStatuses: [{ status: "idle" }, { status: "running" }],
    })).toBe("running");
    expect(deriveTeamApiStatus({
      nativeTeamStatus: "processing_user_input",
      memberStatuses: [{ status: "idle" }],
    })).toBe("running");
  });

  it("gives error precedence over running and idle statuses", () => {
    expect(deriveTeamApiStatus({
      nativeTeamStatus: "running",
      memberStatuses: [{ status: "error" }, { status: "running" }],
    })).toBe("error");
    expect(deriveTeamApiStatus({
      nativeTeamStatus: "failed",
      memberStatuses: [{ status: "idle" }],
    })).toBe("error");
  });
});
