import { isDeepStrictEqual } from "node:util";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import { TeamRunStatePackageLoader } from "../../run-history/services/team-run-state-package-loader.js";
import { TeamCommunicationV1Store } from "../../services/team-communication/team-communication-v1-store.js";
import { AgentTeamTerminationError } from "../errors.js";
import { FlatTeamExecutionFactory } from "../local/flat-team-execution-factory.js";
import { MemberExecutionContextBuilder } from "./member-team-context-builder.js";
import { RootTeamRun } from "../domain/root-team-run.js";
import type { TeamRunConfig } from "../domain/team-run-config.js";
import type { TeamRunEvent } from "../domain/team-run-event.js";
import type { TeamRunLifecycleListener, TeamRunLifecycleSnapshot, TeamRunLifecycleUnsubscribe } from "../domain/team-run-lifecycle.js";
import type { RootEventListener } from "./team-run-event-publisher.js";
import { buildInitialTeamRunExecutionTree, buildTeamRunConfigFromExecutionTree } from "./team-run-execution-tree-builder.js";
import { TaskDelegationRecordsV1Store } from "../task-delegation/records/task-delegation-records-v1-store.js";
import type { TaskDelegationRecordsSnapshot } from "../task-delegation/task-delegation-record-v1.js";
import type { TeamCommunicationMessagesSnapshot } from "../../services/team-communication/team-communication-v1-types.js";
import { TeamRunPackageCatalog } from "../../run-history/services/team-run-package-catalog.js";
import type { RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import {
  runModelConfigEditability,
  type RunModelConfigUpdateResult,
} from "../../run-history/domain/run-model-config.js";
import {
  applyTeamRunModelConfigPatches,
  resolveTeamRunModelConfigTargets,
  type TeamRunModelConfigPatch,
} from "./team-run-model-config-mutator.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import { createTeamRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import {
  ActiveCollaborationRootDirectory,
  getActiveCollaborationRootDirectory,
} from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { TaskExecutionIdentityCapabilities } from "../task-delegation/task-execution-identity-capabilities.js";
import { materializeTeamRoot } from "./team-root-materializer.js";

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

export type AgentTeamRunManagerOptions = Readonly<{
  memoryDir: string;
  flatTeamExecutionFactory: FlatTeamExecutionFactory;
  memberExecutionContextBuilder: MemberExecutionContextBuilder;
  taskExecutionIdentity: TaskExecutionIdentityCapabilities;
  executionTreeStore?: TeamRunExecutionTreeStore;
  taskRecordsStore?: TaskDelegationRecordsV1Store;
  communicationStore?: TeamCommunicationV1Store;
  activeRootDirectory?: ActiveCollaborationRootDirectory;
  modelSelectionValidator: RunModelSelectionValidator;
}>;

/** Process-wide catalog and lifecycle owner for root executions only. */
export class AgentTeamRunManager {
  private static instance: AgentTeamRunManager | null = null;
  private readonly memoryLayout: AgentMemoryLayout;
  private readonly factory: FlatTeamExecutionFactory;
  private readonly memberExecutionContextBuilder: MemberExecutionContextBuilder;
  private readonly executionTreeStore: TeamRunExecutionTreeStore;
  private readonly taskRecordsStore: TaskDelegationRecordsV1Store;
  private readonly communicationStore: TeamCommunicationV1Store;
  private readonly packageCatalog: TeamRunPackageCatalog;
  private readonly taskExecutionIdentity: TaskExecutionIdentityCapabilities;
  private readonly modelSelectionValidator: RunModelSelectionValidator;
  private readonly activeRootDirectory: ActiveCollaborationRootDirectory;
  private readonly managedRoots = new Map<string, RootTeamRun>();
  private readonly rootTransitionLanes = new Map<string, Promise<void>>();
  private readonly lifecycleListeners = new Map<string, Set<TeamRunLifecycleListener>>();
  private rootAdmissionOpen = true;

