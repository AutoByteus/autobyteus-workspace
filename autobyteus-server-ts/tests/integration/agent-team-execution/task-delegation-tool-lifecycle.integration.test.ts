import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import type { AgentRunInputReservationResult } from "../../../src/agent-execution/input/agent-run-input-contract.js";
import type { TeamRunBackend } from "../../../src/agent-team-execution/backends/team-run-backend.js";
import { FlatAgentExecutionContext, FlatTeamExecutionContext } from "../../../src/agent-team-execution/local/flat-team-execution-context.js";
import type { PreparedLocalExecutionTermination } from "../../../src/agent-collaboration/execution/domain/prepared-local-execution-termination.js";
import { createTaskExecutionPreparation, type TaskExecutionPreparationOperation, type PreparedTaskExecution } from "../../../src/agent-team-execution/domain/prepared-task-execution.js";
import { RootTeamRun } from "../../../src/agent-team-execution/domain/root-team-run.js";
import { AdHocTaskStore } from "../../../src/projects/stores/ad-hoc-task-store.js";
import { AdHocTasksLayout } from "../../../src/projects/stores/ad-hoc-tasks-layout.js";
import { createCollaboratorAdmission } from "../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { createTaskExecutionIdentityCapabilities } from "../../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import type { PrepareTaskAgentInput, RestoreTaskAgentInput } from "../../../src/agent-team-execution/domain/task-agent-execution.js";
import type { PrepareTaskTeamInput, RestoreTaskTeamInput } from "../../../src/agent-team-execution/domain/task-team-execution.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import {
  createRootExecutionPhysicalScope,
  createCollaborationMemberExecutionIdentity,
  createTeamRootExecutionIdentity,
  type RootExecutionPhysicalScope,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { MemberTaskCommandCapability } from "../../../src/agent-collaboration/execution/task/member-task-command-capability.js";
