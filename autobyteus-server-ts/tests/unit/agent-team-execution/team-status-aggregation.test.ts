import { describe, expect, it } from "vitest";
import { deriveTeamApiStatus } from "../../../src/agent-team-execution/domain/team-status-aggregation.js";

describe("deriveTeamApiStatus", () => {
  it("returns offline when the native team and every member are offline or absent", () => {
    expect(deriveTeamApiStatus({
      memberStatuses: [],
    })).toBe("offline");
    expect(deriveTeamApiStatus({
      nativeTeamStatus: "offline",
      memberStatuses: [{ status: "offline" }, { status: "offline" }],
    })).toBe("offline");
  });

  it("returns idle when the native team and every member are idle", () => {
    expect(deriveTeamApiStatus({
      nativeTeamStatus: "idle",
      memberStatuses: [{ status: "idle" }, { status: "idle" }],
    })).toBe("idle");
  });

  it("returns running when any member or canonical/current native team status is running", () => {
    expect(deriveTeamApiStatus({
      nativeTeamStatus: "idle",
      memberStatuses: [{ status: "idle" }, { status: "running" }],
    })).toBe("running");
    expect(deriveTeamApiStatus({
      nativeTeamStatus: "active",
      memberStatuses: [{ status: "idle" }],
    })).toBe("running");
  });

  it("returns initializing when startup is active but no member is running", () => {
    expect(deriveTeamApiStatus({
      nativeTeamStatus: "initializing",
      memberStatuses: [{ status: "idle" }],
    })).toBe("initializing");
    expect(deriveTeamApiStatus({
      nativeTeamStatus: "idle",
      memberStatuses: [{ status: "initializing" }, { status: "offline" }],
    })).toBe("initializing");
  });

  it("does not derive aggregate status from removed native lifecycle tokens", () => {
    for (const removedStatus of [
      "uninitialized",
      "bootstrapping",
      "starting",
      "startup",
      "processing_user_input",
      "awaiting_llm_response",
      "awaiting_tool_approval",
      "executing_tool",
      "tool_denied",
      "shutdown_complete",
      "failed",
      "failure",
    ]) {
      expect(deriveTeamApiStatus({
        nativeTeamStatus: removedStatus,
        memberStatuses: [{ status: "idle" }],
      })).toBe("idle");
    }
  });

  it("gives idle precedence over offline statuses", () => {
    expect(deriveTeamApiStatus({
      nativeTeamStatus: "offline",
      memberStatuses: [{ status: "offline" }, { status: "idle" }],
    })).toBe("idle");
  });

  it("gives running and initializing precedence over canonical aggregate errors", () => {
    expect(deriveTeamApiStatus({
      nativeTeamStatus: "error",
      memberStatuses: [{ status: "error" }, { status: "running" }],
    })).toBe("running");
    expect(deriveTeamApiStatus({
      nativeTeamStatus: "error",
      memberStatuses: [{ status: "initializing" }, { status: "error" }],
    })).toBe("initializing");
  });

  it("keeps terminal errors visible when no member is active", () => {
    expect(deriveTeamApiStatus({
      nativeTeamStatus: "error",
      memberStatuses: [{ status: "idle" }],
    })).toBe("error");
  });
});