  static getInstance(): AgentTeamRunManager {
    if (!AgentTeamRunManager.instance) {
      throw new Error("The process AgentTeamRunManager is not initialized.");
    }
    return AgentTeamRunManager.instance;
  }

  static initializeProcessInstance(options: AgentTeamRunManagerOptions): AgentTeamRunManager {
    if (AgentTeamRunManager.instance) {
      throw new Error("The process AgentTeamRunManager is already initialized.");
    }
    AgentTeamRunManager.instance = new AgentTeamRunManager(options);
    return AgentTeamRunManager.instance;
  }

  static releaseProcessInstance(instance: AgentTeamRunManager): void {
    if (AgentTeamRunManager.instance === instance) AgentTeamRunManager.instance = null;
  }

  constructor(options: AgentTeamRunManagerOptions) {
    if (!options?.flatTeamExecutionFactory) {
      throw new Error("flatTeamExecutionFactory is required.");
    }
    if (!options.memberExecutionContextBuilder) {
      throw new Error("memberExecutionContextBuilder is required.");
    }
    if (!options.taskExecutionIdentity ||
        typeof options.taskExecutionIdentity.agentRuns?.allocateForAgentDefinition !== "function" ||
        typeof options.taskExecutionIdentity.taskTeams?.create !== "function") {
      throw new Error("taskExecutionIdentity is required.");
    }
    if (!options.modelSelectionValidator ||
        typeof options.modelSelectionValidator.validate !== "function") {
      throw new Error("modelSelectionValidator is required.");
    }
    const memoryDir = required(options.memoryDir, "memoryDir");
    this.memoryLayout = new AgentMemoryLayout(memoryDir);
    this.packageCatalog = new TeamRunPackageCatalog(memoryDir);
    this.factory = options.flatTeamExecutionFactory;
    this.memberExecutionContextBuilder = options.memberExecutionContextBuilder;
    this.taskExecutionIdentity = options.taskExecutionIdentity;
    this.executionTreeStore = options.executionTreeStore ?? new TeamRunExecutionTreeStore();
    this.taskRecordsStore = options.taskRecordsStore ?? new TaskDelegationRecordsV1Store();
    this.communicationStore = options.communicationStore ?? new TeamCommunicationV1Store();
    this.modelSelectionValidator = options.modelSelectionValidator;
    this.activeRootDirectory = options.activeRootDirectory ?? getActiveCollaborationRootDirectory();
  }

  async createTeamRun(input: {
    config: TeamRunConfig;
    teamDefinitionName: string;
  }): Promise<RootTeamRun> {
    this.assertRootAdmissionOpen();
    const rootTeamRunId = required(input.config.rootTeam.teamRunId, "rootTeamRunId");
    return this.withRootTransition(rootTeamRunId, async () => {
      if (this.hasManagedTeamRun(rootTeamRunId)) throw new Error(`RootTeamRun '${rootTeamRunId}' is already managed.`);
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
      const root = await materializeTeamRoot({
        config: input.config,
        tree,
        tasks,
        messages,
        teamMemoryDir,
        mode: "fresh",
        persistInitialPackage: true,
        ...this.materializationDependencies(),
        onTerminated: (terminated) => { this.unregister(rootTeamRunId, terminated); },
      });
      this.packageCatalog.admit(rootTeamRunId);
      this.register(root);
      return root;
    });
  }

