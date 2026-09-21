import { describe, expect, it } from "vitest";
import { resolveCompactionLineageScope } from "../../../../../src/agent-execution/backends/autobyteus/compaction-lineage-scope-resolver.js";
import { testMemberExecutionContext } from "../../../../fixtures/current-team-run-fixtures.js";

describe("resolveCompactionLineageScope", () => {
  it("uses the AgentRun ID for standalone runs", () => {
    expect(resolveCompactionLineageScope(" run-1 ", null)).toEqual({
      targetKind: "agent_run",
      runId: "run-1",
      memberId: null,
    });
  });

  it("uses the tagged Team root and member AgentRun IDs for member-local lineage", () => {
    expect(resolveCompactionLineageScope("ignored-backend-run", testMemberExecutionContext({
      rootTeamRunId: "team-run",
      memberAddress: "/member",
      agentRunId: "member-run",
    }))).toEqual({
      targetKind: "team_member",
      runId: "team-run",
      memberId: "member-run",
    });
  });

  it.each([
    ["blank standalone run", () => resolveCompactionLineageScope(" ", null)],
    ["blank Team root run", () => resolveCompactionLineageScope("run", {
      identity: { root: { rootSubjectKind: "agent_team", rootRunId: " " }, agentRunId: "member" },
    } as never)],
    ["blank member run", () => resolveCompactionLineageScope("run", {
      identity: { root: { rootSubjectKind: "agent_team", rootRunId: "team" }, agentRunId: " " },
    } as never)],
  ])("fails closed for %s", (_label, action) => {
    expect(action).toThrow(/required for compaction lineage/);
  });
});
