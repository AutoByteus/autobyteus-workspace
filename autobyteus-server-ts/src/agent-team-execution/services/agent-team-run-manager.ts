import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import { TeamRunStatePackageLoader } from "../../run-history/services/team-run-state-package-loader.js";
import { TeamCommunicationV1Store } from "../../services/team-communication/team-communication-v1-store.js";
import { AgentTeamTerminationError } from "../errors.js";
import { getMixedTeamRunBackendFactory, type MixedTeamRunBackendFactory } from "../backends/mixed/mixed-team-run-backend-factory.js";
import { RootTeamRun } from "../domain/root-team-run.js";
import { TeamRun } from "../domain/team-run.js";
import type { TeamRunConfig } from "../domain/team-run-config.js";
import type { TeamRunEvent } from "../domain/team-run-event.js";
import type { TeamRunLifecycleListener, TeamRunLifecycleSnapshot, TeamRunLifecycleUnsubscribe } from "../domain/team-run-lifecycle.js";
import { TeamRunEventPublisher, type RootEventListener } from "./team-run-event-publisher.js";
import { buildInitialTeamRunExecutionTree, buildTeamRunConfigFromExecutionTree } from "./team-run-execution-tree-builder.js";
import { TeamRunPersistenceCoordinator } from "./team-run-persistence-coordinator.js";
import { TaskDelegationRecordsV1Store } from "../task-delegation/records/task-delegation-records-v1-store.js";
import type { TaskDelegationRecordsSnapshot } from "../task-delegation/task-delegation-record-v1.js";
import type { TeamCommunicationMessagesSnapshot } from "../../services/team-communication/team-communication-v1-types.js";
import { TeamRunV1PackageCatalog } from "../../run-history/services/team-run-v1-package-catalog.js";

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

type AgentTeamRunManagerOptions = Readonly<{
  memoryDir?: string;
  mixedTeamRunBackendFactory?: MixedTeamRunBackendFactory;
  executionTreeStore?: TeamRunExecutionTreeStore;
  taskRecordsStore?: TaskDelegationRecordsV1Store;
  communicationStore?: TeamCommunicationV1Store;
}>;

/** Process-wide catalog and lifecycle owner for root executions only. */
export class AgentTeamRunManager {
  private static instance: AgentTeamRunManager | null = null;
  private readonly memoryLayout: AgentMemoryLayout;
  private readonly factory: MixedTeamRunBackendFactory;
  private readonly executionTreeStore: TeamRunExecutionTreeStore;
  private readonly taskRecordsStore: TaskDelegationRecordsV1Store;
  private readonly communicationStore: TeamCommunicationV1Store;
  private readonly packageCatalog: TeamRunV1PackageCatalog;
  private readonly activeRoots = new Map<string, RootTeamRun>();
  private readonly lifecycleListeners = new Map<string, Set<TeamRunLifecycleListener>>();

  static getInstance(options: AgentTeamRunManagerOptions = {}): AgentTeamRunManager {
    return AgentTeamRunManager.instance ??= new AgentTeamRunManager(options);
  }

  constructor(options: AgentTeamRunManagerOptions = {}) {
    const memoryDir = options.memoryDir ?? appConfigProvider.config.getMemoryDir();
    this.memoryLayout = new AgentMemoryLayout(memoryDir);
    this.packageCatalog = new TeamRunV1PackageCatalog(memoryDir);
    this.factory = options.mixedTeamRunBackendFactory ?? getMixedTeamRunBackendFactory();
    this.executionTreeStore = options.executionTreeStore ?? new TeamRunExecutionTreeStore();
    this.taskRecordsStore = options.taskRecordsStore ?? new TaskDelegationRecordsV1Store();
    this.communicationStore = options.communicationStore ?? new TeamCommunicationV1Store();
  }