  async restoreTeamRun(rootTeamRunIdInput: string): Promise<RootTeamRun> {
    this.assertRootAdmissionOpen();
    const rootTeamRunId = required(rootTeamRunIdInput, "rootTeamRunId");
    return this.withRootTransition(rootTeamRunId, async () => {
      if (this.hasManagedTeamRun(rootTeamRunId)) throw new Error(`RootTeamRun '${rootTeamRunId}' is already managed.`);
      if (this.packageCatalog.isInitialized() && !this.packageCatalog.isAdmitted(rootTeamRunId)) {
        throw new Error(`TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED: TeamRun '${rootTeamRunId}' is not an admitted current package.`);
      }
      const teamMemoryDir = this.teamMemoryDir(rootTeamRunId);
      const loaded = await new TeamRunStatePackageLoader({
        executionTreeStore: this.executionTreeStore,
        taskRecordsStore: this.taskRecordsStore,
        communicationStore: this.communicationStore,
      }).loadAndRepair({ teamMemoryDir, rootTeamRunId });
      if (!loaded.loaded) throw new Error(`${loaded.code}: ${loaded.message}`);
      const config = buildTeamRunConfigFromExecutionTree(loaded.state.executionTree);
      const root = await materializeTeamRoot({
        config,
        tree: loaded.state.executionTree,
        tasks: loaded.state.taskRecords,
        messages: loaded.state.communicationMessages,
        teamMemoryDir,
        mode: "restore",
        persistInitialPackage: false,
        ...this.materializationDependencies(),
        onTerminated: (terminated) => { this.unregister(rootTeamRunId, terminated); },
      });
      this.register(root);
      return root;
    });
  }

  closeRootAdmission(): void { this.rootAdmissionOpen = false; }

  private assertRootAdmissionOpen(): void {
    if (!this.rootAdmissionOpen) {
      throw new Error("AgentTeam root admission is closed for process shutdown.");
    }
  }

  getActiveTeamRun(rootTeamRunIdInput: string): RootTeamRun | null {
    const rootTeamRunId = required(rootTeamRunIdInput, "rootTeamRunId");
    const root = this.managedRoots.get(rootTeamRunId) ?? null;
    return root?.isActive() ? root : null;
  }

  getManagedTeamRun(rootTeamRunIdInput: string): RootTeamRun | null {
    return this.managedRoots.get(required(rootTeamRunIdInput, "rootTeamRunId")) ?? null;
  }

  hasManagedTeamRun(rootTeamRunIdInput: string): boolean {
    return this.getManagedTeamRun(rootTeamRunIdInput) !== null;
  }

  listActiveTeamRunIds(): string[] {
    return [...this.managedRoots.keys()].filter((id) => this.getActiveTeamRun(id));
  }

  listManagedTeamRunIds(): string[] { return [...this.managedRoots.keys()]; }

  async withUnmanagedHistoryDeletion<T>(
    rootTeamRunIdInput: string,
    operation: () => Promise<T>,
  ): Promise<{ kind: "managed" } | { kind: "completed"; value: T }> {
    const rootTeamRunId = required(rootTeamRunIdInput, "rootTeamRunId");
    return this.withRootTransition(rootTeamRunId, async () => {
      if (this.hasManagedTeamRun(rootTeamRunId)) return { kind: "managed" };
      return { kind: "completed", value: await operation() };
    });
  }

