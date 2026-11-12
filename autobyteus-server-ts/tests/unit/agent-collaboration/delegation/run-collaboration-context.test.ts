import { describe, expect, it, vi } from "vitest";
import { DelegationTree } from "../../../../src/agent-collaboration/delegation/delegation-tree.js";
import { RunCollaborationContext } from "../../../../src/agent-collaboration/delegation/run-collaboration-context.js";
import type { RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";
import { NO_RUN_PARTS } from "../../../helpers/run-agents-reader.js";

/**
 * autobyteus-461 SR-058 (CR-461-030): a delegated run's collaboration context, derived from the tree, as hosting gave it
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
  const tree = new DelegationTree(() => tasks, NO_RUN_PARTS);
  tree.build(); tasks.setEntriesListener(tree);
  const orgPlacementsOf = vi.fn(async (orgRunId: string) => orgRunId === "org"
    ? { orgDefinitionId: "org-def", agentAddresses: ["/manager", "/sibling"], handoffs } : null);
  const orgInstruction = vi.fn(async (id: string) => id === "org-def" ? "Organization instruction." : null);
  const context = new RunCollaborationContext({ tree, orgs: { orgPlacementsOf }, orgInstruction });
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
    await expect(h.context.ofAgentRun("mine")).resolves.toEqual({ role: "standalone_agent", placement: null });
    expect(h.context.inOrganization({ rootSubjectKind: "agent_team", rootRunId: "mine" })).toBe(false);
  });

  it("an agent of a delegated agent run is a task agent; an outside agent's copy inherits nothing", async () => {
    const h = harness();
    await h.delegate("T1", AGENT, "/outsider", { agentRunId: "outsider" });
    await h.delegate("T2", ORG, "/outsider", { agentRunId: "org-outsider" });
    await expect(h.context.ofAgentRun("outsider")).resolves.toEqual({ role: "task_agent", placement: null });
    await expect(h.context.ofAgentRun("org-outsider")).resolves.toEqual({ role: "task_agent", placement: null });
  });

  it("a copy of an org's configured agent keeps that address's handoff rules and the org's instruction, read at use", async () => {
    const h = harness();
    await h.delegate("T1", ORG, "/sibling", { agentRunId: "sibling-copy" });
    await expect(h.context.ofAgentRun("sibling-copy")).resolves.toEqual({ role: "task_agent",
      placement: { handoffs: [handoffs[0]], instruction: "Organization instruction." } });
    expect(h.orgPlacementsOf).toHaveBeenCalledWith("org");
    // The same address delegated by an agent run is not a placement of an org.
    await h.delegate("T2", AGENT, "/sibling", { agentRunId: "agent-sibling" });
    await expect(h.context.ofAgentRun("agent-sibling")).resolves.toEqual({ role: "task_agent", placement: null });
  });

  it("the organization line: a run working on a Task an org assigned, including sub-work in that Task", async () => {
    const h = harness();
    await h.delegate("T1", ORG, "/squad", { teamRunId: "squad" });
    await h.delegate("T2", AGENT, "/squad", { teamRunId: "agent-squad" });
    expect(h.context.inOrganization({ rootSubjectKind: "agent_team", rootRunId: "squad" })).toBe(true);
    expect(h.context.inOrganization({ rootSubjectKind: "agent_team", rootRunId: "agent-squad" })).toBe(false);
    // Sub-work joins its creator's Task, which the org assigned (E-4): step 2 reaches the org, and so does the line.
    await h.delegate("T1", { rootSubjectKind: "agent_team", rootRunId: "squad" }, "/helpers", { teamRunId: "helpers" }, "subWork");
    expect(h.context.inOrganization({ rootSubjectKind: "agent_team", rootRunId: "helpers" })).toBe(true);
  });
});
