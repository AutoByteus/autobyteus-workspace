import { describe, expect, it, vi } from "vitest";
import { DelegationIndex } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import type { RunAgent } from "../../../../src/agent-collaboration/delegation/run-parts.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";

/** autobyteus-461 SR-041 (contract §4, `model.py` `agents_with_addresses`): the tree keeps each run's agents by run ID and address. */
const M = { rootSubjectKind: "agent" as const, rootRunId: "manager" };
const from = { delegatingRun: M, delegatorAgentRunId: "manager" };
const parts = (agents: RunAgent[]) => ({ agents, coordinatorAddress: null, mountedTeams: [] });

describe("DelegationIndex.agentsOf", () => {
  it("reads a run's agents once from its own file and keeps them; an agent run without a stored address shows its delegation address", async () => {
    const tasks = new InMemoryTaskExecutionResources();
    tasks.addTask("T1");
    const reader = { orgPlacementsOf: async () => null, configuredPlacementOf: async () => null, isStored: async () => true, partsOf: vi.fn(async (run: { rootRunId: string }) => parts(run.rootRunId === "eng"
      ? [{ agentRunId: "lead", address: "/lead", agentDefinitionId: "lead" }, { agentRunId: "coder", address: "/coder", agentDefinitionId: "coder" }]
      : [{ agentRunId: run.rootRunId, address: null, agentDefinitionId: "writer" }])) };
    const tree = new DelegationIndex(() => tasks, reader);
    tree.build(); tasks.setEntriesListener(tree);
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/eng", delegatedFrom: from, execution: { teamRunId: "eng" }, teamCoordinatorAgentRunId: "lead" });
    await tasks.linkNewTaskExecution({ role: "subWork", recipientAddress: "/writer", delegatedFrom: { delegatingRun: { rootSubjectKind: "agent_team", rootRunId: "eng" }, delegatorAgentRunId: "lead" },
      execution: { agentRunId: "writer" } });
    const eng = { rootSubjectKind: "agent_team" as const, rootRunId: "eng" };
    expect(await tree.agentsOf(eng)).toEqual([{ agentRunId: "lead", address: "/lead", agentDefinitionId: "lead" }, { agentRunId: "coder", address: "/coder", agentDefinitionId: "coder" }]);
    expect(await tree.agentsOf(eng)).toHaveLength(2);
    expect(reader.partsOf).toHaveBeenCalledTimes(1);
    expect(await tree.agentsOf({ rootSubjectKind: "agent", rootRunId: "writer" })).toEqual([{ agentRunId: "writer", address: "/writer", agentDefinitionId: "writer" }]);
  });

  it("a peer's run has its agents from its entry, never from a file", async () => {
    const tasks = new InMemoryTaskExecutionResources();
    tasks.addTask("T1");
    const reader = { orgPlacementsOf: async () => null, configuredPlacementOf: async () => null, isStored: async () => true, partsOf: vi.fn(async () => null) };
    const tree = new DelegationIndex(() => tasks, reader);
    tree.build(); tasks.setEntriesListener(tree);
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/research_team", delegatedFrom: from, execution: { teamRunId: "far" },
      teamCoordinatorAgentRunId: "lead-far", nodeId: "node-b", members: [{ address: "/lead", agentRunId: "lead-far" }] });
    expect(await tree.agentsOf({ rootSubjectKind: "agent_team", rootRunId: "far" })).toEqual([{ agentRunId: "lead-far", address: "/lead", agentDefinitionId: null }]);
    expect(reader.partsOf).not.toHaveBeenCalled();
  });

  it("one answer for an agent run with no stored address; a run whose file is absent or unreadable is left out with a warning (CR-461-023, -024)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const tasks = new InMemoryTaskExecutionResources();
    const reader = { orgPlacementsOf: async () => null, configuredPlacementOf: async () => null, isStored: async () => true, partsOf: vi.fn(async (run: { rootRunId: string }) => {
      if (run.rootRunId === "broken") throw new Error("bad JSON");
      return run.rootRunId === "gone" ? null : parts([{ agentRunId: run.rootRunId, address: null, agentDefinitionId: "writer" }]);
    }) };
    const tree = new DelegationIndex(() => tasks, reader);
    tree.build(); tasks.setEntriesListener(tree);
    for (const id of ["writer", "gone", "broken"]) {
      tasks.addTask(`T-${id}`);
      await tasks.linkNewTaskExecution({ role: "assigned", taskId: `T-${id}`, recipientAddress: `/${id}`, delegatedFrom: from, execution: { agentRunId: id } });
    }
    // Its agents carry the address it was delegated to; its standing has none until its own is stored.
    expect(await tree.agentsOf({ rootSubjectKind: "agent", rootRunId: "writer" })).toEqual([{ agentRunId: "writer", address: "/writer", agentDefinitionId: "writer" }]);
    expect(await tree.standingOf({ rootSubjectKind: "agent", rootRunId: "writer" })).toEqual({ agents: new Map(), coordinatorAddress: null });
    expect(await tree.agentsOf({ rootSubjectKind: "agent", rootRunId: "gone" })).toEqual([]);
    expect(await tree.agentsOf({ rootSubjectKind: "agent", rootRunId: "broken" })).toEqual([]);
    expect(warn).toHaveBeenCalledWith("The agents of agent run 'gone' are left out: its own file was not found.");
    expect(warn).toHaveBeenCalledWith("The agents of agent run 'broken' are left out: its own file could not be read (bad JSON).");
    warn.mockRestore();
  });

  it("an org run's standing has its agents and each mounted team's address for its coordinator; a team run's its coordinator address", async () => {
    const tasks = new InMemoryTaskExecutionResources();
    tasks.addTask("T1");
    const org = { rootSubjectKind: "agent_org" as const, rootRunId: "org" };
    const reader = { orgPlacementsOf: async () => null, configuredPlacementOf: async () => null, isStored: async () => true, partsOf: vi.fn(async (run: { rootRunId: string }) => run.rootRunId === "org"
      ? { agents: [{ agentRunId: "ceo", address: "/ceo", agentDefinitionId: null }, { agentRunId: "lead", address: "/dev/lead", agentDefinitionId: null }],
        coordinatorAddress: null, mountedTeams: [{ address: "/dev", coordinatorAgentRunId: "lead" }] }
      : { agents: [{ agentRunId: "tutor", address: "/tutor", agentDefinitionId: null }], coordinatorAddress: "/tutor", mountedTeams: [] }) };
    const tree = new DelegationIndex(() => tasks, reader);
    tree.build(); tasks.setEntriesListener(tree);
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/study", delegatedFrom: { delegatingRun: org, delegatorAgentRunId: "ceo" },
      execution: { teamRunId: "study" }, teamCoordinatorAgentRunId: "tutor" });
    expect(await tree.standingOf(org)).toEqual({ agents: new Map([["/ceo", "ceo"], ["/dev/lead", "lead"], ["/dev", "lead"]]), coordinatorAddress: null });
    expect(await tree.standingOf({ rootSubjectKind: "agent_team", rootRunId: "study" })).toEqual({ agents: new Map([["/tutor", "tutor"]]), coordinatorAddress: "/tutor" });
    await tree.standingOf(org);
    expect(reader.partsOf).toHaveBeenCalledTimes(2);
  });
});