  async updateStoppedModelConfigs(input: {
    teamRunId: string;
    patches: readonly TeamRunModelConfigPatch[];
  }): Promise<RunModelConfigUpdateResult<TeamRunExecutionTreeSnapshot | null>> {
    const teamRunId = required(input.teamRunId, "teamRunId");
    return this.withRootTransition(teamRunId, async () => {
      const tree = await this.executionTreeStore.read(this.teamMemoryDir(teamRunId), teamRunId);
      if (!tree) return this.modelConfigUpdateResult("NOT_FOUND", "Team run was not found.", null, false);
      if (this.packageCatalog.isInitialized() && !this.packageCatalog.isAdmitted(teamRunId)) {
        return this.modelConfigUpdateResult("NOT_FOUND", "Team run is not an admitted current package.", tree, false);
      }
      if (this.hasManagedTeamRun(teamRunId)) {
        return this.modelConfigUpdateResult(
          "RUN_ACTIVE",
          "This team became active through another connected workflow. Stop it, reopen Settings, and try again.",
          tree,
          true,
        );
      }
      if (tree.archivedAt) {
        return this.modelConfigUpdateResult("RUN_ARCHIVED", "Archived Team runs cannot be edited.", tree, false, true);
      }
      let targets;
      try {
        targets = resolveTeamRunModelConfigTargets(tree, input.patches);
      } catch (error) {
        return this.modelConfigUpdateResult(
          "VALIDATION_FAILED",
          "Team model-setting targets are invalid.",
          tree,
          false,
          false,
          [{ path: "patches", message: error instanceof Error ? error.message : String(error) }],
        );
      }
      const results = await this.modelSelectionValidator.validateMany(targets.map((target) => ({
        context: { runtimeKind: target.launchConfiguration.runtimeKind,
          currentModelIdentifier: target.launchConfiguration.llmModelIdentifier,
          workspaceRootPath: target.launchConfiguration.workspaceRootPath ?? process.cwd() },
        selection: target.patch,
      })));
      const validations = targets.map((target, index) => ({ target, result: results[index]! }));
      const unavailable = validations.find(({ result }) =>
        result.kind === "model_unavailable" || result.kind === "schema_unavailable");
      if (unavailable) {
        const outcome = unavailable.result.kind === "model_unavailable" ? "MODEL_UNAVAILABLE" : "SCHEMA_UNAVAILABLE";
        return this.modelConfigUpdateResult(
          outcome,
          `Current model options for '${unavailable.target.patch.scopeAddress}' are unavailable; saved settings were not changed.`,
          tree,
          false,
        );
      }
      const invalid = validations.filter((entry) => entry.result.kind === "invalid");
      if (invalid.length) {
        return this.modelConfigUpdateResult(
          "VALIDATION_FAILED",
          "One or more Team model settings are invalid.",
          tree,
          false,
          false,
          invalid.flatMap(({ target, result }) => result.kind === "invalid"
            ? result.errors.map((error) => ({
                path: `patches[${target.patch.scopeAddress}].${error.path}`,
                message: error.message,
              }))
            : []),
        );
      }
      const normalizedTargets = targets.map((target, index) => ({
        ...target,
        patch: {
          ...target.patch,
          ...(validations[index]!.result.kind === "valid"
            ? validations[index]!.result.selection : target.patch),
        },
      }));
      const nextTree = applyTeamRunModelConfigPatches(tree, normalizedTargets);
      if (isDeepStrictEqual(nextTree, tree)) {
        return this.modelConfigUpdateResult("UNCHANGED", "Team model settings are already up to date.", tree, false);
      }
      const write = await this.executionTreeStore.write(this.teamMemoryDir(teamRunId), nextTree);
      // Once renamed, unreadable canonical state requires verification, not an ordinary failure.
      const canonical = await this.executionTreeStore.read(this.teamMemoryDir(teamRunId), teamRunId).catch(() => null);
      if (write.outcome === "renamed_finalization_indeterminate" ||
          (write.outcome === "committed" && !canonical)) {
        return this.modelConfigUpdateResult(
          "PERSISTENCE_INDETERMINATE",
          "Update outcome is being verified. Refresh the Team configuration before saving again.",
          canonical ?? tree,
          false,
        );
      }
      if (write.outcome !== "committed" || !canonical || !isDeepStrictEqual(canonical, nextTree)) {
        return this.modelConfigUpdateResult("PERSISTENCE_FAILED", "Team model settings were not saved.", canonical ?? tree, false);
      }
      return this.modelConfigUpdateResult(
        "UPDATED",
        "Team model settings updated. They will be used when this team resumes.",
        canonical,
        false,
      );
    });
  }

  getLifecycleSnapshot(rootTeamRunId: string): TeamRunLifecycleSnapshot {
    const teamRunId = required(rootTeamRunId, "rootTeamRunId");
    return { teamRunId, isActive: this.hasManagedTeamRun(teamRunId) };
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
    return this.getManagedTeamRun(rootTeamRunId)?.subscribeToEvents(listener) ?? null;
  }

  async terminateTeamRun(rootTeamRunIdInput: string): Promise<boolean> {
    const rootTeamRunId = required(rootTeamRunIdInput, "rootTeamRunId");
    try {
      const root = this.getManagedTeamRun(rootTeamRunId);
      if (!root) return false;
      const result = await root.terminate();
      if (!result.accepted) return false;
      return this.unregister(rootTeamRunId, root) || !this.managedRoots.has(rootTeamRunId);
    } catch (error) {
      throw new AgentTeamTerminationError(String(error));
    }
  }