  async createTeamRun(input: {
    config: TeamRunConfig;
    teamDefinitionName: string;
  }): Promise<RootTeamRun> {
    const rootTeamRunId = required(input.config.rootTeam.teamRunId, "rootTeamRunId");
    if (this.getTeamRun(rootTeamRunId)) throw new Error(`RootTeamRun '${rootTeamRunId}' is already active.`);
    const tree = buildInitialTeamRunExecutionTree({
      config: input.config,
      teamDefinitionName: required(input.teamDefinitionName, "teamDefinitionName"),
    });
    const tasks: TaskDelegationRecordsSnapshot = Object.freeze({
      schemaVersion: 1,
      rootTeamRunId,
      records: Object.freeze([]),
    });
    const messages: TeamCommunicationMessagesSnapshot = Object.freeze({
      schemaVersion: 1,
      rootTeamRunId,
      messages: Object.freeze([]),
    });
    const teamMemoryDir = this.teamMemoryDir(rootTeamRunId);
    await this.requireCommitted(this.executionTreeStore.write(teamMemoryDir, tree), "execution tree");
    await this.requireCommitted(this.taskRecordsStore.write(teamMemoryDir, tasks), "task records");
    await this.requireCommitted(this.communicationStore.write(teamMemoryDir, messages), "communication messages");
    this.packageCatalog.admit(rootTeamRunId);
    const root = await this.materializeRoot({ config: input.config, tree, tasks, messages, teamMemoryDir });
    this.register(root);
    return root;
  }

  async restoreTeamRun(rootTeamRunIdInput: string): Promise<RootTeamRun> {
    const rootTeamRunId = required(rootTeamRunIdInput, "rootTeamRunId");
    if (this.getTeamRun(rootTeamRunId)) throw new Error(`RootTeamRun '${rootTeamRunId}' is already active.`);
    if (this.packageCatalog.isInitialized() && !this.packageCatalog.isAdmitted(rootTeamRunId)) {
      throw new Error(`TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED: TeamRun '${rootTeamRunId}' is not an admitted V1 package.`);
    }
    const teamMemoryDir = this.teamMemoryDir(rootTeamRunId);
    const loaded = await new TeamRunStatePackageLoader({
      executionTreeStore: this.executionTreeStore,
      taskRecordsStore: this.taskRecordsStore,
      communicationStore: this.communicationStore,
    }).loadAndRepair({ teamMemoryDir, rootTeamRunId });
    if (!loaded.loaded) throw new Error(`${loaded.code}: ${loaded.message}`);
    const config = buildTeamRunConfigFromExecutionTree(loaded.state.executionTree);
    const root = await this.materializeRoot({
      config,
      tree: loaded.state.executionTree,
      tasks: loaded.state.taskRecords,
      messages: loaded.state.communicationMessages,
      teamMemoryDir,
    });
    this.register(root);
    return root;
  }

  getTeamRun(rootTeamRunIdInput: string): RootTeamRun | null {
    const rootTeamRunId = required(rootTeamRunIdInput, "rootTeamRunId");
    const root = this.activeRoots.get(rootTeamRunId) ?? null;
    if (!root?.isActive()) {
      if (root) this.unregister(rootTeamRunId, root);
      return null;
    }
    return root;
  }

  getActiveRun(rootTeamRunId: string): RootTeamRun | null { return this.getTeamRun(rootTeamRunId); }
  listActiveRuns(): string[] { return [...this.activeRoots.keys()].filter((id) => this.getTeamRun(id)); }

  getLifecycleSnapshot(rootTeamRunId: string): TeamRunLifecycleSnapshot {
    const teamRunId = required(rootTeamRunId, "rootTeamRunId");
    return { teamRunId, isActive: this.getTeamRun(teamRunId) !== null };
  }

  subscribeToLifecycle(rootTeamRunId: string, listener: TeamRunLifecycleListener): TeamRunLifecycleUnsubscribe {
    const teamRunId = required(rootTeamRunId, "rootTeamRunId");
    const listeners = this.lifecycleListeners.get(teamRunId) ?? new Set<TeamRunLifecycleListener>();
    listeners.add(listener);
    this.lifecycleListeners.set(teamRunId, listeners);
    return () => {
      listeners.delete(listener);
      if (!listeners.size) this.lifecycleListeners.delete(teamRunId);
    };
  }

  subscribeToEvents(rootTeamRunId: string, listener: RootEventListener<TeamRunEvent>): (() => void) | null {
    return this.getTeamRun(rootTeamRunId)?.subscribeToEvents(listener) ?? null;
  }

