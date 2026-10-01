import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { collaboratorMentionNote } from "@autobyteus/agent-presentation-contracts";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/agent-team-definition.js";
import { createCollaboratorMentionAdmission } from "../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { createCollaborationMemberExecutionIdentity, createTeamRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { RunModelSelectionValidator } from "../../../src/llm-management/services/run-model-selection-service.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { FlatTeamExecutionFactory } from "../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { buildDeliveryEndpointForParticipant } from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import type { CollaboratorEntry } from "../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { buildInitialTeamRunExecutionTree } from "../../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
import { MemberExecutionContextBuilder } from "../../../src/agent-team-execution/services/member-team-context-builder.js";
import { materializeTeamRoot } from "../../../src/agent-team-execution/services/team-root-materializer.js";
import { buildTeamRunConfigFromExecutionTree } from "../../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
import { createTaskExecutionIdentityCapabilities } from "../../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { TeamCommunicationV1Store } from "../../../src/services/team-communication/team-communication-v1-store.js";
import { TokenUsageMigrationReadiness } from "../../../src/token-usage/providers/token-usage-migration-readiness.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";
import { flushMicrotasks, observeConfiguredHandles } from "../agent-org-execution/helpers/task-publication-handles.js";

const ROOT = "team-root-collaborators";
const directories: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

const agents = [
  new AgentDefinition({ id: "code-reviewer", name: "Code Reviewer", description: "Reviews", instructions: "x" }),
  new AgentDefinition({ id: "lead", name: "Lead", description: "Leads", instructions: "x" }),
  new AgentDefinition({ id: "designer", name: "Designer", description: "Designs", instructions: "x" }),
];
const teams = [new AgentTeamDefinition({
  id: "product-team", name: "Product Team", description: "Product", instructions: "Ship the product UI.",
  nodes: [new TeamMember({ memberName: "lead", ref: "lead", refScope: "shared" }), new TeamMember({ memberName: "designer", ref: "designer", refScope: "shared" })],
  coordinatorMemberName: "lead",
  handoffs: [{ from: "/lead", to: "/designer", rules: ["When UI work is needed."] }],
})];
const admission = (runnable = true) => createCollaboratorMentionAdmission({
  listAgentDefinitions: async () => agents,
  listTeamDefinitions: async () => teams,
  getAgentDefinition: async (id) => agents.find((agent) => agent.id === id) ?? null,
  getTeamDefinition: async (id) => teams.find((team) => team.id === id) ?? null,
}, {
  validate: vi.fn(),
  validateMany: async (inputs: readonly unknown[]) => inputs.map(() => runnable
    ? { kind: "valid" as const, selection: { llmModelIdentifier: "m", llmConfig: null } }
    : { kind: "model_unavailable" as const }),
} as unknown as RunModelSelectionValidator);

const harness = async (options: { runnable?: boolean } = {}) => {
  vi.spyOn(TokenUsageMigrationReadiness.prototype, "assertCurrentSchemaReady").mockImplementation(() => undefined);
  const handles = observeConfiguredHandles();
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-root-collaborators-")); directories.push(memoryDir);
  const teamMemoryDir = new AgentMemoryLayout(memoryDir).getTeamDirPath({ rootTeamRunId: ROOT, ancestorTeamRunIds: [] });
  let allocation = 0;
  const dependencies = {
    factory: new FlatTeamExecutionFactory(),
    memberExecutionContextBuilder: new MemberExecutionContextBuilder({
      getDefinitionById: async (id: string) => (id === "product-team" ? { instructions: "Ship the product UI." } : { instructions: "Root team rules." }),
    } as never),
    taskExecutionIdentity: createTaskExecutionIdentityCapabilities({ allocateForAgentDefinition: async (id) => `${id}-run-${++allocation}` }),
    executionTreeStore: new TeamRunExecutionTreeStore(),
    communicationStore: new TeamCommunicationV1Store(),
    collaboratorAdmission: admission(options.runnable ?? true),
    onTerminated: vi.fn(),
  };
  const config = testTeamRunConfig({
    rootTeamRunId: ROOT, rootTeamDefinitionId: "se-team", coordinatorAddress: "/coordinator",
    children: [testAgentNode("/coordinator", { agentRunId: "run-coordinator", runtimeKind: RuntimeKind.CODEX_APP_SERVER })],
  });
  const root = await materializeTeamRoot({
    config,
    tree: buildInitialTeamRunExecutionTree({ config, teamDefinitionName: "SE Team" }),
    messages: Object.freeze({ schemaVersion: 1 as const, rootTeamRunId: ROOT, messages: Object.freeze([]) }),
    teamMemoryDir, mode: "fresh", persistInitialPackage: true, ...dependencies,
  });
  const reopen = async () => {
    const tree = (await dependencies.executionTreeStore.read(teamMemoryDir, ROOT))!;
    const messages = (await dependencies.communicationStore.read(teamMemoryDir, ROOT))!;
    return materializeTeamRoot({
      config: buildTeamRunConfigFromExecutionTree(tree), tree, messages,
      teamMemoryDir, mode: "restore", persistInitialPackage: false, ...dependencies,
    });
  };
  const identity = (memberAddress: string, agentRunId: string) =>
    createCollaborationMemberExecutionIdentity({ root: createTeamRootExecutionIdentity(ROOT), memberAddress, agentRunId });
  const message = (sender: ReturnType<typeof identity>, recipientAddress: string, content: string) => root.deliverInterAgentMessage({
    rootTeamRunId: ROOT,
    sender: buildDeliveryEndpointForParticipant({ kind: "agent", identity: sender, displayName: sender.memberAddress.split("/").at(-1)! }),
    recipientAddress, content,
  });
  return { root, handles, reopen, identity, message, dependencies, teamMemoryDir };
};