  async stopAllTeamRuns(): Promise<void> {
    const errors: unknown[] = [];
    for (const teamRunId of this.listManagedTeamRunIds()) {
      try {
        const stopped = await this.terminateTeamRun(teamRunId);
        if (!stopped && this.hasManagedTeamRun(teamRunId)) {
          errors.push(new Error(`Team run '${teamRunId}' did not accept termination.`));
        }
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, "Failed to stop all team runs.");
    }
  }

  private materializationDependencies() {
    return {
      factory: this.factory,
      memberExecutionContextBuilder: this.memberExecutionContextBuilder,
      taskExecutionIdentity: this.taskExecutionIdentity,
      executionTreeStore: this.executionTreeStore,
      taskRecordsStore: this.taskRecordsStore,
      communicationStore: this.communicationStore,
    } as const;
  }

  private modelConfigUpdateResult(
    outcome: RunModelConfigUpdateResult<TeamRunExecutionTreeSnapshot | null>["outcome"],
    message: string,
    tree: TeamRunExecutionTreeSnapshot | null,
    isActive: boolean,
    archived = false,
    fieldErrors: RunModelConfigUpdateResult<TeamRunExecutionTreeSnapshot | null>["fieldErrors"] = [],
  ): RunModelConfigUpdateResult<TeamRunExecutionTreeSnapshot | null> {
    return Object.freeze({
      success: outcome === "UPDATED" || outcome === "UNCHANGED",
      outcome,
      message,
      isActive,
      editability: runModelConfigEditability({
        isActive,
        archived,
        available: outcome !== "NOT_FOUND",
      }),
      canonical: tree,
      fieldErrors: Object.freeze([...fieldErrors]),
    });
  }

  private register(root: RootTeamRun): void {
    if (!root.isActive() || this.managedRoots.has(root.teamRunId)) {
      throw new Error(`Cannot register RootTeamRun '${root.teamRunId}'.`);
    }
    const identity = createTeamRootExecutionIdentity(root.teamRunId);
    const reservation = this.activeRootDirectory.reserve(identity, root);
    try {
      this.managedRoots.set(root.teamRunId, root);
      reservation.commit();
    } catch (error) {
      this.managedRoots.delete(root.teamRunId);
      reservation.release();
      throw error;
    }
    this.notify({ teamRunId: root.teamRunId, isActive: true });
  }

  private unregister(rootTeamRunId: string, expected: RootTeamRun): boolean {
    if (this.managedRoots.get(rootTeamRunId) !== expected) return false;
    this.managedRoots.delete(rootTeamRunId);
    this.activeRootDirectory.unregister(createTeamRootExecutionIdentity(rootTeamRunId), expected);
    this.notify({ teamRunId: rootTeamRunId, isActive: false });
    return true;
  }

  private notify(snapshot: TeamRunLifecycleSnapshot): void {
    for (const listener of [...(this.lifecycleListeners.get(snapshot.teamRunId) ?? [])]) {
      try { listener(snapshot); } catch (error) { console.error("RootTeamRun lifecycle listener failed:", error); }
    }
  }

  private async withRootTransition<T>(rootTeamRunId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.rootTransitionLanes.get(rootTeamRunId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    const tail = previous.then(() => current);
    this.rootTransitionLanes.set(rootTeamRunId, tail);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.rootTransitionLanes.get(rootTeamRunId) === tail) this.rootTransitionLanes.delete(rootTeamRunId);
    }
  }

  private teamMemoryDir(rootTeamRunId: string): string {
    return this.memoryLayout.getTeamDirPath({ rootTeamRunId, ancestorTeamRunIds: [] });
  }

}

export const getAgentTeamRunManager = (): AgentTeamRunManager => AgentTeamRunManager.getInstance();
