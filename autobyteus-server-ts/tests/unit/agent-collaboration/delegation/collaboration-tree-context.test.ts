import { describe, expect, it, vi } from "vitest";
import { DelegationIndex } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import type { RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";
import { readerOfAgents } from "../../../helpers/run-agents-reader.js";

/**
 * autobyteus-461 SR-058 (CR-461-030), SR-060: a delegated run's collaboration context, from its collaboration tree, as hosting gave it
 * at base: a delegated agent run's agent is a task agent; a copy of an org's configured agent keeps that address's
 * handoff rules and the org's instruction; a run whose Task an org assigned has the organization line.
 */
const ORG: RootExecutionIdentity = { rootSubjectKind: "agent_org", rootRunId: "org" };
const AGENT: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "manager" };
const handoffs = [
  { from: "/sibling", to: "/manager", rules: ["When the sibling is done."] },
  { from: "/manager", to: "/sibling", rules: ["When the plan is ready."] },
];

const harness = () => {
  const tasks = new InMemoryTaskExecutionResources();
  const orgPlacementsOf = vi.fn(async (orgRunId: string) => orgRunId === "org"
    ? { orgDefinitionId: "org-def", agentAddresses: ["/manager", "/sibling"], handoffs } : null);
  const tree = new DelegationIndex(() => tasks, readerOfAgents(async () => null, { orgPlacementsOf }));
  tree.build(); tasks.setEntriesListener(tree);
  const context = {
    // The placement's rules are read at each call (a direct Org agent's follow its Org): compared as read now.
    ofAgentRun: async (agentRunId: string) => {
      const collaboration = await tree.collaborationTreeOf({ rootSubjectKind: "agent", rootRunId: agentRunId }).agentCollaboration();
      return { ...collaboration, placement: collaboration.placement ? { ...collaboration.placement, handoffs: collaboration.placement.handoffs() } : null };
    },
    inOrganization: (run: RootExecutionIdentity) => tree.collaborationTreeOf(run).inOrganization(),
  };
  const added = new Set<string>();
  const delegate = (taskId: string, by: RootExecutionIdentity, recipientAddress: string, execution: { agentRunId: string } | { teamRunId: string }, role: "assigned" | "subWork" = "assigned") => {
    if (!added.has(taskId)) { added.add(taskId); tasks.addTask(taskId); }
    return tasks.linkNewTaskExecution({ role, taskId, recipientAddress, delegatedFrom: { delegatingRun: by, delegatorAgentRunId: `${by.rootRunId}-agent` },
      execution, ...("teamRunId" in execution ? { teamCoordinatorAgentRunId: `${execution.teamRunId}-lead` } : {}) } as never);
  };
  return { context, delegate, orgPlacementsOf };
};

describe("RunCollaborationContext", () => {
  it("a run the user started keeps its own role: no Task names it", async () => {
    const h = harness();
    await expect(h.context.ofAgentRun("mine")).resolves.toEqual({ role: "standalone_agent", placement: null, teamScoped: false, inOrganization: false });
    expect(await h.context.inOrganization({ rootSubjectKind: "agent_team", rootRunId: "mine" })).toBe(false);
  });

  it("an agent of a delegated agent run is a task agent; an outside agent's copy inherits nothing", async () => {
    const h = harness();
    await h.delegate("T1", AGENT, "/outsider", { agentRunId: "outsider" });
    await h.delegate("T2", ORG, "/outsider", { agentRunId: "org-outsider" });
    await expect(h.context.ofAgentRun("outsider")).resolves.toEqual({ role: "task_agent", placement: null, teamScoped: false, inOrganization: false });
    await expect(h.context.ofAgentRun("org-outsider")).resolves.toEqual({ role: "task_agent", placement: null, teamScoped: true, inOrganization: false });
  });

  it("a copy of an org's configured agent keeps that address's handoff rules and reads the org's instruction, read at use", async () => {
    const h = harness();
    await h.delegate("T1", ORG, "/sibling", { agentRunId: "sibling-copy" });
    await expect(h.context.ofAgentRun("sibling-copy")).resolves.toEqual({ role: "task_agent",
      placement: { handoffs: [handoffs[0]], orgDefinitionId: "org-def" }, teamScoped: true, inOrganization: false });
    expect(h.orgPlacementsOf).toHaveBeenCalledWith("org");
    // The same address delegated by an agent run is not a placement of an org.
    await h.delegate("T2", AGENT, "/sibling", { agentRunId: "agent-sibling" });
    await expect(h.context.ofAgentRun("agent-sibling")).resolves.toEqual({ role: "task_agent", placement: null, teamScoped: false, inOrganization: false });
  });

  // CR-461-114 (F-90, REQ-009): `get_handoff_rules` where base's hosted copy had it: its tree starts at a Team or an Org run
  // (base hosted every copy of that tree in that root); a tree that starts at an Agent run gives none.
  it("is Team-scoped when its tree starts at a Team or an Org run, a copy's copy too; never under an Agent run", async () => {
    const h = harness();
    const TEAM: RootExecutionIdentity = { rootSubjectKind: "agent_team", rootRunId: "team" };
    await h.delegate("T1", TEAM, "/writer", { agentRunId: "team-copy" });
    await h.delegate("T2", { rootSubjectKind: "agent", rootRunId: "team-copy" }, "/helper", { agentRunId: "team-copy-copy" }, "subWork");
    await h.delegate("T3", ORG, "/outsider", { agentRunId: "org-copy" });
    await h.delegate("T4", AGENT, "/writer", { agentRunId: "agent-copy" });
    await h.delegate("T5", { rootSubjectKind: "agent", rootRunId: "agent-copy" }, "/helper", { agentRunId: "agent-copy-copy" }, "subWork");
    const scoped = async (id: string) => (await h.context.ofAgentRun(id)).teamScoped;
    expect(await scoped("team-copy")).toBe(true);
    expect(await scoped("team-copy-copy")).toBe(true);
    expect(await scoped("org-copy")).toBe(true);
    expect(await scoped("agent-copy")).toBe(false);
    expect(await scoped("agent-copy-copy")).toBe(false);
    // A catalog copy has no placement: its rules are none.
    expect((await h.context.ofAgentRun("team-copy")).placement).toBeNull();
  });

  it("the organization line: a run working on a Task an org assigned, including sub-work in that Task", async () => {
    const h = harness();
    await h.delegate("T1", ORG, "/squad", { teamRunId: "squad" });
    await h.delegate("T2", AGENT, "/squad", { teamRunId: "agent-squad" });
    expect(await h.context.inOrganization({ rootSubjectKind: "agent_team", rootRunId: "squad" })).toBe(true);
    expect(await h.context.inOrganization({ rootSubjectKind: "agent_team", rootRunId: "agent-squad" })).toBe(false);
    // Sub-work joins its creator's Task, which the org assigned (E-4): step 2 reaches the org, and so does the line.
    await h.delegate("T1", { rootSubjectKind: "agent_team", rootRunId: "squad" }, "/helpers", { teamRunId: "helpers" }, "subWork");
    expect(await h.context.inOrganization({ rootSubjectKind: "agent_team", rootRunId: "helpers" })).toBe(true);
  });
});
