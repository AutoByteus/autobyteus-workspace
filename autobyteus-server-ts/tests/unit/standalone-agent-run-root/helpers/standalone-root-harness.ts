import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { vi } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../../src/agent-team-definition/domain/agent-team-definition.js";
import { createCollaboratorAdmission } from "../../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { ActiveCollaborationRootDirectory } from "../../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { AgentRunMemoryLocator } from "../../../../src/agent-collaboration/execution/services/agent-run-memory-locator.js";
import { createAgentRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { StandaloneAgentRunRootManager } from "../../../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import { FlatTeamExecutionFactory } from "../../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { createTaskExecutionIdentityCapabilities } from "../../../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import { StandaloneRootPackageStore } from "../../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { TokenUsageCapability } from "../../../../src/token-usage/providers/token-usage-capability.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { MemberExecutionContext } from "../../../../src/agent-collaboration/execution/domain/member-execution-context.js";
import { observeConfiguredHandles } from "../../agent-org-execution/helpers/task-publication-handles.js";
import type { RunModelSelectionValidator } from "../../../../src/llm-management/services/run-model-selection-service.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";

/**
 * A standalone run's Agent root with real persistence: the host run is a double that records reservations
 * and restores; collaborator and copy handles are observed doubles. Shared by the standalone root suites.
 */
export const allAvailable = { getRuntimeAvailability: async (runtimeKind) => ({ runtimeKind, enabled: true, reason: null }) };
export const runnable = {
  validate: vi.fn(),
  validateMany: async (inputs: readonly unknown[]) => inputs.map(() => ({ kind: "valid" as const, selection: { llmModelIdentifier: "m", llmConfig: null } })),
} as unknown as RunModelSelectionValidator;

export const directories: string[] = [];
export const cleanupDirectories = () => Promise.all(directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));

export const HOST = "research-assistant-run";

export const definitions = () => {
  const agents = [
    new AgentDefinition({ id: "research-assistant", name: "Research Assistant", description: "Researches", instructions: "x" }),
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
  return {
    agents,
    teams,
    catalog: {
      listAgentDefinitions: async () => agents,
      listTeamDefinitions: async () => teams,
      getAgentDefinition: async (id: string) => agents.find((agent) => agent.id === id) ?? null,
      getTeamDefinition: async (id: string) => teams.find((team) => team.id === id) ?? null,
    },
  };
};

export const metadata = (memoryDir: string, extra: Partial<AgentRunMetadata> = {}): AgentRunMetadata => ({
  runId: HOST,
  agentDefinitionId: "research-assistant",
  workspaceRootPath: "/work",
  memoryDir: path.join(memoryDir, "agents", HOST),
  llmModelIdentifier: "gpt-host",
  llmConfig: { effort: "high" },
  autoExecuteTools: true,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: "thread-1",
  startedAt: "2026-09-30T00:00:00.000Z",
  ...extra,
});

/** The host is a standalone run owned elsewhere; this double records reservations and restores. */
export const hostRun = () => {
  let active = true;
  const reserved: string[] = [];
  const published: unknown[] = [];
  const run = {
    runId: HOST,
    isActive: () => active,
    reserveUserMessage: vi.fn(async (message: { content: string }) => {
      reserved.push(message.content);
      return { reserved: true as const, reservation: { agentRunId: HOST, cancel: vi.fn(), commit: vi.fn(() => ({ release: vi.fn() })) } };
    }),
    publishEvent: vi.fn(async (event: unknown) => { published.push(event); }),
    postUserMessage: vi.fn(async (_message: { content: string }, _options: unknown) => ({ accepted: true as const })),
  };
  return { run, reserved, published, crash: () => { active = false; }, restore: () => { active = true; } };
};

/** Production always binds the Task side; every delegated copy belongs to a Task. */
export const buildManager = async (taskExecutionResources: InMemoryTaskExecutionResources = new InMemoryTaskExecutionResources()) => {
  vi.spyOn(TokenUsageCapability.prototype, "assertCurrentSchemaReady").mockImplementation(() => undefined);
  const handles = observeConfiguredHandles();
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-root-")); directories.push(memoryDir);
  const host = hostRun();
  // The host's activation backend (the standalone lifecycle): records the root-built member context.
  const contexts: MemberExecutionContext[] = [];
  let currentMetadata = metadata(memoryDir);
  const restores = vi.fn(async (_hostRunId: string, input: { memberExecutionContext: MemberExecutionContext | null }) => {
    contexts.push(input.memberExecutionContext!);
    host.restore();
    return { run: host.run as never, metadata: currentMetadata };
  });
  const catalogFlag = vi.fn(async () => undefined);
  let allocation = 0;
  const { catalog } = definitions();
  const directory = new ActiveCollaborationRootDirectory();
  const manager = new StandaloneAgentRunRootManager({
    memoryDir,
    activeRootDirectory: directory,
    definitions: { getAgentDefinitionById: (id) => catalog.getAgentDefinition(id) },
    host: {
      getActiveRun: () => (host.run.isActive() ? host.run as never : null),
      activateHost: restores,
      terminateHost: vi.fn(async () => {
        const wasActive = host.run.isActive();
        host.crash();
        return { outcome: wasActive ? "terminated" as const : "not_active" as const, runtimeKind: null };
      }),
      readMetadata: async () => currentMetadata,
      recordCollaborationPackageCreated: catalogFlag,
    },
    taskExecutionResources,
    rootDependencies: {
      taskExecutionResources,
      flatTeamExecutionFactory: new FlatTeamExecutionFactory({ memoryLocator: new AgentRunMemoryLocator({ memoryDir }) }),
      taskExecutionIdentity: createTaskExecutionIdentityCapabilities({ allocateForAgentDefinition: async (id) => `${id}-run-${++allocation}` }),
      teamDefinitions: { getDefinitionById: (id) => catalog.getTeamDefinition(id) },
      memoryLocator: new AgentRunMemoryLocator({ memoryDir }),
      activityInspector: { inspect: vi.fn(() => ({ kind: "present" as const })) } as never,
      collaboratorAdmission: createCollaboratorAdmission(catalog, runnable, allAvailable),
    },
  });
  const hostIdentity = createCollaborationMemberExecutionIdentity({
    root: createAgentRootExecutionIdentity(HOST), memberAddress: "/research_assistant", agentRunId: HOST,
  });
  return { manager, memoryDir, host, restores, contexts, catalogFlag, handles, directory, hostIdentity, store: new StandaloneRootPackageStore(),
    setMetadata: (extra: Partial<AgentRunMetadata>) => { currentMetadata = metadata(memoryDir, extra); } };
};

