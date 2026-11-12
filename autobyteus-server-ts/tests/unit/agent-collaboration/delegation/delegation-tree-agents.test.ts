import { describe, expect, it, vi } from "vitest";
import { DelegationTree } from "../../../../src/agent-collaboration/delegation/delegation-tree.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";

/** autobyteus-461 SR-041 (contract §4, `model.py` `agents_with_addresses`): the tree keeps each run's agents by run ID and address. */
const M = { rootSubjectKind: "agent" as const, rootRunId: "manager" };
const from = { delegatingRun: M, delegatorAgentRunId: "manager" };

describe("DelegationTree.agentsOf", () => {
  it("reads a run's agents once from its own file and keeps them; an agent run without a stored address shows its delegation address", async () => {
    const tasks = new InMemoryTaskExecutionResources();
    tasks.addTask("T1");
    const reader = { agentsOf: vi.fn(async (run: { rootRunId: string }) => run.rootRunId === "eng"
      ? [{ agentRunId: "lead", address: "/lead", agentDefinitionId: "lead" }, { agentRunId: "coder", address: "/coder", agentDefinitionId: "coder" }]
      : [{ agentRunId: run.rootRunId, address: null, agentDefinitionId: "writer" }]) };
    const tree = new DelegationTree(() => tasks, () => reader);
    tree.build(); tasks.setEntriesListener(tree);
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/eng", delegatedFrom: from, execution: { teamRunId: "eng" }, teamCoordinatorAgentRunId: "lead" });
    await tasks.linkNewTaskExecution({ role: "subWork", recipientAddress: "/writer", delegatedFrom: { delegatingRun: { rootSubjectKind: "agent_team", rootRunId: "eng" }, delegatorAgentRunId: "lead" },
      execution: { agentRunId: "writer" } });
    const eng = { rootSubjectKind: "agent_team" as const, rootRunId: "eng" };
    expect(await tree.agentsOf(eng)).toEqual([{ agentRunId: "lead", address: "/lead", agentDefinitionId: "lead" }, { agentRunId: "coder", address: "/coder", agentDefinitionId: "coder" }]);
    expect(await tree.agentsOf(eng)).toHaveLength(2);
    expect(reader.agentsOf).toHaveBeenCalledTimes(1);
    expect(await tree.agentsOf({ rootSubjectKind: "agent", rootRunId: "writer" })).toEqual([{ agentRunId: "writer", address: "/writer", agentDefinitionId: "writer" }]);
  });

  it("a peer's run has its agents from its entry, never from a file", async () => {
    const tasks = new InMemoryTaskExecutionResources();
    tasks.addTask("T1");
    const reader = { agentsOf: vi.fn(async () => null) };
    const tree = new DelegationTree(() => tasks, () => reader);
    tree.build(); tasks.setEntriesListener(tree);
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/research_team", delegatedFrom: from, execution: { teamRunId: "far" },
      teamCoordinatorAgentRunId: "lead-far", nodeId: "node-b", members: [{ address: "/lead", agentRunId: "lead-far" }] });
    expect(await tree.agentsOf({ rootSubjectKind: "agent_team", rootRunId: "far" })).toEqual([{ agentRunId: "lead-far", address: "/lead", agentDefinitionId: null }]);
    expect(reader.agentsOf).not.toHaveBeenCalled();
  });
});
