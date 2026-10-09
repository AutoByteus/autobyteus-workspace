import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { vi } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../../src/agent-team-definition/domain/agent-team-definition.js";
import { createCollaboratorAdmission } from "../../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { createCollaborationMemberExecutionIdentity, createTeamRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { RunModelSelectionValidator } from "../../../../src/llm-management/services/run-model-selection-service.js";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { FlatTeamExecutionFactory } from "../../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { buildDeliveryEndpointForParticipant } from "../../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import type { CollaboratorEntry } from "../../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { buildInitialTeamRunExecutionTree } from "../../../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
import { MemberExecutionContextBuilder } from "../../../../src/agent-team-execution/services/member-team-context-builder.js";
import type { TeamRunCollaborators } from "../../../../src/agent-team-execution/services/team-run-collaborators.js";
import { materializeTeamRoot } from "../../../../src/agent-team-execution/services/team-root-materializer.js";
import { buildTeamRunConfigFromExecutionTree } from "../../../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
import { createTaskExecutionIdentityCapabilities } from "../../../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { TeamCommunicationV1Store } from "../../../../src/services/team-communication/team-communication-v1-store.js";
import { TokenUsageMigrationReadiness } from "../../../../src/token-usage/providers/token-usage-migration-readiness.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testTeamRunConfig } from "../../../fixtures/current-team-run-fixtures.js";
import { observeConfiguredHandles } from "../../agent-org-execution/helpers/task-publication-handles.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";

/** A Team root (`/coordinator`) with a shared catalog of Code Reviewer, Lead, Designer and Product Team. */
export const ROOT = "team-root-collaborators";
export const directories: string[] = [];
export const cleanupDirectories = () => Promise.all(directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
export const agents = [
  new AgentDefinition({ id: "code-reviewer", name: "Code Reviewer", description: "Reviews", instructions: "x" }),
  new AgentDefinition({ id: "lead", name: "Lead", description: "Leads", instructions: "x" }),
  new AgentDefinition({ id: "designer", name: "Designer", description: "Designs", instructions: "x" }),
];
export const teams = [new AgentTeamDefinition({
  id: "product-team", name: "Product Team", description: "Product", instructions: "Ship the product UI.",
  nodes: [new TeamMember({ memberName: "lead", ref: "lead", refScope: "shared" }), new TeamMember({ memberName: "designer", ref: "designer", refScope: "shared" })],
  coordinatorMemberName: "lead",
  handoffs: [{ from: "/lead", to: "/designer", rules: ["When UI work is needed."] }],
})];
export const admission = (runnable = true) => createCollaboratorAdmission({
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

export const harness = async (options: { runnable?: boolean } = {}) => {
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
    // Production always binds the Task side; every delegated copy belongs to a Task.
    taskExecutionResources: new InMemoryTaskExecutionResources(),
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
  const message = (sender: ReturnType<typeof identity>, recipientAddress: string, content: string, target = root) => target.deliverInterAgentMessage({
    rootTeamRunId: ROOT,
    sender: buildDeliveryEndpointForParticipant({ kind: "agent", identity: sender, displayName: sender.memberAddress.split("/").at(-1)! }),
    recipientAddress, content,
  });
  return { root, handles, reopen, identity, message, dependencies, teamMemoryDir };
};

/** `@` of both catalog definitions by the coordinator: resolves their addresses, adds nothing. */
export const mentionBoth = (root: Awaited<ReturnType<typeof harness>>["root"]) => root.resolveCollaboratorMentions({
  focusedAgentRunId: "run-coordinator",
  mentions: [{ kind: "agent", definitionId: "code-reviewer" }, { kind: "agent_team", definitionId: "product-team" }],
});
/**
 * Brings both in as collaborators (Offline, nothing started): the bring-in step of the
 * coordinator's first send_message_to each catalog address, without delivering the message.
 */
export const bringInBoth = async (root: Awaited<ReturnType<typeof harness>>["root"]) => {
  const collaborators = (root as unknown as { collaborators: TeamRunCollaborators }).collaborators;
  return [
    await collaborators.bringInAt({ address: "/code_reviewer", senderRunId: "run-coordinator" }),
    await collaborators.bringInAt({ address: "/product_team", senderRunId: "run-coordinator" }),
  ];
};
export const entriesOf = (root: Awaited<ReturnType<typeof harness>>["root"]) => {
  const [reviewer, product] = root.getExecutionTreeSnapshot().rootTeam.collaborators as CollaboratorEntry[];
  if (reviewer?.kind !== "agent" || product?.kind !== "agent_team") throw new Error("collaborators were not added");
  return { reviewer, product, lead: product.members[0]!, designer: product.members[1]! };
};
