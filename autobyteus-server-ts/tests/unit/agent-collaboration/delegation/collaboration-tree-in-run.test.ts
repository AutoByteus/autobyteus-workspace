import { describe, expect, it, vi } from "vitest";
import { DelegationIndex } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import type { RunAgent } from "../../../../src/agent-collaboration/delegation/run-parts.js";
import type { RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { createCollaboratorAdmission } from "../../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { CollaboratorDefinitionCatalog } from "../../../../src/agent-collaboration/collaborators/collaborator-candidate-policy.js";
import { standaloneRootCollaboratorPortFor } from "../../../../src/standalone-agent-run-root/services/standalone-root-collaborators.js";
import type { RunModelSelectionValidator } from "../../../../src/llm-management/services/run-model-selection-service.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";
import { readerOfAgents } from "../../../helpers/run-agents-reader.js";

/**
 * autobyteus-461 SR-059, SR-060: what a run reaches by address step 2 (its collaboration tree) is in its in-run set. A delegated copy's `@` note and
 * `list_available_agents` answer for its assigner's agents as base answered a hosted copy (base 827f1e68dc, IMP-43):
 * the assigner's own agent at its address, `run_agent`; an assigner's configured placement at its address, `in_run`.
 */
const AGENT: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "assistant-run" };
const TEAM: RootExecutionIdentity = { rootSubjectKind: "agent_team", rootRunId: "se-team" };
const agents: Record<string, readonly RunAgent[]> = {
  "agent:assistant-run": [{ agentRunId: "assistant-run", address: "/research_assistant", agentDefinitionId: "research-assistant" }],
  "agent_team:se-team": [{ agentRunId: "run-coordinator", address: "/coordinator", agentDefinitionId: "agent-coordinator" },
    { agentRunId: "run-worker", address: "/worker", agentDefinitionId: "lead" }],
  "agent:copy": [{ agentRunId: "copy", address: "/code_reviewer", agentDefinitionId: "code-reviewer" }],
  "agent:team-copy": [{ agentRunId: "team-copy", address: "/code_reviewer", agentDefinitionId: "code-reviewer" }],
};
const definition = (id: string, name: string) => new AgentDefinition({ id, name, description: name, instructions: "x" });
const definitions = [definition("research-assistant", "Research Assistant"), definition("code-reviewer", "Code Reviewer"), definition("lead", "Lead"), definition("designer", "Designer")];
const catalog: CollaboratorDefinitionCatalog = {
  listAgentDefinitions: async () => definitions, isAgentHidden: () => false, listTeamDefinitions: async () => [],
  getAgentDefinition: async (id) => definitions.find((item) => item.id === id) ?? null, getTeamDefinition: async () => null,
};
const runnable = { validate: vi.fn(), validateMany: async (inputs: readonly unknown[]) => inputs.map((input) => ({ kind: "valid" as const, selection: (input as { selection: never }).selection })) } as unknown as RunModelSelectionValidator;
const launch = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt", llmConfig: null, autoExecuteTools: false, workspaceRootPath: "/work" };
const workerNode = { address: "/worker", agentDefinitionId: "lead", role: null, description: null, agentRunId: "run-worker", platformAgentRunId: null, launchConfiguration: launch } as never;