const admitBoth = (root: Awaited<ReturnType<typeof harness>>["root"]) => root.admitCollaboratorMentions({
  focusedAgentRunId: "run-coordinator", content: "Bring them in",
  mentions: [{ kind: "agent", definitionId: "code-reviewer" }, { kind: "agent_team", definitionId: "product-team" }],
});
const entriesOf = (root: Awaited<ReturnType<typeof harness>>["root"]) => {
  const [reviewer, product] = root.getExecutionTreeSnapshot().rootTeam.collaborators as CollaboratorEntry[];
  if (reviewer?.kind !== "agent" || product?.kind !== "agent_team") throw new Error("collaborators were not added");
  return { reviewer, product, lead: product.members[0]!, designer: product.members[1]! };
};

describe("collaborators hosted in a Team root (AR-006)", () => {
  it("adds each collaborator once at admission, Offline, persisted with its run IDs and published", async () => {
    const f = await harness();
    const events: TeamRunEvent[] = [];
    f.root.subscribeToEvents(({ event }) => events.push(event));
    const result = await admitBoth(f.root);
    expect(result).toMatchObject({ admitted: true });
    expect(result.admitted && collaboratorMentionNote.parse(result.content)?.collaborators).toEqual([
      { name: "Code Reviewer", kind: "agent", address: "/code_reviewer" },
      { name: "Product Team", kind: "agent_team", address: "/product_team" },
    ]);
    const { reviewer, product, lead, designer } = entriesOf(f.root);
    const stored = await f.dependencies.executionTreeStore.read(f.teamMemoryDir, ROOT);
    expect(stored!.rootTeam.collaborators).toEqual(f.root.getExecutionTreeSnapshot().rootTeam.collaborators);
    expect(events.filter((event) => event.eventSourceType === TeamRunEventSourceType.COLLABORATOR)).toHaveLength(2);
    // Status leaves include every collaborator execution, Offline until its first message.
    const statuses = new Map(f.root.getLeafAgentStatusSnapshots().map((snapshot) => [snapshot.execution.agentRunId, snapshot.details.status]));
    expect([reviewer.agentRunId, lead.agentRunId, designer.agentRunId].map((id) => statuses.get(id))).toEqual(["offline", "offline", "offline"]);
    // The collaborator Team is a managed TeamRun under the root; its coordinator resolves.
    expect(f.root.getCoordinatorAgentRunId(product.teamRunId)).toBe(lead.agentRunId);
    expect(f.root.getAgentExecution(designer.agentRunId)).toMatchObject({
      containingTeamRunId: product.teamRunId, ancestorTeamRunIds: [product.teamRunId],
    });
    expect(f.root.getAgentExecution(reviewer.agentRunId)).toMatchObject({ containingTeamRunId: ROOT, ancestorTeamRunIds: [] });
    // Nothing started.
    expect(f.handles.size).toBe(0);
  });

  it("starts a collaborator on a user send, serves interrupt and tool approval, and delivers by address both ways", async () => {
    const f = await harness();
    await admitBoth(f.root);
    const { reviewer, lead, designer } = entriesOf(f.root);
    await expect(f.root.executeAgentCommand(reviewer.agentRunId, { kind: "post_message", message: { content: "Review this" } as never }))
      .resolves.toMatchObject({ accepted: true });
    const reviewerHandle = f.handles.get(reviewer.agentRunId)!;
    expect(reviewerHandle.input.activationMode).toBe("fresh");
    expect(reviewerHandle.handle.postMessage).toHaveBeenCalledOnce();
    // A collaborator Agent has no enclosing Team instruction or handoffs.
    expect(reviewerHandle.input.memberExecutionContext).toMatchObject({ authoredEnclosingScopeInstruction: null });
    expect(reviewerHandle.input.memberExecutionContext.collaboration.outgoingHandoffs).toEqual([]);
    await expect(f.root.executeAgentCommand(reviewer.agentRunId, { kind: "interrupt" })).resolves.toMatchObject({ accepted: true });
    expect(reviewerHandle.handle.interrupt).toHaveBeenCalledOnce();
    await expect(f.root.executeAgentCommand(reviewer.agentRunId, { kind: "approve_tool", invocationId: "t1", approved: false, reason: "no" }))
      .resolves.toMatchObject({ accepted: true });
    expect(reviewerHandle.handle.approveToolInvocation).toHaveBeenCalledWith("t1", false, "no");

    // The coordinator messages the collaborator Team by address: its coordinator starts.
    const coordinator = f.identity("/coordinator", "run-coordinator");
    await expect(f.message(coordinator, "/product_team", "Design it")).resolves.toMatchObject({ accepted: true });
    const leadHandle = f.handles.get(lead.agentRunId)!;
    expect(leadHandle.handle.reserveInput).toHaveBeenCalledOnce();
    expect(leadHandle.input.memberExecutionContext).toMatchObject({ teamScoped: true, authoredEnclosingScopeInstruction: "Ship the product UI." });
    expect(leadHandle.input.memberExecutionContext.collaboration.outgoingHandoffs)
      .toEqual([{ from: "/product_team/lead", to: "/product_team/designer", rules: ["When UI work is needed."] }]);
    // DI-001: the lead's authored handoff reaches its teammate's own instance.
    await expect(f.message(leadHandle.input.identity, "/product_team/designer", "UI please")).resolves.toMatchObject({ accepted: true });
    expect(f.handles.get(designer.agentRunId)!.handle.reserveInput).toHaveBeenCalledOnce();
    // The collaborator's report back is authorized and delivered.
    await expect(f.message(reviewerHandle.input.identity, "/coordinator", "Done.")).resolves.toMatchObject({ accepted: true });
    expect(f.root.getExecutionTreeSnapshot().rootTeam.taskExecutions).toEqual([]);
    expect(f.root.getCommunicationSnapshot().messages.map((entry) => entry.receiverAgentRunId))
      .toEqual([lead.agentRunId, designer.agentRunId, "run-coordinator"]);
  });

  it("starts an extra copy on delegate_task, hosted by the delegator's Team (REQ-013)", async () => {
    const f = await harness();
    await admitBoth(f.root);
    const { product, lead } = entriesOf(f.root);
    const coordinator = { identity: f.identity("/coordinator", "run-coordinator") };
    await expect(f.root.delegateTask(coordinator, { recipient_address: "/code_reviewer", description: "Review too" }))
      .resolves.toMatchObject({ target_agent_run_id: "code-reviewer-run-4" });
    await expect(f.root.delegateTask({ identity: f.identity("/product_team/lead", lead.agentRunId) }, { recipient_address: "/product_team/designer", description: "Mock it" }))
      .resolves.toMatchObject({ target_agent_run_id: "designer-run-5" });
    await flushMicrotasks();
    const tree = f.root.getExecutionTreeSnapshot();
    expect(tree.rootTeam.taskExecutions.map((task) => task.address)).toEqual(["/code_reviewer"]);
    const team = tree.rootTeam.collaborators.find((entry) => entry.address === "/product_team")!;
    expect(team.kind === "agent_team" && team.taskExecutions.map((task) => task.address)).toEqual(["/product_team/designer"]);
    expect(f.root.getAgentExecution("designer-run-5")).toMatchObject({ containingTeamRunId: product.teamRunId });
  });

  it("restores collaborators with the root after Stop, in restore mode with the same run IDs", async () => {
    const f = await harness();
    await admitBoth(f.root);
    const { reviewer, lead } = entriesOf(f.root);
    await f.root.executeAgentCommand(reviewer.agentRunId, { kind: "post_message", message: { content: "x" } as never });
    await f.message(f.identity("/coordinator", "run-coordinator"), "/product_team", "Design it");
    await expect(f.root.terminate()).resolves.toMatchObject({ accepted: true });
    expect(f.handles.get(reviewer.agentRunId)!.finish).toHaveBeenCalled();
    expect(f.handles.get(lead.agentRunId)!.finish).toHaveBeenCalled();

    const reopened = await f.reopen();
    expect(entriesOf(reopened).reviewer.agentRunId).toBe(reviewer.agentRunId);
    await expect(reopened.executeAgentCommand(reviewer.agentRunId, { kind: "post_message", message: { content: "Again" } as never }))
      .resolves.toMatchObject({ accepted: true });
    expect(f.handles.get(reviewer.agentRunId)!.input.activationMode).toBe("restore");
    await expect(reopened.executeAgentCommand(lead.agentRunId, { kind: "post_message", message: { content: "Again" } as never }))
      .resolves.toMatchObject({ accepted: true });
    expect(f.handles.get(lead.agentRunId)!.input.activationMode).toBe("restore");
    await reopened.terminate();
  });

  it("rejects an unrunnable mention without writing, hosting or publishing anything", async () => {
    const f = await harness({ runnable: false });
    const events: TeamRunEvent[] = [];
    f.root.subscribeToEvents(({ event }) => events.push(event));
    await expect(admitBoth(f.root)).resolves.toMatchObject({ admitted: false, code: "COLLABORATOR_ADD_FAILED", collaboratorName: "Code Reviewer" });
    expect(f.root.getExecutionTreeSnapshot().rootTeam.collaborators).toEqual([]);
    expect((await f.dependencies.executionTreeStore.read(f.teamMemoryDir, ROOT))!.rootTeam.collaborators).toEqual([]);
    expect(events).toEqual([]);
  });
});