import type { TaskExecutionReference } from "../../../src/agent-collaboration/execution/task/task-execution-reference.js";
import type { TaskExecutionIdleTimers } from "../../../src/agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.js";
import type { TeamMemberExecutionCommand } from "../../../src/agent-team-execution/domain/team-member-execution-command.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import type { TeamRunAgentTeamNode, TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { createTeamAgentExecutionBinding } from "../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import { createTeamAgentStatusDetails, deriveTeamAgentStatusHint } from "../../../src/agent-team-execution/domain/team-agent-status.js";
import { assertAgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { buildInitialTeamRunExecutionTree } from "../../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
import { TeamRunEventPublisher } from "../../../src/agent-team-execution/services/team-run-event-publisher.js";
import { TeamRunPersistenceCoordinator } from "../../../src/agent-team-execution/services/team-run-persistence-coordinator.js";
import {
  DELEGATE_TASK_TOOL_NAME,
  TASK_DELEGATION_TOOL_NAME_LIST,
} from "../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { getTaskDelegationToolManifestEntry } from "../../../src/agent-tools/task-delegation/task-delegation-tool-manifest.js";
import { TaskDelegationToolService } from "../../../src/agent-tools/task-delegation/task-delegation-tool-service.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { getTeamRunExecutionTreePath } from "../../../src/run-history/store/team-run-execution-tree-path.js";
import { TeamCommunicationV1Store } from "../../../src/services/team-communication/team-communication-v1-store.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/agent-team-definition.js";
import type { RunModelSelectionValidator } from "../../../src/llm-management/services/run-model-selection-service.js";
import { ProjectStore } from "../../../src/projects/stores/project-store.js";
import { ProjectService } from "../../../src/projects/services/project-service.js";
import { ProjectTaskService } from "../../../src/projects/services/project-task-service.js";
import { ProjectTaskContextStore } from "../../../src/projects/context/project-task-context-store.js";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import { TaskExecutionResourceService } from "../../../src/projects/services/task-execution-resource-service.js";
import { TaskExecutionResourceStore } from "../../../src/projects/stores/task-execution-resource-store.js";
import { buildDeliveryEndpointForParticipant } from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import {
  testAgentNode,
  testTeamRunConfig,
} from "../../fixtures/current-team-run-fixtures.js";

const rootTeamRunId = "task-delegation-integration-run";
const tempDirs: string[] = [];

const createChildPhysicalScope = (
  parent: RootExecutionPhysicalScope,
  childTeamRunId: string,
): RootExecutionPhysicalScope => createRootExecutionPhysicalScope({
  root: parent.root,
  ancestorTeamRunIds: [...parent.ancestorTeamRunIds, childTeamRunId],
});

class PreparedTask implements PreparedTaskExecution {
  readonly binding;
  readonly preparedTeamRuns;
  readonly stagedPlatformBindings = Object.freeze([]);
  readonly releaseWork = vi.fn(async (assertOpen: () => void) => { assertOpen(); return { accepted: true as const }; });
  readonly abort = vi.fn(async () => undefined);
  private state: "open" | "sealed" | "committed" = "open";

  constructor(input: {
    binding: PreparedTaskExecution["binding"];
    preparedTeamRuns?: readonly TeamRun[];
    onCommit(): void;
  }, private readonly onCommit = input.onCommit) {
    this.binding = input.binding;
    this.preparedTeamRuns = Object.freeze([...(input.preparedTeamRuns ?? [])]);
  }

  sealForCommit(): void {
    if (this.state !== "open") throw new Error("Task preparation cannot be sealed twice.");
    this.state = "sealed";
  }

  commitAfterDurability() {
    if (this.state !== "sealed") throw new Error("Task preparation was not sealed.");
    this.state = "committed";
    this.onCommit();
    return Object.freeze({ releaseWork: this.releaseWork });
  }
}

/** Local backend double: tracks which direct task Agents are live; the root lifecycle stays real. */
class TestTeamBackend implements TeamRunBackend {
  readonly teamBackendKind = TeamBackendKind.MIXED;
  readonly runtimeContext: FlatTeamExecutionContext;
  readonly context: TeamRunContext<FlatTeamExecutionContext>;
  readonly preparedAgents: PrepareTaskAgentInput[] = [];
  readonly preparedTeams: PrepareTaskTeamInput[] = [];
  readonly restoredAgents: RestoreTaskAgentInput[] = [];
  readonly reservations: string[] = [];
  readonly commands: Array<{ agentRunId: string; command: TeamMemberExecutionCommand }> = [];
  readonly liveTaskAgents = new Set<string>();
  readonly shutDownAgents: string[] = [];
  /** Agents whose runtime reports a running background task: AgentRunTermination's quiet check refuses them. */
  readonly backgroundBusyAgents = new Set<string>();
  readonly children = new Map<string, TestTeamBackend>();
  active = true;

  constructor(
    readonly physicalScope: RootExecutionPhysicalScope,
    readonly teamNode: TeamRunAgentTeamNode,
    readonly config: TeamRunConfig,
  ) {
    this.runtimeContext = new FlatTeamExecutionContext({
      configuredMemberActivationMode: "fresh",
      memberContexts: teamNode.children.filter((node) => node.kind === "agent").map((node) =>
        new FlatAgentExecutionContext({
          address: node.address,
          agentRunId: node.agentRunId,
          runtimeKind: node.runtimeKind,
          platformAgentRunId: node.platformAgentRunId,
        })),
    });
    this.context = new TeamRunContext({
      physicalScope,
      teamRunId: teamNode.teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      teamNode,
      handoffs: config.handoffs,
      runtimeContext: this.runtimeContext,
    });
  }

  get teamRunId(): string { return this.teamNode.teamRunId; }
  getRuntimeContext(): FlatTeamExecutionContext { return this.runtimeContext; }
  isActive(): boolean { return this.active; }
  isTerminated(): boolean { return !this.active; }
  getInputStateSnapshots() { return []; }
  getLeafAgentStatusSnapshots() { return []; }
  hasOpenExecutionWork(): boolean { return false; }
  async reserveDirectAgentInput(agentRunId: string): Promise<AgentRunInputReservationResult> {
    this.reservations.push(agentRunId);
    return { reserved: true, reservation: { agentRunId, cancel: vi.fn(), commit: vi.fn(() => ({ release: vi.fn() })) } };
  }
  async deliverToDirectAgent(agentRunId: string, message: AgentInputUserMessage): Promise<AgentOperationResult> {
    return this.executeDirectAgentCommand(agentRunId, { kind: "post_message", message });
  }
  async executeDirectAgentCommand(agentRunId: string, command: TeamMemberExecutionCommand): Promise<AgentOperationResult> {
    this.commands.push({ agentRunId, command });
    return { accepted: true };
  }
  beginTaskAgent(input: PrepareTaskAgentInput): TaskExecutionPreparationOperation {
    return createTaskExecutionPreparation({
      prepare: async assertAccepting => { assertAccepting(); return this.prepareAgent(input); },
      cancel: () => undefined,
      releaseResources: () => this.releaseDirectTaskExecution({ agentRunId: input.agentRunId }),
    });
  }
  private async prepareAgent(input: PrepareTaskAgentInput): Promise<PreparedTaskExecution> {
    this.preparedAgents.push(input);
    return new PreparedTask({
      binding: Object.freeze({ kind: "agent", address: input.address, agentRunId: input.agentRunId }),
      onCommit: () => this.liveTaskAgents.add(input.agentRunId),
    });
  }
  beginTaskTeam(input: PrepareTaskTeamInput): TaskExecutionPreparationOperation {
    return createTaskExecutionPreparation({
      prepare: async assertAccepting => { assertAccepting(); return this.prepareTeam(input); },
      cancel: () => undefined,
      releaseResources: () => this.releaseDirectTaskExecution({ teamRunId: input.teamRunId }),
    });
  }
  private async prepareTeam(input: PrepareTaskTeamInput): Promise<PreparedTaskExecution> {
    this.preparedTeams.push(input);
    const taskBackend = new TestTeamBackend(
      createChildPhysicalScope(this.physicalScope, input.teamNode.teamRunId),
      input.teamNode,
      this.config,
    );
    this.children.set(input.teamRunId, taskBackend);
    const coordinator = input.teamNode.children.find((node) =>
      node.kind === "agent" && node.address === input.teamNode.coordinatorAddress,
    );
    if (!coordinator || coordinator.kind !== "agent") throw new Error("Task Team coordinator was not materialized.");
    return new PreparedTask({
      binding: Object.freeze({
        kind: "team",
        address: input.address,
        teamRunId: input.teamRunId,
        coordinatorAgentRunId: coordinator.agentRunId,
      }),
      preparedTeamRuns: [new TeamRun(taskBackend.context, taskBackend)],
      onCommit: () => undefined,
    });
  }
  async restoreTaskAgent(input: RestoreTaskAgentInput): Promise<void> {
    this.restoredAgents.push(input);
    this.liveTaskAgents.add(input.agentRunId);
  }
  async restoreTaskTeam(_input: RestoreTaskTeamInput): Promise<TeamRun> {
    throw new Error("Task Team restore is outside this integration scenario.");
  }
  cancelDirectTaskExecution(_reference: TaskExecutionReference): void {}
  async releaseDirectTaskExecution(reference: TaskExecutionReference): Promise<AgentOperationResult> {
    if ("agentRunId" in reference) this.liveTaskAgents.delete(reference.agentRunId);
    else { await this.children.get(reference.teamRunId)?.terminate(); this.children.delete(reference.teamRunId); }
    return { accepted: true };
  }
  /** This double keeps no released authority: release already dropped it. */
  discardReleasedDirectTaskExecution(_reference: TaskExecutionReference): void {}
  cancelRuntimeActivation(): void {}
  releaseOwnedRuntime(): Promise<AgentOperationResult> { return this.terminate(); }
  hasLiveDirectTaskExecution(reference: TaskExecutionReference): boolean {
    return "agentRunId" in reference ? this.liveTaskAgents.has(reference.agentRunId) : this.children.has(reference.teamRunId);
  }
  async tryShutDownDirectTaskExecutionIfQuiet(reference: TaskExecutionReference): Promise<boolean> {
    if (!("agentRunId" in reference) || !this.liveTaskAgents.has(reference.agentRunId)) return false;
    if (this.backgroundBusyAgents.has(reference.agentRunId)) return false;
    this.liveTaskAgents.delete(reference.agentRunId);
    this.shutDownAgents.push(reference.agentRunId);
    return true;
  }
  async prepareTermination(): Promise<PreparedLocalExecutionTermination> {
    return Object.freeze({
      cancel: () => undefined,
      commit: () => Object.freeze({ finish: () => this.terminate() }),
    });
  }
  async tryPrepareTerminationIfQuiescent(): Promise<PreparedLocalExecutionTermination | null> {
    return this.prepareTermination();
  }
  freezeForRootTermination() {
    return Object.freeze({
      fenceAgentRunsForRootShutdown: async () => ({ accepted: true as const }),
      finish: () => this.terminate(),
    });
  }
  async terminate(): Promise<AgentOperationResult> { this.active = false; return { accepted: true }; }
}

const config = () => testTeamRunConfig({
  rootTeamRunId,
  rootTeamDefinitionId: "task-delegation-integration-team",
  coordinatorAddress: "/coordinator",
  children: [
    testAgentNode("/coordinator", { agentRunId: "run-coordinator", runtimeKind: RuntimeKind.CODEX_APP_SERVER }),
    testAgentNode("/worker", { agentRunId: "run-worker", runtimeKind: RuntimeKind.AUTOBYTEUS }),
    testAgentNode("/reviewer", { agentRunId: "run-reviewer", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK }),
  ],
});

const manualTimers = () => {
  const pending = new Map<number, () => void>();
  let next = 0;
  const timers: TaskExecutionIdleTimers = {
    setTimeout: (callback) => { const id = ++next; pending.set(id, callback); return id; },
    clearTimeout: (handle) => { pending.delete(handle as number); },
  };
  return { timers, pendingCount: () => pending.size, fireAll: () => { const due = [...pending.values()]; pending.clear(); due.forEach((fire) => fire()); } };
};

const createHarness = async (linked = false) => {
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-delegation-current-integration-"));
  tempDirs.push(memoryDir);
  const currentConfig = config();
  const tree = buildInitialTeamRunExecutionTree({ config: currentConfig, teamDefinitionName: "Task Integration Team" });
  const messages = Object.freeze({ schemaVersion: 1 as const, rootTeamRunId, messages: Object.freeze([]) });
  const rootDir = new AgentMemoryLayout(memoryDir).getTeamDirPath({ rootTeamRunId, ancestorTeamRunIds: [] });
  const treeStore = new TeamRunExecutionTreeStore();
  const communicationStore = new TeamCommunicationV1Store();
  await Promise.all([treeStore.write(rootDir, tree), communicationStore.write(rootDir, messages)]);
  const backend = new TestTeamBackend(
    createRootExecutionPhysicalScope({ root: createTeamRootExecutionIdentity(rootTeamRunId), ancestorTeamRunIds: [] }),
    currentConfig.rootTeam,
    currentConfig,
  );
  const publisher = new TeamRunEventPublisher<TeamRunEvent>();
  const clock = manualTimers();
  const inspect = vi.fn(() => ({ kind: "present" as const }));
  let allocatedTaskAgentOrdinal = 0;
  let root: RootTeamRun | null = null;
  const projectsLayout = new ProjectsLayout(path.join(memoryDir, "projects"));
  const projectStore = new ProjectStore(projectsLayout);
  const contextStore = new ProjectTaskContextStore(projectsLayout);
  const adHocTasks = new AdHocTaskStore(new AdHocTasksLayout(path.join(memoryDir, "ad-hoc-tasks")));
  const tasks = new ProjectTaskService({ store: projectStore, contextStore, adHocTasks,
    taskExecutionResources: new TaskExecutionResourceService(new TaskExecutionResourceStore(projectsLayout, adHocTasks.layout)),
    requestRelease: (identity, agentRuns) => {
      expect(identity).toEqual(createTeamRootExecutionIdentity(rootTeamRunId));
      return root!.releaseTaskExecutions(agentRuns);
    },
  });
  await tasks.load();
  const helper = new AgentDefinition({ id: "scope-helper", name: "Scope Helper", description: "Test helper", instructions: "Read work" });
  const helperTeam = new AgentTeamDefinition({ id: "scope-helpers", name: "Scope Helpers", description: "Test helper Team",
    instructions: "Read work", nodes: [new TeamMember({ memberName: "lead", ref: helper.id!, refScope: "shared" })], coordinatorMemberName: "lead", handoffs: [] });
  const helperAdmission = createCollaboratorAdmission({
    listAgentDefinitions: async () => [helper], listTeamDefinitions: async () => [helperTeam],
    getAgentDefinition: async id => id === helper.id ? helper : null,
    getTeamDefinition: async id => id === helperTeam.id ? helperTeam : null,
  }, { validate: vi.fn(), validateMany: async (inputs: readonly unknown[]) => inputs.map(() => ({ kind: "valid" as const, selection: { llmModelIdentifier: "test", llmConfig: null } })) } as RunModelSelectionValidator);
  const persistence = new TeamRunPersistenceCoordinator({
    rootTeamRunId,
    teamMemoryDir: rootDir,
    executionTreeStore: treeStore,
    communicationStore,
    enterPersistenceFailStop: () => root?.enterPersistenceFailStop(),
  });
  root = new RootTeamRun({
    taskExecutionIdentity: createTaskExecutionIdentityCapabilities({
      allocateForAgentDefinition: async (agentDefinitionId) => `task-${agentDefinitionId}-${++allocatedTaskAgentOrdinal}`,
    }),
    rootRun: new TeamRun(backend.context, backend),
    // Production always binds the Task side: every copy belongs to a Task (an ad-hoc one when unowned).
    taskExecutionResources: tasks,
    // Collaborators are covered by the Team-root collaborator unit test over the real flat manager.
    collaboratorHost: {
      prepareCollaboratorAgent: () => { throw new Error("No collaborators in this scenario."); },
      prepareCollaboratorTeam: () => { throw new Error("No collaborators in this scenario."); },
      requireCollaboratorTeam: () => { throw new Error("No collaborators in this scenario."); },
    },
    config: currentConfig,
    tree,
    messages,
    persistence,
    publisher,
    activityInspector: { inspect } as never,
    taskExecutionIdleShutdown: { gracePeriodMs: () => 600_000, timers: clock.timers },
    // Linked cases admit Task-owned helpers; unlinked cases have an empty catalog.
    collaboratorAdmission: linked ? helperAdmission : createCollaboratorAdmission({
      listAgentDefinitions: async () => [], listTeamDefinitions: async () => [],
      getAgentDefinition: async () => null, getTeamDefinition: async () => null,
    }, { validate: vi.fn(), validateMany: async () => [] } as never),
  });
  const commands: MemberTaskCommandCapability = Object.freeze({
    root: createTeamRootExecutionIdentity(rootTeamRunId),
    delegateToNewCopy: (caller, command) => root!.delegateToNewCopy({ identity: caller }, command),
    assignToExistingCopy: (caller, command) => root!.assignToExistingCopy({ identity: caller }, command),
  });
  const emitStatus = (memberAddress: string, agentRunId: string, status: "idle" | "running") => publisher.publish({
    eventSourceType: TeamRunEventSourceType.AGENT,
    execution: createTeamAgentExecutionBinding({ root: createTeamRootExecutionIdentity(rootTeamRunId), memberAddress: assertAgentTeamAddress(memberAddress), agentRunId }),
    payload: { eventType: "AGENT_STATUS", statusHint: deriveTeamAgentStatusHint(status), details: createTeamAgentStatusDetails({ status }) },
  } as TeamRunEvent);
  const emitBackgroundTask = (memberAddress: string, agentRunId: string, status: "running" | "completed") => publisher.publish({
    eventSourceType: TeamRunEventSourceType.AGENT,
    execution: createTeamAgentExecutionBinding({ root: createTeamRootExecutionIdentity(rootTeamRunId), memberAddress: assertAgentTeamAddress(memberAddress), agentRunId }),
    payload: { eventType: "BACKGROUND_TASK_UPDATED", statusHint: null, details: { taskId: "bg-monitor", kind: "shell",
      description: "Monitor the release run", command: "sleep 7200 && echo done", status,
      summary: status === "completed" ? "done" : null, startedAt: "2026-10-08T07:41:00.000Z" } },
  } as TeamRunEvent);
  const lifecycle = (root as unknown as { taskExecutions: { drain(): Promise<void> } }).taskExecutions;
  const drain = async () => {
    for (let i = 0; i < 3; i += 1) { await new Promise<void>((resolve) => setImmediate(resolve)); await lifecycle.drain(); }
  };
  return { memoryDir, rootDir, root, commands, service: new TaskDelegationToolService(), backend, clock, inspect, emitStatus, emitBackgroundTask, drain, publisher, treeStore,
    tasks, projectStore, projectsLayout, projects: new ProjectService({ store: projectStore }) };
};

afterEach(async () => {
  vi.clearAllMocks();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

const context = (
  commands: Awaited<ReturnType<typeof createHarness>>["commands"],
  memberAddress: string,
  agentRunId: string,
  rootId = rootTeamRunId,
) => Object.freeze({
  identity: createCollaborationMemberExecutionIdentity({ root: createTeamRootExecutionIdentity(rootId), memberAddress, agentRunId }),
  commands,
});

const delegate = async (
  service: TaskDelegationToolService,
  toolContext: ReturnType<typeof context>,
  raw: Record<string, unknown>,
) => {
  const entry = getTaskDelegationToolManifestEntry(DELEGATE_TASK_TOOL_NAME);
  return entry.execute(service, toolContext, entry.parseInput(raw) as never);
};

describe("current delegate_task lifecycle integration (pure spawn, idle shutdown, wake-on-message)", () => {
  // Real root address/lifetime admission and disk commits; provider resources are the local backend double.
  it.each(["/scope_helper", "/scope_helpers"])("keeps two Task address bring-ins independent at %s, reuses only their own helper and never adopts a borrowed member (AC-009/010/012/013)", async address => {
    const h = await createHarness(true);
    const manager = context(h.commands, "/coordinator", "run-coordinator");
    const projectId = (await h.projects.createProject({ name: "Task-owned helper admission" })).projectId;
    const a = await h.tasks.createTask({ projectId, description: "Task A saved instructions" });
    const b = await h.tasks.createTask({ projectId, description: "Task B saved instructions" });
    const dispatch = async (taskId: string) => {
      const result = await delegate(h.service, manager, { recipient_address: "/worker", task_id: taskId }) as { target_agent_run_id: string };
      expect(result.target_agent_run_id).toEqual(expect.any(String));
      return context(h.commands, "/worker", result.target_agent_run_id);
    };
    const message = (sender: ReturnType<typeof context>, recipientAddress: string) => h.root.deliverInterAgentMessage({
      rootTeamRunId, sender: buildDeliveryEndpointForParticipant({ kind: "agent", identity: sender.identity, displayName: "worker" }),
      recipientAddress, content: "Read these instructions; do not change business status.",
    });
    // The Task side alone records which agent runs belong to a Task (C-1/C-2).
    const resources = async (taskId: string) => (await fs.readFile(h.projectsLayout.taskExecutionResourcesFile(projectId, taskId), "utf8")
      .then(JSON.parse)).agentRunResources as Array<{ role: string; agentRun: { kind: string; agentRunId?: string; teamRunId?: string; coordinatorAgentRunId?: string }; closedAt: string | null; start: string }>;
    const ingressOf = (e: Awaited<ReturnType<typeof resources>>[number]) => e.agentRun.agentRunId ?? e.agentRun.coordinatorAgentRunId!;
    try {
      const workerA = await dispatch(a.taskId), secondA = await dispatch(a.taskId), workerB = await dispatch(b.taskId);
      expect(new Set([workerA, secondA, workerB].map(c => c.identity.agentRunId)).size).toBe(3);
      expect((await resources(a.taskId)).map(e => [e.role, e.start])).toEqual([["assigned", "started"], ["assigned", "started"]]);
      await expect(delegate(h.service, workerA, { recipient_address: address, task_id: b.taskId })).rejects.toMatchObject({ code: "TASK_AGENT_RESOURCE_OWNED_SENDER" });
      await expect(message(workerA, address)).resolves.toMatchObject({ accepted: true });
      await expect(message(workerB, address)).resolves.toMatchObject({ accepted: true });
      const helperA = (await resources(a.taskId)).find(e => e.role === "broughtIn")!;
      const helperB = (await resources(b.taskId)).find(e => e.role === "broughtIn")!;
      expect(helperA).toMatchObject({ start: "started", closedAt: null }); expect(helperB).toBeDefined();
      expect(helperA.agentRun).not.toEqual(helperB.agentRun);
      expect(ingressOf(helperA)).not.toBe(ingressOf(helperB));
      const beforeReuse = h.root.getExecutionTreeSnapshot();
      const resourcesBefore = [await resources(a.taskId), await resources(b.taskId)];
      await expect(message(secondA, address)).resolves.toMatchObject({ accepted: true });
      await expect(message(workerB, address)).resolves.toMatchObject({ accepted: true });
      expect(h.root.getExecutionTreeSnapshot()).toEqual(beforeReuse);
      const reservations = (backend: TestTeamBackend): string[] => [
        ...backend.reservations, ...[...backend.children.values()].flatMap(reservations),
      ];
      expect(reservations(h.backend).filter(id => id === ingressOf(helperA))).toHaveLength(2);
      expect(reservations(h.backend).filter(id => id === ingressOf(helperB))).toHaveLength(2);
      await expect(message(workerA, "/reviewer")).resolves.toMatchObject({ accepted: true });
      await expect(message(workerB, "/reviewer")).resolves.toMatchObject({ accepted: true });
      expect(h.backend.reservations.filter(id => id === "run-reviewer")).toHaveLength(2);
      expect(h.root.getExecutionTreeSnapshot()).toEqual(beforeReuse);
      expect([await resources(a.taskId), await resources(b.taskId)]).toEqual(resourcesBefore);
      // C-1: the execution tree carries no Task data at all.
      const treeText = await fs.readFile(getTeamRunExecutionTreePath(h.rootDir), "utf8");
      expect(treeText).not.toMatch(/taskLifetime|lifetime|taskId|agentRunResources/i);

      const stop = vi.spyOn(h.backend, "releaseDirectTaskExecution");
      await h.tasks.updateTask({ projectId, taskId: a.taskId, status: "DONE" }); await h.tasks.drainRuntimeReleases();
      const closedA = await resources(a.taskId);
      expect(closedA.every(e => e.closedAt !== null)).toBe(true);
      expect((await resources(b.taskId)).every(e => e.closedAt === null)).toBe(true);
      const exact = (e: { agentRun: { agentRunId?: string; teamRunId?: string } }) => JSON.stringify(e.agentRun.agentRunId ? { agentRunId: e.agentRun.agentRunId } : { teamRunId: e.agentRun.teamRunId });
      expect(new Set(stop.mock.calls.map(([ref]) => JSON.stringify(ref)))).toEqual(new Set(closedA.map(exact)));
      expect(h.backend.liveTaskAgents.has(workerB.identity.agentRunId)).toBe(true);
      expect(h.backend.isActive()).toBe(true);
      const prepared = h.backend.preparedAgents.length + h.backend.preparedTeams.length;
      // Repeated DONE re-invokes each run's exact committed-copy release (the registration's own release is
      // memoized after success, AR9-F02b) and starts nothing.
      const stops = stop.mock.calls.length;
      await h.tasks.updateTask({ projectId, taskId: a.taskId, status: "DONE" }); await h.tasks.drainRuntimeReleases();
      expect(new Set(stop.mock.calls.slice(stops).map(([ref]) => JSON.stringify(ref)))).toEqual(new Set(closedA.map(exact)));
      expect(stop.mock.calls.length - stops).toBe(closedA.length);
      await expect(message(workerA, address)).resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
      await expect(message(workerB, address)).resolves.toMatchObject({ accepted: true });
      expect(h.backend.preparedAgents.length + h.backend.preparedTeams.length).toBe(prepared);
      // Explicit Delete is not DONE: B's records stay, its open runtime keeps working.
      const treeBytes = await fs.readFile(getTeamRunExecutionTreePath(h.rootDir));
      const recordsB = await fs.readFile(h.projectsLayout.taskExecutionResourcesFile(projectId, b.taskId), "utf8");
      await h.tasks.deleteTask({ projectId, taskId: b.taskId });
      expect(await fs.readFile(getTeamRunExecutionTreePath(h.rootDir))).toEqual(treeBytes);
      expect(await fs.readFile(h.projectsLayout.taskExecutionResourcesFile(projectId, b.taskId), "utf8")).toBe(recordsB);
      await expect(h.tasks.updateTask({ projectId, taskId: b.taskId, status: "DONE" })).rejects.toMatchObject({ code: "TASK_NOT_FOUND" });
      await expect(message(workerB, address)).resolves.toMatchObject({ accepted: true });
      expect((await h.tasks.listTasks(projectId)).map(t => t.taskId)).toEqual([a.taskId]);
      expect(h.backend.preparedAgents.length + h.backend.preparedTeams.length).toBe(prepared);
    } finally { await h.tasks.drainRuntimeReleases(); await h.root.terminate(); }
  });

  it("spawns a fresh task Agent through the only public tool and persists the delegator in one tree write", async () => {
    const harness = await createHarness();
    const coordinator = context(harness.commands, "/coordinator", "run-coordinator");
    const created = await delegate(harness.service, coordinator, {
      recipient_address: "/worker",
      description: "Solve the assigned classroom exercise and return evidence.",
      reference_files: [],
    });
    expect(created).toEqual({ target_agent_run_id: expect.any(String), target_kind: "agent", task_id: expect.stringMatching(/^ad_hoc_task_/) });
    const taskAgentRunId = (created as { target_agent_run_id: string }).target_agent_run_id;
    expect(harness.backend.preparedAgents[0]).toMatchObject({
      address: "/worker",
      agentRunId: taskAgentRunId,
      message: expect.objectContaining({ content: expect.stringContaining("Task delegator AgentRun ID: run-coordinator") }),
    });
    expect(harness.root.getExecutionTreeSnapshot().rootTeam.taskExecutions).toEqual([expect.objectContaining({
      address: "/worker",
      agentRunId: taskAgentRunId,
      delegatorAgentRunId: "run-coordinator",
    })]);
    const persisted = JSON.parse(await fs.readFile(getTeamRunExecutionTreePath(harness.rootDir), "utf8"));
    expect(persisted).not.toHaveProperty("schemaVersion");
    expect(persisted.rootTeam.taskExecutions[0]).toMatchObject({ agentRunId: taskAgentRunId, delegatorAgentRunId: "run-coordinator" });
    expect(persisted.rootTeam.taskExecutions[0]).not.toHaveProperty("settledAt");
    expect(await fs.readdir(harness.rootDir)).not.toContain("task_delegation_records.json");
    expect(TASK_DELEGATION_TOOL_NAME_LIST).toEqual(["delegate_task"]);
  });

  it("shuts an idle delegated Agent down after the grace period and restores it when a message arrives", async () => {
    const harness = await createHarness();
    const coordinator = context(harness.commands, "/coordinator", "run-coordinator");
    const { target_agent_run_id: child } = await delegate(harness.service, coordinator, {
      recipient_address: "/worker", description: "Do the work.", reference_files: [],
    }) as { target_agent_run_id: string };
    await harness.drain();
    harness.emitStatus("/worker", child, "idle");
    expect(harness.clock.pendingCount()).toBe(1);
    harness.emitStatus("/worker", child, "running");
    expect(harness.clock.pendingCount()).toBe(0);
    harness.emitStatus("/worker", child, "idle");
    harness.clock.fireAll();
    await harness.drain();
    expect(harness.backend.shutDownAgents).toEqual([child]);
    expect(harness.root.getExecutionTreeSnapshot().rootTeam.taskExecutions.map((task) => "agentRunId" in task ? task.agentRunId : null)).toEqual([child]);
    expect(harness.root.hasAgentExecution(child)).toBe(true);

    const delivered = await harness.root.deliverExactAgentMessage({
      sender: { kind: "agent", identity: coordinator.identity, displayName: "coordinator" } as never,
      targetAgentRunId: child,
      content: "One follow-up question.",
    });
    expect(delivered).toMatchObject({ accepted: true });
    expect(harness.inspect).toHaveBeenCalledWith(expect.objectContaining({ agentRunId: child }));
    expect(harness.backend.restoredAgents).toEqual([expect.objectContaining({ address: "/worker", agentRunId: child })]);
    expect(harness.backend.reservations).toContain(child);
    await harness.drain();
    // Release after delivery re-arms the idle timer for the restored child.
    expect(harness.clock.pendingCount()).toBe(1);
  });

  it("keeps an idle delegated Agent with a running background task past the grace period; the task's end re-arms it (AC-001/004)", async () => {
    const harness = await createHarness();
    const coordinator = context(harness.commands, "/coordinator", "run-coordinator");
    const { target_agent_run_id: child } = await delegate(harness.service, coordinator, {
      recipient_address: "/worker", description: "Start the release monitor in the background and report when it ends.", reference_files: [],
    }) as { target_agent_run_id: string };
    await harness.drain();
    harness.backend.backgroundBusyAgents.add(child);
    harness.emitBackgroundTask("/worker", child, "running");
    harness.emitStatus("/worker", child, "idle");
    harness.clock.fireAll();
    await harness.drain();
    expect(harness.backend.shutDownAgents).toEqual([]);
    expect(harness.clock.pendingCount()).toBe(0);
    harness.emitBackgroundTask("/worker", child, "running");
    expect(harness.clock.pendingCount()).toBe(0);

    harness.backend.backgroundBusyAgents.delete(child);
    harness.emitBackgroundTask("/worker", child, "completed");
    expect(harness.clock.pendingCount()).toBe(1);
    harness.clock.fireAll();
    await harness.drain();
    expect(harness.backend.shutDownAgents).toEqual([child]);
  });

  it("rejects wake with TASK_EXECUTION_CONTEXT_UNAVAILABLE when the saved conversation is missing", async () => {
    const harness = await createHarness();
    const coordinator = context(harness.commands, "/coordinator", "run-coordinator");
    const { target_agent_run_id: child } = await delegate(harness.service, coordinator, {
      recipient_address: "/worker", description: "Do the work.", reference_files: [],
    }) as { target_agent_run_id: string };
    await harness.drain();
    harness.emitStatus("/worker", child, "idle");
    harness.clock.fireAll();
    await harness.drain();
    harness.inspect.mockReturnValue({ kind: "absent" } as never);

    await expect(harness.root.deliverExactAgentMessage({
      sender: { kind: "agent", identity: coordinator.identity, displayName: "coordinator" } as never,
      targetAgentRunId: child,
      content: "Anyone there?",
    })).resolves.toMatchObject({ accepted: false, code: "TASK_EXECUTION_CONTEXT_UNAVAILABLE" });
    expect(harness.backend.restoredAgents).toEqual([]);
  });

  it("keeps identical general and application identities bound to their own root capabilities", async () => {
    const general = await createHarness();
    const application = await createHarness();
    await delegate(application.service, context(application.commands, "/coordinator", "run-coordinator"), {
      recipient_address: "/worker", description: "Application-scoped task.", reference_files: [],
    });
    expect(application.root.getExecutionTreeSnapshot().rootTeam.taskExecutions).toHaveLength(1);
    expect(general.root.getExecutionTreeSnapshot().rootTeam.taskExecutions).toEqual([]);
    await delegate(general.service, context(general.commands, "/coordinator", "run-coordinator"), {
      recipient_address: "/worker", description: "General-scoped task.", reference_files: [],
    });
    expect(general.root.getExecutionTreeSnapshot().rootTeam.taskExecutions).toHaveLength(1);
    expect(application.root.getExecutionTreeSnapshot().rootTeam.taskExecutions).toHaveLength(1);
    expect(general.backend.preparedAgents).toHaveLength(1);
    expect(application.backend.preparedAgents).toHaveLength(1);
  });

  it("lets a fresh task Agent delegate a nested sibling and records it as the exact delegator", async () => {
    const harness = await createHarness();
    const parent = await delegate(harness.service, context(harness.commands, "/coordinator", "run-coordinator"), {
      recipient_address: "/worker", description: "Parent task", reference_files: [],
    }) as { target_agent_run_id: string };
    const child = await delegate(harness.service, context(harness.commands, "/worker", parent.target_agent_run_id), {
      recipient_address: "/reviewer", description: "Review the parent work", reference_files: [],
    }) as { target_agent_run_id: string };
    expect(harness.root.getExecutionTreeSnapshot().rootTeam.taskExecutions).toEqual([
      expect.objectContaining({ agentRunId: parent.target_agent_run_id, delegatorAgentRunId: "run-coordinator" }),
      expect.objectContaining({ agentRunId: child.target_agent_run_id, address: "/reviewer", delegatorAgentRunId: parent.target_agent_run_id }),
    ]);
  });

  it("fails closed for a retired configured-Team recipient in a flat Team root", async () => {
    const harness = await createHarness();
    // Neither mounted, a collaborator nor an available agent: nothing starts and the call returns the reason.
    await expect(delegate(harness.service, context(harness.commands, "/coordinator", "run-coordinator"), {
      recipient_address: "/design_team", description: "Coordinate a design exercise", reference_files: [],
    })).resolves.toEqual({
      target_agent_run_id: null,
      message: expect.stringContaining("is not a mounted Agent or Agent Team, a collaborator or an available agent"),
    });
    expect(harness.root.getExecutionTreeSnapshot().rootTeam.taskExecutions).toEqual([]);
  });

  it("rejects self, root, missing, noncanonical, traversal, foreign, and relative targets before mutation", async () => {
    const harness = await createHarness();
    const coordinator = context(harness.commands, "/coordinator", "run-coordinator");
    for (const recipient_address of ["/coordinator", "/", "worker", "./worker"]) {
      await expect(delegate(harness.service, coordinator, {
        recipient_address, description: "must reject", reference_files: [],
      })).rejects.toBeTruthy();
    }
    for (const recipient_address of ["/missing", "/worker/child"]) {
      await expect(delegate(harness.service, coordinator, {
        recipient_address, description: "must not start", reference_files: [],
      })).resolves.toMatchObject({ target_agent_run_id: null });
    }
    await expect(delegate(harness.service, context(harness.commands, "/coordinator", "run-coordinator", "foreign-root"), {
      recipient_address: "/worker", description: "foreign", reference_files: [],
    })).rejects.toMatchObject({ code: "COLLABORATION_CONTEXT_REQUIRED" });
    expect(harness.root.getExecutionTreeSnapshot().rootTeam.taskExecutions).toEqual([]);
    expect(harness.backend.preparedAgents).toEqual([]);
    expect(harness.backend.preparedTeams).toEqual([]);
  });

  it("validates absolute reference files before preparation and delivers the exact path in the work packet", async () => {
    const harness = await createHarness();
    const coordinator = context(harness.commands, "/coordinator", "run-coordinator");
    await expect(delegate(harness.service, coordinator, {
      recipient_address: "/worker", description: "Read the reference", reference_files: ["relative.txt"],
    })).rejects.toBeTruthy();
    expect(harness.backend.preparedAgents).toEqual([]);

    const referencePath = path.join(harness.memoryDir, "classroom-problem.txt");
    await fs.writeFile(referencePath, "classroom evidence", "utf8");
    await delegate(harness.service, coordinator, {
      recipient_address: "/worker", description: "Read the absolute reference", reference_files: [referencePath],
    });
    const message = harness.backend.preparedAgents[0]!.message;
    expect(message).toBeDefined();
    expect(message!.content).toContain(referencePath);
  });
});
