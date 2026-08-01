import { describe, expect, it } from "vitest";
import {
  resolveCompactionLineageScope,
} from "../../../../../src/agent-execution/backends/autobyteus/compaction-lineage-scope-resolver.js";

describe("resolveCompactionLineageScope", () => {
  it("uses the agent run ID for standalone runs", () => {
    expect(resolveCompactionLineageScope(" run-1 ", null)).toEqual({
      targetKind: "agent_run",
      runId: "run-1",
      memberId: null,
    });
  });

  it("uses the owning team run and member run IDs for member-local lineage", () => {
    expect(resolveCompactionLineageScope("ignored-backend-run", {
      teamRunId: " team-run ",
      memberRunId: " member-run ",
    })).toEqual({
      targetKind: "team_member",
      runId: "team-run",
      memberId: "member-run",
    });
  });

  it.each([
    ["blank standalone run", () => resolveCompactionLineageScope(" ", null)],
    ["blank team run", () => resolveCompactionLineageScope("run", {
      teamRunId: " ",
      memberRunId: "member",
    })],
    ["blank member run", () => resolveCompactionLineageScope("run", {
      teamRunId: "team",
      memberRunId: " ",
    })],
  ])("fails closed for %s", (_label, action) => {
    expect(action).toThrow(/required for compaction lineage/);
  });
});
