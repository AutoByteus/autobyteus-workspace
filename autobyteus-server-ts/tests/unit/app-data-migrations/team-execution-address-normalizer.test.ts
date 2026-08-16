import { describe, expect, it } from "vitest";
import { normalizePredecessorTeamExecutionAddress } from "../../../src/app-data-migrations/migrations/team-execution-address-normalizer.js";

describe("normalizePredecessorTeamExecutionAddress", () => {
  it("accepts an exact expected-root address", () => {
    expect(normalizePredecessorTeamExecutionAddress({
      rootTeamRunId: "team-root",
      taskTeamRunIds: ["task-team-1"],
      memberAddress: "/research/reviewer",
      taskAgentRunId: "task-agent-1",
    }, "team-root", "senderAddress")).toEqual({
      rootTeamRunId: "team-root",
      taskTeamRunIds: ["task-team-1"],
      memberAddress: "/research/reviewer",
      taskAgentRunId: "task-agent-1",
    });
  });

  it("normalizes released camel and snake segment fields with nested task executions", () => {
    expect(normalizePredecessorTeamExecutionAddress({
      segments: [
        { kind: "member", member_path: ["research", "reviewer"], member_route_key: "research/reviewer" },
        { kind: "task_team", task_team_run_id: "task-team-1" },
        { kind: "task_team", taskTeamRunId: "task-team-2" },
        { kind: "task_agent", task_agent_run_id: "task-agent-1" },
      ],
    }, "team-root", "senderAddress")).toEqual({
      rootTeamRunId: "team-root",
      taskTeamRunIds: ["task-team-1", "task-team-2"],
      memberAddress: "/research/reviewer",
      taskAgentRunId: "task-agent-1",
    });
  });

  it.each([
    [{ kind: "member", memberPath: null, memberRouteKey: "route-only" }, "/route-only"],
    [{ kind: "member", memberPath: ["path", "only"], memberRouteKey: null }, "/path/only"],
  ])("treats null optional member identity aliases as absent %#", (member, expectedAddress) => {
    expect(normalizePredecessorTeamExecutionAddress({
      segments: [member],
    }, "team-root", "senderAddress")).toMatchObject({
      rootTeamRunId: "team-root",
      memberAddress: expectedAddress,
    });
  });

  it.each([
    [{ rootTeamRunId: "other-root", taskTeamRunIds: [], memberAddress: "/member", taskAgentRunId: null }, "does not match expected root"],
    [{ segments: [] }, "has no member segment"],
    [{ segments: [{ kind: "member", memberPath: ["one"] }, { kind: "member", memberPath: ["two"] }] }, "more than one member segment"],
    [{ segments: [{ kind: "member", memberPath: ["one"], memberRouteKey: "two" }] }, "route/path identity contradicts"],
    [{ segments: [{ kind: "member", memberPath: ["one"] }, { kind: "task_agent", taskAgentRunId: "a" }, { kind: "task_agent", taskAgentRunId: "b" }] }, "more than one task Agent segment"],
    [{ segments: [{ kind: "member", memberPath: ["one"] }, { kind: "unknown" }] }, "is unsupported"],
    [{ segments: [{ kind: "member", memberPath: ["one"] }, { kind: "task_team", taskTeamRunId: "a", task_team_run_id: "b" }] }, "contradicts"],
  ])("rejects malformed or ambiguous evidence %#", (value, message) => {
    expect(() => normalizePredecessorTeamExecutionAddress(value, "team-root", "senderAddress"))
      .toThrow(message);
  });
});
