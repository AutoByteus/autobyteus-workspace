import { describe, expect, it, vi } from "vitest";
import { openTargetOf } from "../../../../src/agent-collaboration/delegation/collaboration-tree.js";

/**
 * autobyteus-461 SR-083 (FU-024, FU-031, F-66): every row the server builds says where it opens, from one helper: an agent
 * run its own agent, a team run its coordinator (never another member; without one, a row error with no target). The
 * rows built from it are `RunTreeView`'s (run-tree-view.test.ts), their records `run-tree-records.test.ts`.
 */
describe("rows that say where they open (SR-083)", () => {
  it("one helper: an agent run opens its own agent; a team run its coordinator, the member at its coordinator's address", () => {
    expect(openTargetOf({ agentRunId: "a" })).toEqual({ runKind: "agent", runId: "a", agentRunId: "a" });
    // The coordinator is not the first member (FU-024: no members[0]).
    expect(openTargetOf({ teamRunId: "t" }, { coordinatorAddress: "/lead", members: [{ address: "/designer", agentRunId: "d" }, { address: "/lead", agentRunId: "l" }] }))
      .toEqual({ runKind: "agent_team", runId: "t", agentRunId: "l" });
  });

  it("a team run whose coordinator is not one of its members is a row error: logged, no target", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(openTargetOf({ teamRunId: "t" }, { coordinatorAddress: "/gone", members: [{ address: "/designer", agentRunId: "d" }] })).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Row error: team run 't' has no coordinator"));
    warn.mockRestore();
  });
});
