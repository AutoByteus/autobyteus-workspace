import type { RunViewStreams } from "../../agent-collaboration/delegation/run-view-stream.js";
import type { ReceivedFilesPlacement } from "../../agent-collaboration/execution/remote/transferred-files.js";
import type { RemoteRunChannelAccess } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import { recordRunProjectStart } from "../../agent-execution/domain/run-project-context.js";
import { isDeepStrictEqual } from "node:util";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import { TeamRunStatePackageLoader } from "../../run-history/services/team-run-state-package-loader.js";
import { TeamCommunicationStore } from "../../services/team-communication/team-communication-store.js";
import { AgentTeamTerminationError } from "../errors.js";
import { FlatTeamExecutionFactory } from "../local/flat-team-execution-factory.js";
import { MemberExecutionContextBuilder } from "./member-team-context-builder.js";
import { RootTeamRun } from "../domain/root-team-run.js";
import type { TeamRunConfig } from "../domain/team-run-config.js";
import type { TeamRunEvent } from "../domain/team-run-event.js";
import type { TeamRunEnding, TeamRunLifecycleListener, TeamRunLifecycleSnapshot, TeamRunLifecycleUnsubscribe } from "../domain/team-run-lifecycle.js";
import type { RootEventListener } from "./team-run-event-publisher.js";
import { buildInitialTeamRunExecutionTree, buildTeamRunConfigFromExecutionTree } from "./team-run-execution-tree-builder.js";
import type { TeamCommunicationMessagesSnapshot } from "../../services/team-communication/team-communication-messages-file.js";
import { TeamRunPackageCatalog } from "../../run-history/services/team-run-package-catalog.js";
import type { RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import type { RunModelConfigUpdateResult } from "../../run-history/domain/run-model-config.js";
import { teamModelConfigUpdateResult } from "./team-model-config-update-result.js";
import type { TeamMembershipPlanner } from "../membership/team-membership-planner.js";
import { followLiveTeamRun } from "../membership/team-definition-change-listener.js";
import type { TeamChangeNoticeSource } from "../membership/team-change-notice-source.js";
import type { TeamRunSelectionPatch } from "./team-run-selection-mutator.js";
import type { TeamRunCopiedFrom, TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import { createTeamRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import {
  ActiveCollaborationRootDirectory,
  getActiveCollaborationRootDirectory,
} from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { materializeTeamRoot } from "./team-root-materializer.js";
import { AgentRunMemoryLocator } from "../../agent-collaboration/execution/services/agent-run-memory-locator.js";
import type { RunTaskRecords } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import { planStoppedTeamLaunchSave } from "./team-run-delegated-launch-plan.js";
import { storedRemoteLinkCheck, type RemoteInboundQuery, type StoredRemoteLinkCheck } from "../../agent-collaboration/execution/remote/remote-run-links.js";
import { teamRunRemoteLinks } from "../domain/team-run-remote-links.js";
import type { DelegatedFrom } from "../../run-history/store/agent-run-metadata-types.js";

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

export type AgentTeamRunManagerOptions = Readonly<{
  memoryDir: string;
  flatTeamExecutionFactory: FlatTeamExecutionFactory;
  memberExecutionContextBuilder: MemberExecutionContextBuilder;
  taskRecords: RunTaskRecords;
  /** The relationships between runs, from the Task entries (SR-047). */
  delegationIndex: DelegationIndex;
  /** The host's channel to peer nodes (autobyteus-500 FU-011). */
  remoteChannel: RemoteRunChannelAccess;
  /** The host's file transfer between nodes, for its Team roots (autobyteus-587). */
  /** autobyteus-587: the node's received files, placed for its Team roots' members. */
  receivedFiles: ReceivedFilesPlacement;
  /** Each run's view stream (SR-062). */
  viewStreams: RunViewStreams;
  executionTreeStore?: TeamRunExecutionTreeStore;
  communicationStore?: TeamCommunicationStore;
  activeRootDirectory?: ActiveCollaborationRootDirectory;
  modelSelectionValidator: RunModelSelectionValidator;
  /** Which runs follow their Team definition, and how (a stopped run is followed before it is restored, DS-002). */
  membershipPlanner: Pick<TeamMembershipPlanner, "viewFor" | "followStored">;
  /** Where the members' notices of a membership change wait (DS-006). */
  changeNotices: TeamChangeNoticeSource;
}>;

/** Process-wide catalog and lifecycle owner for root executions only. */
export class AgentTeamRunManager {
  private static instance: AgentTeamRunManager | null = null;
  private readonly memoryLayout: AgentMemoryLayout;
  private readonly factory: FlatTeamExecutionFactory;
  private readonly memberExecutionContextBuilder: MemberExecutionContextBuilder;
  private readonly executionTreeStore: TeamRunExecutionTreeStore;
  private readonly communicationStore: TeamCommunicationStore;
  private readonly packageCatalog: TeamRunPackageCatalog;
  private readonly taskRecords: RunTaskRecords;
  private readonly delegationIndex: DelegationIndex;
  private readonly remoteChannel: RemoteRunChannelAccess;
  private readonly receivedFiles: ReceivedFilesPlacement;
  private readonly viewStreams: RunViewStreams;
  private readonly modelSelectionValidator: RunModelSelectionValidator;
  private readonly activeRootDirectory: ActiveCollaborationRootDirectory;
  private readonly membershipPlanner: Pick<TeamMembershipPlanner, "viewFor" | "followStored">;
  private readonly changeNotices: TeamChangeNoticeSource;
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
    if (!options.modelSelectionValidator ||
        typeof options.modelSelectionValidator.validate !== "function") {
      throw new Error("modelSelectionValidator is required.");
    }
    const memoryDir = required(options.memoryDir, "memoryDir");
    this.memoryLayout = new AgentMemoryLayout(memoryDir);
    this.packageCatalog = new TeamRunPackageCatalog(memoryDir);
    this.factory = options.flatTeamExecutionFactory;
    this.memberExecutionContextBuilder = options.memberExecutionContextBuilder;
    this.taskRecords = options.taskRecords;
    this.delegationIndex = options.delegationIndex;
    this.remoteChannel = options.remoteChannel;
    this.receivedFiles = options.receivedFiles;
    this.viewStreams = options.viewStreams;
    this.executionTreeStore = options.executionTreeStore ?? new TeamRunExecutionTreeStore();
    this.communicationStore = options.communicationStore ?? new TeamCommunicationStore();
    this.modelSelectionValidator = options.modelSelectionValidator;
    this.activeRootDirectory = options.activeRootDirectory ?? getActiveCollaborationRootDirectory();
    this.membershipPlanner = options.membershipPlanner;
    this.changeNotices = options.changeNotices;
  }

  async createTeamRun(input: {
    config: TeamRunConfig;
    teamDefinitionName: string;
    /** A Team run a peer node starts (autobyteus-247): its back-link, kept on the tree. */
    delegatedFrom?: DelegatedFrom;
    /** A delegated Team run's origin (D-SCOPE): only a copy of a Team definition follows that definition. */
    copiedFrom?: TeamRunCopiedFrom;
    containedIn?: TeamRunExecutionTreeSnapshot["containedIn"]; // A Team mounted in an Org: its container back-link, kept on the tree.
    /** The Project the Team run is started under: recorded by the Project before the tree is written (DS-002). */
    projectId?: string;
  }): Promise<RootTeamRun> {
    this.assertRootAdmissionOpen();
    const rootTeamRunId = required(input.config.rootTeam.teamRunId, "rootTeamRunId");
    return this.withRootTransition(rootTeamRunId, async () => {
      if (this.hasManagedTeamRun(rootTeamRunId)) throw new Error(`RootTeamRun '${rootTeamRunId}' is already managed.`);
      if (input.projectId) await recordRunProjectStart(input.projectId, { kind: "agent_team", runId: rootTeamRunId });
      const initial = buildInitialTeamRunExecutionTree({
        config: input.config,
        teamDefinitionName: required(input.teamDefinitionName, "teamDefinitionName"),
      });
      const tree = Object.freeze({ ...initial, ...(input.containedIn ? { containedIn: input.containedIn } : {}),
        ...(input.delegatedFrom ? { delegatedFrom: input.delegatedFrom, ...(input.copiedFrom ? { copiedFrom: input.copiedFrom } : {}) } : {}) });
      const messages: TeamCommunicationMessagesSnapshot = Object.freeze({
        schemaVersion: 1,
        rootTeamRunId,
        messages: Object.freeze([]),
      });
      const teamMemoryDir = this.teamMemoryDir(rootTeamRunId);
      const root = await materializeTeamRoot({
        config: input.config,
        tree,
        messages,
        teamMemoryDir,
        mode: "fresh",
        persistInitialPackage: true,
        ...this.materializationDependencies(),
        onTerminated: (terminated, ending) => { this.unregister(rootTeamRunId, terminated, ending); },
      });
      try {
        await this.packageCatalog.admit(rootTeamRunId);
        this.register(root);
      } catch (error) {
        await root.terminate().catch(() => undefined);
        throw error;
      }
      return root;
    });
  }

  async restoreTeamRun(rootTeamRunIdInput: string): Promise<RootTeamRun> {
    this.assertRootAdmissionOpen();
    const rootTeamRunId = required(rootTeamRunIdInput, "rootTeamRunId");
    return this.withRootTransition(rootTeamRunId, async () => {
      await this.completeStoppingRoot(rootTeamRunId);
      if (this.hasManagedTeamRun(rootTeamRunId)) throw new Error(`RootTeamRun '${rootTeamRunId}' is already managed.`);
      await this.packageCatalog.awaitReady();
      if (!this.packageCatalog.isAdmitted(rootTeamRunId)) {
        throw new Error(`TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED: TeamRun '${rootTeamRunId}' is not an admitted current package.`);
      }
      const teamMemoryDir = this.teamMemoryDir(rootTeamRunId);
      const loaded = await new TeamRunStatePackageLoader({
        executionTreeStore: this.executionTreeStore,
        communicationStore: this.communicationStore,
      }).load({ teamMemoryDir, rootTeamRunId });
      if (!loaded.loaded) throw new Error(`${loaded.code}: ${loaded.message}`);
      // DS-002: a stopped run follows its definition before it comes alive; the change is saved first.
      const stored = await this.membershipPlanner.followStored(loaded.state.executionTree);
      if (stored && (await this.executionTreeStore.write(teamMemoryDir, stored.tree)).outcome !== "committed") {
        throw new Error(`TEAM_RUN_DEFINITION_NOT_SAVED: TeamRun '${rootTeamRunId}' could not save its members from its definition.`);
      }
      const tree = stored?.tree ?? loaded.state.executionTree;
      const config = buildTeamRunConfigFromExecutionTree(tree);
      const root = await materializeTeamRoot({
        config,
        tree,
        messages: loaded.state.communicationMessages,
        teamMemoryDir,
        mode: "restore",
        persistInitialPackage: false,
        ...this.materializationDependencies(),
        onTerminated: (terminated, ending) => { this.unregister(rootTeamRunId, terminated, ending); },
      });
      this.register(root);
      if (stored) root.followedStored(stored);
      // N-1: a change announced while it was restoring is not missed (nothing changed: no write, no event).
      await followLiveTeamRun(this.membershipPlanner, root);
      return root;
    });
  }

  /** The managed, active team runs of this process (the live runs that follow their definition). */
  listActiveTeamRuns(): RootTeamRun[] { return [...this.managedRoots.values()].filter((root) => root.isActive()); }

  /** Whether the run's stored package is admitted (base's restore check, SR-078); nothing is read or loaded. */
  async isCatalogedPackage(rootTeamRunId: string): Promise<boolean> {
    await this.packageCatalog.awaitReady();
    return this.packageCatalog.isAdmitted(required(rootTeamRunId, "rootTeamRunId"));
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

  /** N-303 / N-304: a peer's request checked against an unmanaged Team run's stored links; it loads nothing. */
  async storedRemoteLinkCheck(rootTeamRunIdInput: string, query: RemoteInboundQuery): Promise<StoredRemoteLinkCheck> {
    const rootTeamRunId = required(rootTeamRunIdInput, "rootTeamRunId");
    if (query.kind !== "owner" && this.hasManagedTeamRun(rootTeamRunId)) return "proceed";
    const tree = this.getManagedTeamRun(rootTeamRunId)?.getExecutionTreeSnapshot()
      ?? await this.executionTreeStore.read(this.teamMemoryDir(rootTeamRunId), rootTeamRunId);
    return storedRemoteLinkCheck(tree ? teamRunRemoteLinks(() => tree, this.delegationIndex) : null, query);
  }

  listActiveTeamRunIds(): string[] {
    return [...this.managedRoots.keys()].filter((id) => this.getActiveTeamRun(id));
  }

  listManagedTeamRunIds(): string[] { return [...this.managedRoots.keys()]; }

  async withInactiveHistoryMutation<T>(
    rootTeamRunIdInput: string,
    operation: () => Promise<T>,
  ): Promise<{ kind: "managed" } | { kind: "completed"; value: T }> {
    const rootTeamRunId = required(rootTeamRunIdInput, "rootTeamRunId");
    return this.withRootTransition(rootTeamRunId, async () => {
      if (this.hasManagedTeamRun(rootTeamRunId)) return { kind: "managed" };
      return { kind: "completed", value: await operation() };
    });
  }

  /** The check of a stopped Team run's Save without writing (SR-039: a delegator's Settings checks every run first). */
  async checkStoppedSelections(input: {
    teamRunId: string;
    selectionPatches: readonly TeamRunSelectionPatch[];
  }): Promise<RunModelConfigUpdateResult<TeamRunExecutionTreeSnapshot | null> | null> {
    return this.planStoppedSelections(required(input.teamRunId, "teamRunId"), input.selectionPatches)
      .then((plan) => plan.kind === "refused" ? plan.result : null);
  }

  /** AR-004: one all-or-nothing Save of a stopped Team run's own model settings, in one tree write. */
  async updateStoppedSelections(input: {
    teamRunId: string;
    selectionPatches: readonly TeamRunSelectionPatch[];
  }): Promise<RunModelConfigUpdateResult<TeamRunExecutionTreeSnapshot | null>> {
    const teamRunId = required(input.teamRunId, "teamRunId");
    return this.withRootTransition(teamRunId, async () => {
      const planned = await this.planStoppedSelections(teamRunId, input.selectionPatches);
      if (planned.kind === "refused") return planned.result;
      const { tree, nextTree } = planned;
      if (isDeepStrictEqual(nextTree, tree)) {
        return teamModelConfigUpdateResult("UNCHANGED", "Team model settings are already up to date.", tree, false);
      }
      const write = await this.executionTreeStore.write(this.teamMemoryDir(teamRunId), nextTree);
      // Once renamed, unreadable canonical state requires verification, not an ordinary failure.
      const canonical = await this.executionTreeStore.read(this.teamMemoryDir(teamRunId), teamRunId).catch(() => null);
      if (write.outcome === "finalization_indeterminate" ||
          (write.outcome === "committed" && !canonical)) {
        return teamModelConfigUpdateResult(
          "PERSISTENCE_INDETERMINATE",
          "Update outcome is being verified. Refresh the Team configuration before saving again.",
          canonical ?? tree,
          false,
        );
      }
      if (write.outcome !== "committed" || !canonical || !isDeepStrictEqual(canonical, nextTree)) {
        return teamModelConfigUpdateResult("PERSISTENCE_FAILED", "Team model settings were not saved.", canonical ?? tree, false);
      }
      return teamModelConfigUpdateResult(
        "UPDATED",
        "Team model settings updated. They will be used when this team resumes.",
        canonical,
        false,
      );
    });
  }

  private async planStoppedSelections(teamRunId: string, selectionPatches: readonly TeamRunSelectionPatch[]): Promise<
    | Readonly<{ kind: "refused"; result: RunModelConfigUpdateResult<TeamRunExecutionTreeSnapshot | null> }>
    | Readonly<{ kind: "planned"; tree: TeamRunExecutionTreeSnapshot; nextTree: TeamRunExecutionTreeSnapshot }>> {
    const refused = (result: RunModelConfigUpdateResult<TeamRunExecutionTreeSnapshot | null>) => ({ kind: "refused" as const, result });
    const tree = await this.executionTreeStore.read(this.teamMemoryDir(teamRunId), teamRunId);
    if (!tree) return refused(teamModelConfigUpdateResult("NOT_FOUND", "Team run was not found.", null, false));
    await this.packageCatalog.awaitReady();
    if (!this.packageCatalog.isAdmitted(teamRunId)) {
      return refused(teamModelConfigUpdateResult("NOT_FOUND", "Team run is not an admitted current package.", tree, false));
    }
    if (this.hasManagedTeamRun(teamRunId)) {
      return refused(teamModelConfigUpdateResult("RUN_ACTIVE",
        "This team became active through another connected workflow. Stop it, reopen Settings, and try again.", tree, true));
    }
    if (tree.archivedAt) return refused(teamModelConfigUpdateResult("RUN_ARCHIVED", "Archived Team runs cannot be edited.", tree, false, true));
    const plan = await planStoppedTeamLaunchSave({ tree, configuredPatches: selectionPatches, validator: this.modelSelectionValidator });
    if (plan.kind === "refused") return refused(teamModelConfigUpdateResult(plan.outcome, plan.message, tree, false, false, plan.fieldErrors));
    return { kind: "planned", tree, nextTree: plan.nextTree };
  }

  getLifecycleSnapshot(rootTeamRunId: string): TeamRunLifecycleSnapshot {
    const teamRunId = required(rootTeamRunId, "rootTeamRunId");
    return { teamRunId, isActive: this.hasManagedTeamRun(teamRunId), ending: null };
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
      return this.unregister(rootTeamRunId, root, "stopped") || !this.managedRoots.has(rootTeamRunId);
    } catch (error) {
      throw new AgentTeamTerminationError(String(error));
    }
  }

  /**
   * A closed Task's stop (CR-461-001): `stillClosed` is asked right before the run's gate closes (`terminate` closes it
   * before its first await); a team run open again is kept. A team run that is not running is `stopped` (nothing runs).
   */
  async terminateTeamRunForTaskClosure(teamRunId: string, stillClosed: () => boolean): Promise<"stopped" | "kept_open" | "not_stopped"> {
    const root = this.getManagedTeamRun(teamRunId);
    if (!stillClosed()) return "kept_open";
    if (!root) return "stopped";
    try {
      if (!(await root.terminate()).accepted) return "not_stopped";
    } catch (error) {
      throw new AgentTeamTerminationError(String(error));
    }
    return this.unregister(teamRunId, root, "stopped") || !this.managedRoots.has(teamRunId) ? "stopped" : "not_stopped";
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
      taskRecords: this.taskRecords,
      delegationIndex: this.delegationIndex,
      remoteChannel: this.remoteChannel,
      receivedFiles: this.receivedFiles,
      // autobyteus-587: a member's own folder (where files from another node land) is in this manager's memory folder.
      memoryLocator: new AgentRunMemoryLocator({ layout: this.memoryLayout }),
      viewStreams: this.viewStreams,
      executionTreeStore: this.executionTreeStore,
      communicationStore: this.communicationStore,
      changeNotices: this.changeNotices,
      modelSelectionValidator: this.modelSelectionValidator,
    } as const;
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
    this.notify({ teamRunId: root.teamRunId, isActive: true, ending: null });
  }

  /**
   * A managed root that is no longer active (terminating or fail-stopped) finishes its termination here,
   * so restore never dead-ends on "already managed". Runs inside the caller's root transition.
   */
  private async completeStoppingRoot(rootTeamRunId: string): Promise<void> {
    const root = this.managedRoots.get(rootTeamRunId);
    if (!root || root.isActive()) return;
    let result;
    try { result = await root.terminate(); }
    catch (error) { result = { accepted: false, message: error instanceof Error ? error.message : String(error) }; }
    if (!result.accepted) {
      throw new Error(`TEAM_RUN_STOP_INCOMPLETE: ${result.message ?? result.code ?? `TeamRun '${rootTeamRunId}' did not finish stopping.`}`);
    }
    this.unregister(rootTeamRunId, root, "stopped");
  }

  private unregister(rootTeamRunId: string, expected: RootTeamRun, ending: TeamRunEnding): boolean {
    if (this.managedRoots.get(rootTeamRunId) !== expected) return false;
    this.managedRoots.delete(rootTeamRunId);
    this.activeRootDirectory.unregister(createTeamRootExecutionIdentity(rootTeamRunId), expected);
    // SR-010 (N-13): its leaving members read as former now that it is not live; its rows drop the tag, with no write.
    if (expected.getExecutionTreeSnapshot().rootTeam.formerMembers?.some((member) => member.leaving)) this.delegationIndex.runPartsChanged(createTeamRootExecutionIdentity(rootTeamRunId));
    this.notify({ teamRunId: rootTeamRunId, isActive: false, ending });
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