/** autobyteus-461 R-12 (SR-071, CR-461-047): the one owner of a team run's coordinator when the team does not run. */
describe("DelegationIndex.teamCoordinatorOf", () => {
  const team = (agents: RunAgent[], coordinatorAddress: string) => ({ agents, coordinatorAddress, mountedTeams: [] });
  const build = () => {
    const tasks = new InMemoryTaskExecutionResources();
    tasks.addTask("T1"); tasks.addTask("T2"); tasks.addTask("T3");
    const reader = { orgPlacementsOf: async () => null, configuredPlacementOf: async () => null, isStored: async () => true,
      partsOf: vi.fn(async (run: { rootRunId: string }) => run.rootRunId === "lone" ? null
        : team([{ agentRunId: `${run.rootRunId}-writer`, address: "/writer", agentDefinitionId: null }, { agentRunId: `${run.rootRunId}-lead`, address: "/lead", agentDefinitionId: null }], "/lead")) };
    const tree = new DelegationIndex(() => tasks, reader);
    tree.build(); tasks.setEntriesListener(tree);
    return { tasks, reader, tree };
  };

  it("a stopped delegated team, and a top team run that delegated: its standing's coordinator, from its own file (no live root asked)", async () => {
    const { tasks, reader, tree } = build();
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/eng", delegatedFrom: from, execution: { teamRunId: "eng" }, teamCoordinatorAgentRunId: "eng-lead" });
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T2", recipientAddress: "/writer", execution: { agentRunId: "notes" },
      delegatedFrom: { delegatingRun: { rootSubjectKind: "agent_team", rootRunId: "top" }, delegatorAgentRunId: "top-lead" } });
    expect(await tree.teamCoordinatorOf("eng")).toBe("eng-lead");
    expect(await tree.teamCoordinatorOf("top")).toBe("top-lead");
    expect(reader.partsOf.mock.calls.map(([run]) => run)).toEqual([{ rootSubjectKind: "agent_team", rootRunId: "eng" }, { rootSubjectKind: "agent_team", rootRunId: "top" }]);
  });

  it("a peer team run: its entry's entry agent, its file being on its node", async () => {
    const { tasks, reader, tree } = build();
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/research_team", delegatedFrom: from, execution: { teamRunId: "far" },
      teamCoordinatorAgentRunId: "lead-far", nodeId: "node-b", members: [{ address: "/lead", agentRunId: "lead-far" }] });
    expect(await tree.teamCoordinatorOf("far")).toBe("lead-far");
    expect(reader.partsOf).not.toHaveBeenCalled();
  });

  it("a team run that is not a node, an agent run's ID, and an ID of no run: null, and no file is read", async () => {
    const { tasks, reader, tree } = build();
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/writer", delegatedFrom: from, execution: { agentRunId: "notes" } });
    expect(await tree.teamCoordinatorOf("standalone-team")).toBeNull();
    expect(await tree.teamCoordinatorOf("notes")).toBeNull();
    expect(await tree.teamCoordinatorOf("no-such-run")).toBeNull();
    expect(reader.partsOf).not.toHaveBeenCalled();
  });

  it("a delegated team whose own file cannot be read: its Task entry's entry agent", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { tasks, tree } = build();
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T3", recipientAddress: "/lone", delegatedFrom: from, execution: { teamRunId: "lone" }, teamCoordinatorAgentRunId: "lone-lead" });
    expect(await tree.teamCoordinatorOf("lone")).toBe("lone-lead");
    warn.mockRestore();
  });
});