  async terminateTeamRun(rootTeamRunIdInput: string): Promise<boolean> {
    const rootTeamRunId = required(rootTeamRunIdInput, "rootTeamRunId");
    try {
      const root = this.getTeamRun(rootTeamRunId);
      if (!root) return false;
      const result = await root.terminate();
      if (!result.accepted) return false;
      return this.unregister(rootTeamRunId, root) || !this.activeRoots.has(rootTeamRunId);
    } catch (error) {
      throw new AgentTeamTerminationError(String(error));
    }
  }

  private async materializeRoot(input: {
    config: TeamRunConfig;
    tree: import("../domain/team-run-execution-tree.js").TeamRunExecutionTreeSnapshot;
    tasks: TaskDelegationRecordsSnapshot;
    messages: TeamCommunicationMessagesSnapshot;
    teamMemoryDir: string;
  }): Promise<RootTeamRun> {
    const publisher = new TeamRunEventPublisher<TeamRunEvent>();
    let root: RootTeamRun | null = null;
    const callbacks = {
      publish: (event: TeamRunEvent) => publisher.publish(event),
      deliverInterAgentMessage: (intent: import("../domain/inter-agent-message-delivery.js").InterAgentMessageDeliveryIntent) => {
        if (!root) return Promise.resolve({ accepted: false, code: "TEAM_ROOT_NOT_BOUND", message: "RootTeamRun construction is incomplete." });
        return root.deliverInterAgentMessage(intent);
      },
      acceptPlatformBinding: (binding: import("../domain/team-agent-platform-binding.js").TeamAgentPlatformBinding) => {
        if (!root) return Promise.reject(new Error("RootTeamRun construction is incomplete."));
        return root.adoptAgentPlatformBinding(binding);
      },
    };
    const backend = await this.factory.createBackend(input.config, input.tree.rootTeam.teamRunId, callbacks);
    const rootRun = new TeamRun(backend.getTeamRunContext(), backend);
    const persistence = new TeamRunPersistenceCoordinator({
      rootTeamRunId: input.tree.rootTeam.teamRunId,
      teamMemoryDir: input.teamMemoryDir,
      executionTreeStore: this.executionTreeStore,
      taskRecordsStore: this.taskRecordsStore,
      communicationStore: this.communicationStore,
      enterPersistenceFailStop: () => root?.enterPersistenceFailStop(),
    });
    root = new RootTeamRun({
      rootRun,
      config: input.config,
      tree: input.tree,
      tasks: input.tasks,
      messages: input.messages,
      persistence,
      publisher,
      onTerminated: () => {
        if (root) this.unregister(input.tree.rootTeam.teamRunId, root);
      },
    });
    return root;
  }

  private register(root: RootTeamRun): void {
    if (!root.isActive() || this.activeRoots.has(root.teamRunId)) {
      throw new Error(`Cannot register RootTeamRun '${root.teamRunId}'.`);
    }
    this.activeRoots.set(root.teamRunId, root);
    this.notify({ teamRunId: root.teamRunId, isActive: true });
  }

  private unregister(rootTeamRunId: string, expected: RootTeamRun): boolean {
    if (this.activeRoots.get(rootTeamRunId) !== expected) return false;
    this.activeRoots.delete(rootTeamRunId);
    this.notify({ teamRunId: rootTeamRunId, isActive: false });
    return true;
  }

  private notify(snapshot: TeamRunLifecycleSnapshot): void {
    for (const listener of [...(this.lifecycleListeners.get(snapshot.teamRunId) ?? [])]) {
      try { listener(snapshot); } catch (error) { console.error("RootTeamRun lifecycle listener failed:", error); }
    }
  }

  private teamMemoryDir(rootTeamRunId: string): string {
    return this.memoryLayout.getTeamDirPath({ rootTeamRunId, ancestorTeamRunIds: [] });
  }

  private async requireCommitted(
    write: Promise<import("../../run-history/store/team-run-file-commit-writer.js").TeamRunFileWriteResult>,
    label: string,
  ): Promise<void> {
    const result = await write;
    if (result.outcome === "committed") return;
    throw new Error(`Initial TeamRun ${label} did not commit (${result.outcome}).`);
  }
}

export const getAgentTeamRunManager = (): AgentTeamRunManager => AgentTeamRunManager.getInstance();
