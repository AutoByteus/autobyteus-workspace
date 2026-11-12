import { NO_RUN_PARTS } from "../../../helpers/run-agents-reader.js";
import { describe, expect, it } from "vitest";
import { DelegationIndex, type ChildRowsChange } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";

/**
 * autobyteus-461 DS-8, SR-042: inside each Task change, after updating itself, the tree reports each run whose open
 * children changed: the rows that came and the runs that left.
 */
const M = { rootSubjectKind: "agent" as const, rootRunId: "manager" };
const from = { delegatingRun: M, delegatorAgentRunId: "manager" };

const harness = () => {
  const tasks = new InMemoryTaskExecutionResources();
  tasks.addTask("T1");
  tasks.addTask("T2");
  const tree = new DelegationIndex(() => tasks, NO_RUN_PARTS);
  tree.build();
  tasks.setEntriesListener(tree);
  const changes: ChildRowsChange[] = [];
  // The listener runs after the tree is updated: it sees the new rows.
  const seen: number[] = [];
  tree.subscribeChildRows((change) => { changes.push(change); seen.push(tree.openChildrenOf(change.run).length); });
  const assign = (taskId: string, agentRunId: string) => tasks.linkNewTaskExecution({ role: "assigned", taskId, recipientAddress: `/${agentRunId}`,
    delegatedFrom: from, execution: { agentRunId } });
  return { tasks, tree, changes, seen, assign };
};

describe("DelegationIndex child rows", () => {
  it("reports a new delegation as an added row, after the tree is updated", async () => {
    const h = harness();
    await h.assign("T1", "writer");
    expect(h.changes).toEqual([{ run: M, added: [expect.objectContaining({ run: { agentRunId: "writer" }, recipientAddress: "/writer" })], removed: [] }]);
    expect(h.seen).toEqual([1]);
  });

  it("reports a closure that leaves the child no open Task as removed; a child keeping another open Task is no change", async () => {
    const h = harness();
    await h.assign("T1", "writer");
    await h.assign("T2", "checker");
    h.changes.length = 0;
    // The checker also works on T1 (an earlier open Task it holds).
    h.tasks.entry({ agentRunId: "checker" })!.otherOpenTaskIds = ["T1"];
    h.tasks.close("T1");
    expect(h.changes).toEqual([{ run: M, added: [], removed: [{ agentRunId: "writer" }] }]);
  });

  it("reports the assigner's reopen-and-continue as the row coming back", async () => {
    const h = harness();
    await h.assign("T1", "writer");
    await h.tasks.markStarted({ agentRunId: "writer" });
    h.tasks.close("T1");
    h.tasks.setTaskOpen("T1");
    h.changes.length = 0;
    await h.tasks.reopenAssignment({ execution: { agentRunId: "writer" }, requestedBy: "manager" } as never);
    expect(h.changes).toEqual([{ run: M, added: [expect.objectContaining({ run: { agentRunId: "writer" } })], removed: [] }]);
  });

  it("reports a deleted Task's children as removed, and a delegation to a peer as added", async () => {
    const h = harness();
    await h.assign("T1", "writer");
    await h.tasks.linkNewTaskExecution({ role: "assigned", taskId: "T2", recipientAddress: "/far", delegatedFrom: from, execution: { agentRunId: "far-run" }, nodeId: "node-b" });
    expect(h.changes.at(-1)).toEqual({ run: M, added: [expect.objectContaining({ run: { agentRunId: "far-run" }, nodeId: "node-b" })], removed: [] });
    h.changes.length = 0;
    h.tasks.entries.delete("agent:writer");
    h.tasks.changed("T1");
    expect(h.changes).toEqual([{ run: M, added: [], removed: [{ agentRunId: "writer" }] }]);
  });

  it("gives one report per delegating run for one Task change, and none for a change that moves no row", async () => {
    const h = harness();
    const lead = { rootSubjectKind: "agent_team" as const, rootRunId: "eng" };
    await h.tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/eng", delegatedFrom: from, execution: { teamRunId: "eng" }, teamCoordinatorAgentRunId: "lead" });
    await h.tasks.linkNewTaskExecution({ role: "subWork", recipientAddress: "/helper", delegatedFrom: { delegatingRun: lead, delegatorAgentRunId: "lead" }, execution: { agentRunId: "helper" } });
    await h.tasks.linkNewTaskExecution({ role: "subWork", recipientAddress: "/aide", delegatedFrom: { delegatingRun: lead, delegatorAgentRunId: "lead" }, execution: { agentRunId: "aide" } });
    h.changes.length = 0;
    h.tasks.close("T1");
    expect(h.changes).toEqual([
      // M's rows are its open subtree (CR-461-033): the team's own rows leave M's view with it.
      { run: M, added: [], removed: [{ teamRunId: "eng" }, { agentRunId: "helper" }, { agentRunId: "aide" }] },
      { run: lead, added: [], removed: [{ agentRunId: "helper" }, { agentRunId: "aide" }] },
    ]);
    h.changes.length = 0;
    await h.tasks.markStarted({ teamRunId: "eng" });
    expect(h.changes).toEqual([]);
  });
});