const harness = async () => {
  const tasks = new InMemoryTaskExecutionResources();
  const configuredPlacementOf = vi.fn(async (run: RootExecutionIdentity, address: string) =>
    run.rootRunId === "se-team" && address === "/worker" ? { node: workerNode, handoffs: [] } : null);
  const tree = new DelegationIndex(() => tasks, readerOfAgents(async (run) => agents[`${run.rootSubjectKind}:${run.rootRunId}`] ?? null, { configuredPlacementOf }));
  tree.build(); tasks.setEntriesListener(tree);
  tasks.addTask("T1"); tasks.addTask("T2");
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/code_reviewer", delegatedFrom: { delegatingRun: AGENT, delegatorAgentRunId: "assistant-run" }, execution: { agentRunId: "copy" } });
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T2", recipientAddress: "/code_reviewer", delegatedFrom: { delegatingRun: TEAM, delegatorAgentRunId: "run-coordinator" }, execution: { agentRunId: "team-copy" } });
  const reachable = {
    stepTwoOf: (run: RootExecutionIdentity) => tree.collaborationTreeOf(run).stepTwo(),
    delegationPlacementAt: (run: RootExecutionIdentity, address: never) => tree.collaborationTreeOf(run).delegationPlacementAt(address),
  };
  const admission = createCollaboratorAdmission(catalog, runnable, { getRuntimeAvailability: async (runtimeKind) => ({ runtimeKind, enabled: true, reason: null }) });
  const portOf = (agentRunId: string) => standaloneRootCollaboratorPortFor({ agentRunId, address: "/code_reviewer" as never, agentDefinitionId: "code-reviewer" }, launch, agentRunId,
    async () => [...(await reachable.stepTwoOf({ rootSubjectKind: "agent", rootRunId: agentRunId }))?.values() ?? []]);
  return { reachable, admission, portOf };
};

describe("a run's collaboration tree: what it reaches by step 2", () => {
  it("step 2: the standing agents of the run's assigners at their addresses, by rank; none for a run that works on no Task", async () => {
    const h = await harness();
    expect([...(await h.reachable.stepTwoOf({ rootSubjectKind: "agent", rootRunId: "copy" }))!.values()]).toEqual([
      { address: "/research_assistant", agentRunId: "assistant-run", assigner: AGENT, rank: "run_agent", ref: { kind: "agent", definitionId: "research-assistant" } }]);
    expect([...(await h.reachable.stepTwoOf({ rootSubjectKind: "agent", rootRunId: "team-copy" }))!.values()].map(({ address, rank }) => ({ address, rank })))
      .toEqual([{ address: "/coordinator", rank: "configured" }, { address: "/worker", rank: "configured" }]);
    await expect(h.reachable.stepTwoOf({ rootSubjectKind: "agent", rootRunId: "mine" })).resolves.toBeNull();
  });

  it("delegate_task: an assigner's configured placement starts a copy from its snapshot; the assigner's own agent is no placement", async () => {
    const h = await harness();
    await expect(h.reachable.delegationPlacementAt({ rootSubjectKind: "agent", rootRunId: "team-copy" }, "/worker" as never))
      .resolves.toMatchObject({ kind: "agent", address: "/worker", source: { kind: "agent", agentDefinitionId: "lead" } });
    await expect(h.reachable.delegationPlacementAt({ rootSubjectKind: "agent", rootRunId: "copy" }, "/research_assistant" as never)).resolves.toBeNull();
  });

  it("the @ note and list_available_agents answer as base answered a hosted copy (IMP-43)", async () => {
    const h = await harness();
    const viewer = { relation: () => "other" as const, ownTeam: null };
    await expect(h.admission.resolveMentions(h.portOf("copy"), [{ kind: "agent", definitionId: "research-assistant" }], viewer)).resolves.toEqual({
      admitted: true, launchNotes: [], collaborators: [{ name: "Research Assistant", kind: "agent", address: "/research_assistant", presence: "run_agent" }] });
    await expect(h.admission.resolveMentions(h.portOf("team-copy"), [{ kind: "agent", definitionId: "lead" }], viewer)).resolves.toEqual({
      admitted: true, launchNotes: [], collaborators: [{ name: "Lead", kind: "agent", address: "/worker", presence: "in_run" }] });
    expect(await h.admission.policy.listEligible(h.portOf("copy"))).toContainEqual({ name: "Research Assistant", kind: "agent", address: "/research_assistant", description: "Research Assistant" });
    expect(await h.admission.policy.listEligible(h.portOf("team-copy"))).toContainEqual({ name: "Lead", kind: "agent", address: "/worker", description: "Lead" });
    // A catalog address never lands on an address step 2 resolves.
    expect([...await h.portOf("team-copy").addressesInUse()]).toEqual(expect.arrayContaining(["/code_reviewer", "/coordinator", "/worker"]));
  });
});
