import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { vi } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../../src/agent-team-definition/domain/agent-team-definition.js";
import { createCollaboratorAdmission } from "../../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { prepareCollaboratorHandles } from "../../../../src/agent-collaboration/execution/backends/collaborator-handle-preparation.js";
import type { RunModelSelectionValidator } from "../../../../src/llm-management/services/run-model-selection-service.js";
import { projectAgentOrgConfiguredAgentNode, projectAgentOrgConfiguredTeamNode } from "../../../../src/agent-org-execution/services/agent-org-runtime-config-projector.js";
import type { TeamRunAgentTeamNode } from "../../../../src/agent-team-execution/domain/team-run-config.js";
import { AgentOrgRun } from "../../../../src/agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { RootTeamExecutionDirectory } from "../../../../src/agent-collaboration/execution/backends/root-team-execution-directory.js";
import { RootAgentExecutionRegistry } from "../../../../src/agent-collaboration/execution/backends/root-agent-execution-registry.js";
import { AgentOrgRunPersistenceCoordinator } from "../../../../src/agent-org-execution/services/agent-org-run-persistence-coordinator.js";
import { AgentOrgRunExecutionTreeStore } from "../../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { AgentOrgCommunicationMessagesV1Store } from "../../../../src/agent-org-execution/persistence/agent-org-communication-messages-v1-store.js";
import { FlatTeamExecutionFactory } from "../../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import type { FlatTeamExecutionCallbacks } from "../../../../src/agent-team-execution/local/flat-team-execution-callbacks.js";
import { RootEventPublisher } from "../../../../src/agent-collaboration/execution/services/root-event-publisher.js";
import { createAgentOrgRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { TokenUsageMigrationReadiness } from "../../../../src/token-usage/providers/token-usage-migration-readiness.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../../fixtures/current-agent-org-run-fixtures.js";
import { observeConfiguredHandles } from "./task-publication-handles.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";
import type { AgentOrgRunCollaborators } from "../../../../src/agent-org-execution/services/agent-org-run-collaborators.js";

/**
 * An AgentOrg (`/director`, mounted Team `/target` with `/target/lead` and `/target/writer`) over a
 * shared catalog of Director, Code Reviewer, Designer and Product Team.
 */
export const directories: string[] = [];
export const cleanupDirectories = () => Promise.all(directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));

export const validator = (runnable = true) => ({
  validate: vi.fn(),
  validateMany: vi.fn(async (inputs: readonly unknown[]) => inputs.map(() => runnable
    ? { kind: "valid" as const, selection: { llmModelIdentifier: "m", llmConfig: null } }
    : { kind: "model_unavailable" as const })),
}) as unknown as RunModelSelectionValidator;

export const admission = (runnable = true) => {
  const agents = [
    new AgentDefinition({ id: "definition-director", name: "Director", description: "d", instructions: "x" }),
    new AgentDefinition({ id: "code-reviewer", name: "Code Reviewer", description: "Reviews", instructions: "x" }),
    new AgentDefinition({ id: "designer", name: "Designer", description: "Designs", instructions: "x" }),
  ];
  const teams = [new AgentTeamDefinition({
    id: "product-team", name: "Product Team", description: "Product", instructions: "x",
    nodes: [new TeamMember({ memberName: "designer", ref: "designer", refScope: "shared" })],
    coordinatorMemberName: "designer", handoffs: [],
  })];
  return createCollaboratorAdmission({
    listAgentDefinitions: async () => agents,
    listTeamDefinitions: async () => teams,
    getAgentDefinition: async (id) => agents.find((agent) => agent.id === id) ?? null,
    getTeamDefinition: async (id) => teams.find((team) => team.id === id) ?? null,
  }, validator(runnable));
};

