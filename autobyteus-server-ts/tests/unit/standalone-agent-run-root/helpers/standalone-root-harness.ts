import { testViewStreams } from "../../../helpers/view-streams.js";
import type { DelegationIndex } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import { noDelegations } from "../../../helpers/no-delegations.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { vi } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../../src/agent-team-definition/domain/agent-team-definition.js";
import { createCollaboratorAdmission } from "../../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { ActiveCollaborationRootDirectory } from "../../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { createAgentRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { StandaloneAgentRunRootManager } from "../../../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import { StandaloneRootPackageStore } from "../../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { MemberExecutionContext } from "../../../../src/agent-collaboration/execution/domain/member-execution-context.js";
import type { RunModelSelectionValidator } from "../../../../src/llm-management/services/run-model-selection-service.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";
import { NO_FILES_RECEIVED, NO_PEER_CHANNEL } from "../../../helpers/explicit-host-collaborators.js";
import { UNUSED_AUTOMATIC_SWITCH } from "../../../helpers/runtime-switch-fakes.js";

/** A standalone run's root with real persistence: its agent is a double that records reservations and restores. */
export const allAvailable = { getRuntimeAvailability: async (runtimeKind) => ({ runtimeKind, enabled: true, reason: null }) };
export const runnable = {
  validate: vi.fn(),
  // A valid check returns the canonical selection; these launches declare every key, so it equals the input.
  validateMany: async (inputs: readonly unknown[]) => inputs.map((input) => ({ kind: "valid" as const, selection: (input as { selection: { llmModelIdentifier: string; llmConfig: Readonly<Record<string, unknown>> | null } }).selection })),
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
      isAgentHidden: () => false,
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

/** A standalone run's root (autobyteus-461: its own agent only) with real persistence of its own log. */
export const buildManager = async (taskExecutionResources: InMemoryTaskExecutionResources = new InMemoryTaskExecutionResources(),
  delegationIndex: DelegationIndex = noDelegations(),
  /** autobyteus-646: the quiet stop and the stopped selection save an automatic runtime switch uses. */
  switching: Readonly<{ agentRunManager?: unknown; automaticSwitch?: Readonly<{ checkAutomaticRuntimeSwitch(input: unknown): Promise<unknown>; switchRuntimeAutomatically(input: unknown): Promise<unknown> }> }> = {}) => {
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-root-")); directories.push(memoryDir);
  const host = hostRun();
  // The run's activation backend (the standalone lifecycle): records the root-built member context.
  const contexts: MemberExecutionContext[] = [];
  let currentMetadata = metadata(memoryDir);
  const restores = vi.fn(async (_hostRunId: string, input: { memberExecutionContext: MemberExecutionContext | null }) => {
    contexts.push(input.memberExecutionContext!);
    host.restore();
    return { run: host.run as never, metadata: currentMetadata };
  });
  const { catalog } = definitions();
  const directory = new ActiveCollaborationRootDirectory();
  // A test may hold the agent's termination open (a Stop in progress).
  let heldTermination: Promise<void> | null = null;
  const manager = new StandaloneAgentRunRootManager({
    memoryDir,
    activeRootDirectory: directory,
    definitions: { getAgentDefinitionById: (id) => catalog.getAgentDefinition(id) },
    orgInstruction: async () => null,
    agentServices: {
      getActiveRun: () => (host.run.isActive() ? host.run as never : null),
      activateRunAgent: restores,
      ...(switching.automaticSwitch ? switching.automaticSwitch as never : UNUSED_AUTOMATIC_SWITCH),
      terminateRunAgent: vi.fn(async () => {
        await heldTermination;
        const wasActive = host.run.isActive();
        host.crash();
        return { outcome: wasActive ? "terminated" as const : "not_active" as const, runtimeKind: null };
      }),
      readMetadata: async () => currentMetadata,
    },
    rootDependencies: { ...(switching.agentRunManager ? { agentRunManager: switching.agentRunManager as never } : {}), remoteChannel: NO_PEER_CHANNEL, receivedFiles: NO_FILES_RECEIVED, taskRecords: taskExecutionResources, delegationIndex, viewStreams: testViewStreams(), collaboratorAdmission: createCollaboratorAdmission(catalog, runnable, allAvailable) },
  });
  const agentIdentity = createCollaborationMemberExecutionIdentity({
    root: createAgentRootExecutionIdentity(HOST), memberAddress: "/research_assistant", agentRunId: HOST,
  });
  return { manager, memoryDir, host, restores, contexts, directory, agentIdentity, store: new StandaloneRootPackageStore(),
    setMetadata: (extra: Partial<AgentRunMetadata>) => { currentMetadata = metadata(memoryDir, extra); },
    /** Holds the agent's next termination until the returned release is called. */
    holdTermination: () => { let release!: () => void; heldTermination = new Promise((resolve) => { release = resolve; }); return () => { heldTermination = null; release(); }; } };
};