export const buildOrg = async (options: { runnable?: boolean } = {}) => {
  vi.spyOn(TokenUsageMigrationReadiness.prototype, "assertCurrentSchemaReady").mockImplementation(() => undefined);
  const handles = observeConfiguredHandles();
  const root = createAgentOrgRootExecutionIdentity("org-collaborators");
  const orgMemoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "org-collaborators-")); directories.push(orgMemoryDir);
  const tree = testAgentOrgExecutionTree({ orgRunId: root.rootRunId, members: [
    { ...testOrgAgentNode("/director", "director"), agentDefinitionId: "definition-director" },
    testOrgTeamNode({ address: "/target", teamRunId: "configured-team", coordinatorAddress: "/target/lead",
      members: [testOrgAgentNode("/target/lead", "configured-lead"), testOrgAgentNode("/target/writer", "configured-writer")] }),
  ] });
  const messages = { schemaVersion: 1 as const, subjectKind: "agent_org" as const, orgRunId: root.rootRunId, messages: [] };
  const executionTreeStore = new AgentOrgRunExecutionTreeStore();
  const persistence = new AgentOrgRunPersistenceCoordinator({ orgRunId: root.rootRunId, orgMemoryDir,
    executionTreeStore, communicationStore: new AgentOrgCommunicationMessagesV1Store(), enterPersistenceFailStop: vi.fn() });
  await persistence.commitInitial({ tree, messages });
  let run: AgentOrgRun | undefined;
  const callbacks: FlatTeamExecutionCallbacks = {
    buildMemberExecutionContext: vi.fn(async () => ({} as never)), commitPlatformBindingChange: vi.fn(),
    publishAgentEvent: (identity, event) => run?.onAgentExecutionEvent(identity, event),
  };
  const rootAgents = new RootAgentExecutionRegistry({ root, callbacks });
  const teams = new RootTeamExecutionDirectory(new FlatTeamExecutionFactory());
  for (const member of tree.rootOrg.members) {
    if ("agentRunId" in member) {
      (await rootAgents.prepareConfigured(projectAgentOrgConfiguredAgentNode(member), "fresh")).commitAfterDurability();
    } else {
      (await teams.prepareConfigured({ teamNode: projectAgentOrgConfiguredTeamNode(member), handoffs: [],
        physicalScope: { root, ancestorTeamRunIds: [member.teamRunId] }, callbacks, activationMode: "fresh" })).commitAfterDurability();
    }
  }
  const publisher = new RootEventPublisher<AgentOrgRunEvent>();
  let allocation = 0;
  run = new AgentOrgRun({ root, tree, messages, rootAgents, teams, callbacks, persistence, publisher,
    taskExecutionIdentity: {
      agentRuns: { allocateForAgentDefinition: async () => `task-agent-${++allocation}` },
      taskTeams: { create: async ({ source }: { source: TeamRunAgentTeamNode }) => {
        const id = `task-team-${++allocation}`;
        return { teamNode: { ...source, teamRunId: id,
          children: source.children.map((child) => ({ ...child, agentRunId: `${id}-${child.address.split("/").at(-1)}`, platformAgentRunId: null })) } };
      } },
    } as never,
    activityInspector: { inspect: vi.fn(() => ({ kind: "present" as const })) } as never,
    collaboratorAdmission: admission(options.runnable ?? true),
    prepareCollaboratorHandles: (entries) => prepareCollaboratorHandles({ root, rootAgents, teams, teamCallbacks: callbacks, entries, mode: "fresh" }),
    // Production always binds the Task side; every delegated copy belongs to a Task.
    taskExecutionResources: new InMemoryTaskExecutionResources(),
  });
  run.activate();
  return { handles, root, orgMemoryDir, executionTreeStore, owner: run, rootAgents, teams, publisher };
};

/**
 * Brings a catalog address in as a collaborator (Offline, nothing started): the bring-in step of
 * the sender's first send_message_to that address, without delivering the message.
 */
export const bringIn = (owner: AgentOrgRun, address: string, senderRunId: string) =>
  (owner as unknown as { collaborators: AgentOrgRunCollaborators }).collaborators.bringInAt({ address, senderRunId });
