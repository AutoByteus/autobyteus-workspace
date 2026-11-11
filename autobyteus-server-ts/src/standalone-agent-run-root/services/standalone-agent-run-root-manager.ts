import { localChildStatuses, type LocalChildAgentStatus } from "../../agent-collaboration/execution/delegation/local-child-observation.js";
import { closedTaskExecutionsDigest } from "@autobyteus/collaboration-stream-contracts";
import { storedRemoteLinkCheck, type RemoteInboundQuery, type StoredRemoteLinkCheck } from "../../agent-collaboration/execution/remote/remote-run-links.js";
import {
  ActiveCollaborationRootDirectory,
  getActiveCollaborationRootDirectory,
} from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { isCollaborationEligibleStandaloneRun } from "../../agent-execution/services/standalone-agent-run-eligibility.js";
import type { StandaloneAgentRunActivationResult } from "../../agent-execution/services/standalone-agent-run-lifecycle-service.js";
import type {
  StandaloneRootStopResult,
  StandaloneRunCommandPort,
  StandaloneRunLifecyclePort,
  StandaloneRunPostInput,
  StandaloneRunPostResult,
} from "../../agent-execution/services/standalone-run-ports.js";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import { peerDelegatedFromOf, type AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import { StandaloneRootPackageStore } from "../persistence/standalone-root-package-store.js";
import type { StandaloneAgentRunRoot, StandaloneRootPackageSnapshot } from "../domain/standalone-agent-run-root.js";
import { StandaloneHostAgentHandle, type StandaloneHostActivationBackend } from "../domain/standalone-host-agent-handle.js";
import { emptyStandaloneRootMessages, type StandaloneRootHost, type StandaloneRootMessagesFile } from "../domain/standalone-root-host.js";
import { StandaloneHostMemberContextBuilder } from "./standalone-host-member-context-builder.js";
import type { TaskExecutionResourcePort } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import { createAgentRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { findDelegationTree } from "../../agent-collaboration/delegation/delegation-tree-binding.js";
import { StandaloneRootBuilder, type StandaloneRootBuilderDependencies } from "./standalone-root-builder.js";
import type { PairedAgentAccess } from "../../agent-collaboration/execution/remote/paired-agent-access.js";
import { StandalonePairedAgentAccess } from "./standalone-paired-agent-access.js";

/** Host facts and mechanics the manager needs from the standalone side; wired at process composition. */
export type StandaloneRootHostServices = StandaloneHostActivationBackend & Readonly<{
  readMetadata(hostRunId: string): Promise<AgentRunMetadata | null>;
}>;

export class StandaloneRootUnavailableError extends Error {
  readonly code = "AGENT_ROOT_UNAVAILABLE";
  constructor(message: string) {
    super(message);
    this.name = "StandaloneRootUnavailableError";
  }
}

export type StandaloneRootCollaborationRecordsSnapshot = Readonly<{
  host: StandaloneRootHost;
  messages: StandaloneRootMessagesFile;
}>;

export type StandaloneRootInspection = Readonly<{
  hostRunId: string;
  isActive: boolean;
  snapshot: StandaloneRootPackageSnapshot;
  baseChangeSequence: number;
  /** The live sequence `baseChangeSequence` counts in; null for a stopped run. */
  liveSequenceId: string | null;
  /** The sequence of the root's latest message through `baseChangeSequence`; null for a stopped run. */
  lastMessageChangeSequence: number | null;
}>;

/** One run's answer to the history poll's status read. */
export type StandaloneRootAgentStatuses = Readonly<{
  runId: string;
  isActive: boolean;
  statuses: readonly LocalChildAgentStatus[];
  /** Active: the digest of the closed set its view lists (none). Stopped: of its closed children (the Task entries). */
  closedTaskExecutionsDigest: string;
}>;

const launchConfigurationOf = (metadata: AgentRunMetadata): AgentLaunchConfiguration => Object.freeze({
  runtimeKind: metadata.runtimeKind,
  llmModelIdentifier: metadata.llmModelIdentifier,
  llmConfig: metadata.llmConfig === null ? null : structuredClone(metadata.llmConfig),
  autoExecuteTools: metadata.autoExecuteTools,
  workspaceRootPath: metadata.workspaceRootPath,
});

/**
 * The registry of `StandaloneAgentRunRoot`s, one per collaboration-eligible standalone run in use (autobyteus-461: a
 * run delegated from another run is one too). A root is created on first use, from its own log, without starting its
 * agent; it ends on a Stop, a history delete or archive, or server shutdown. It is also the process's
 * `StandaloneRunCommandPort` and `StandaloneRunLifecyclePort`.
 */
export class StandaloneAgentRunRootManager implements StandaloneRunCommandPort, StandaloneRunLifecyclePort {
  private readonly layout: AgentMemoryLayout;
  private readonly store: StandaloneRootPackageStore;
  private readonly directory: ActiveCollaborationRootDirectory;
  private readonly active = new Map<string, StandaloneAgentRunRoot>();
  private readonly pending = new Map<string, Promise<StandaloneAgentRunRoot>>();
  private readonly hostContexts: StandaloneHostMemberContextBuilder;
  private readonly roots: StandaloneRootBuilder;
  private admissionOpen = true;
  /** autobyteus-278: a run a peer started, as this node serves that peer's owner (behind `RemoteRootDirectory`). */
  readonly pairedAgents: PairedAgentAccess = new StandalonePairedAgentAccess(this);
  /** autobyteus-278 (DS-006): who learns that a run ended by Stop, terminate or history delete/archive (not idle shutdown). */
  private readonly endListeners = new Map<string, Set<() => void>>();

  constructor(private readonly options: Readonly<{
    memoryDir: string;
    host: StandaloneRootHostServices;
    definitions: Pick<AgentDefinitionService, "getAgentDefinitionById">;
    rootDependencies: Omit<StandaloneRootBuilderDependencies, "packageStore">;
    taskExecutionResources?: TaskExecutionResourcePort;
    packageStore?: StandaloneRootPackageStore;
    activeRootDirectory?: ActiveCollaborationRootDirectory;
  }>) {
    this.layout = new AgentMemoryLayout(options.memoryDir);
    this.store = options.packageStore ?? new StandaloneRootPackageStore();
    this.directory = options.activeRootDirectory ?? getActiveCollaborationRootDirectory();
    this.roots = new StandaloneRootBuilder({ ...options.rootDependencies, packageStore: this.store });
    this.hostContexts = new StandaloneHostMemberContextBuilder({
      definitions: options.definitions,
      getActiveRoot: (hostRunId) => this.getActive(hostRunId),
      readStoredHostAddress: async (hostRunId) => (await this.options.host.readMetadata(hostRunId))?.address ?? null, // contract §3.3
    });
  }

  getActive(hostRunId: string): StandaloneAgentRunRoot | null {
    const root = this.active.get(hostRunId.trim()) ?? null;
    return root?.isActive() ? root : null;
  }

  /** A root is registered (or loading) for the run, whether or not its agent is running. */
  hasRoot(hostRunIdInput: string): boolean {
    const hostRunId = hostRunIdInput.trim();
    return this.active.has(hostRunId) || this.pending.has(hostRunId);
  }

  /**
   * Each listed run's live state for the history poll (autobyteus-426 REQ-009; CR-461-002). An active run answers its
   * view's children: every agent of its open local children with its status, and the digest of the closed set its view
   * lists (none). A stopped run answers no statuses and the digest of its closed children (the Task entries), so a list
   * re-reads its view once when a child's Task closes or reopens.
   */
  async getAgentStatuses(hostRunIds: readonly string[]): Promise<StandaloneRootAgentStatuses[]> {
    return Promise.all(hostRunIds.map(async (runId) => {
      const run = createAgentRootExecutionIdentity(runId);
      if (this.getActive(runId)) return { runId, isActive: true, statuses: await localChildStatuses(run), closedTaskExecutionsDigest: closedTaskExecutionsDigest([]) };
      const closed = (findDelegationTree()?.childrenOf(run) ?? []).filter((child) => this.options.taskExecutionResources?.isOpen(child) === false);
      return { runId, isActive: false, statuses: [], closedTaskExecutionsDigest: closedTaskExecutionsDigest(closed) };
    }));
  }

  /** The root of an eligible run: the registered one, else loaded from its own log and registered. Never starts its agent. */
  async resolveRoot(hostRunIdInput: string): Promise<StandaloneAgentRunRoot | null> {
    const hostRunId = hostRunIdInput.trim();
    const existing = this.getActive(hostRunId);
    if (existing) return existing;
    const metadata = await this.options.host.readMetadata(hostRunId);
    if (!metadata) throw new StandaloneRootUnavailableError(`Agent run '${hostRunId}' was not found.`);
    if (!isCollaborationEligibleStandaloneRun(metadata)) return null;
    const registered = this.getActive(hostRunId);
    if (registered) return registered;
    const inFlight = this.pending.get(hostRunId);
    if (inFlight) return inFlight;
    if (!this.admissionOpen) throw new StandaloneRootUnavailableError("Agent root admission is closed for process shutdown.");
    const attempt = this.load(metadata);
    this.pending.set(hostRunId, attempt);
    try {
      return await attempt;
    } finally {
      if (this.pending.get(hostRunId) === attempt) this.pending.delete(hostRunId);
    }
  }

  /** N-303 / N-304: a peer's request checked against the run's links (back-link included); it loads nothing. */
  async storedRemoteLinkCheck(hostRunIdInput: string, query: RemoteInboundQuery): Promise<StoredRemoteLinkCheck> {
    const hostRunId = hostRunIdInput.trim();
    if (query.kind !== "owner" && this.hasRoot(hostRunId)) return "proceed";
    const metadata = await this.options.host.readMetadata(hostRunId);
    if (!metadata || !isCollaborationEligibleStandaloneRun(metadata)) return "not_found";
    const delegatedFrom = peerDelegatedFromOf(metadata); // AR-016: only a run a peer started has a peer delegator
    return storedRemoteLinkCheck(delegatedFrom
      ? { peerRuns: () => [], backLink: { pairedAgentRunIds: () => [hostRunId], delegatedFrom } }
      : { run: createAgentRootExecutionIdentity(hostRunId) }, query);
  }

  /** `StandaloneRunCommandPort`: the root executes the command in its gate. */
  async postUserMessage(input: StandaloneRunPostInput): Promise<StandaloneRunPostResult | null> {
    const root = await this.resolveRoot(input.runId);
    if (!root) return null;
    const { runId: _runId, ...command } = input;
    return root.postHostUserMessage(command);
  }

  /** `StandaloneRunLifecyclePort`: create, activate, restore and resolve of an eligible run. */
  async resolveRootAndEnsureHost(hostRunId: string): Promise<StandaloneAgentRunActivationResult | null> {
    const root = await this.resolveRoot(hostRunId);
    if (!root) return null;
    const run = await root.ensureHostReady();
    const metadata = await this.options.host.readMetadata(root.hostRunId);
    if (!metadata) throw new StandaloneRootUnavailableError(`Agent run '${root.hostRunId}' metadata is unavailable.`);
    root.setInheritedLaunch(launchConfigurationOf(metadata));
    return Object.freeze({ run, metadata });
  }

  /** `StandaloneRunLifecyclePort`: a saved edit of the stopped run reaches the registered root's inherited launch. */
  async refreshInheritedLaunch(hostRunIdInput: string): Promise<void> {
    const hostRunId = hostRunIdInput.trim();
    const root = await this.pending.get(hostRunId)?.catch(() => undefined) ?? this.active.get(hostRunId);
    if (!root) return;
    const metadata = await this.options.host.readMetadata(hostRunId);
    if (metadata && isCollaborationEligibleStandaloneRun(metadata)) root.setInheritedLaunch(launchConfigurationOf(metadata));
  }

  /** Stop (DS-4, TC-1): the run's own agent only, then the root unregisters. Null for a run that is not eligible. */
  async stopRoot(hostRunIdInput: string): Promise<StandaloneRootStopResult | null> {
    const hostRunId = hostRunIdInput.trim();
    await this.pending.get(hostRunId)?.catch(() => undefined);
    const root = this.active.get(hostRunId);
    if (!root) {
      const metadata = await this.options.host.readMetadata(hostRunId);
      if (!metadata || !isCollaborationEligibleStandaloneRun(metadata)) return null;
      const stopped = Object.freeze({ rootEnded: false, host: await this.options.host.terminateHost(hostRunId) });
      this.notifyEnded(hostRunId);
      return stopped;
    }
    const host = await root.stop();
    this.unregister(root);
    this.notifyEnded(hostRunId);
    return Object.freeze({ rootEnded: true, host });
  }

  /** A closed Task's stop (CR-461-001): as `stopRoot`, unless the run's Task entry is open again where its gate closes. */
  async stopRootForTaskClosure(hostRunIdInput: string, stillClosed: () => boolean): Promise<StandaloneRootStopResult | "kept_open" | null> {
    const hostRunId = hostRunIdInput.trim();
    await this.pending.get(hostRunId)?.catch(() => undefined);
    const root = this.active.get(hostRunId);
    if (!root) {
      const metadata = await this.options.host.readMetadata(hostRunId);
      if (!metadata || !isCollaborationEligibleStandaloneRun(metadata)) return null;
      if (!stillClosed()) return "kept_open";
      const stopped = Object.freeze({ rootEnded: false, host: await this.options.host.terminateHost(hostRunId) });
      this.notifyEnded(hostRunId);
      return stopped;
    }
    const stopping = root.stopForTaskClosure(stillClosed);
    if (!stopping) return "kept_open";
    const host = await stopping;
    this.unregister(root);
    this.notifyEnded(hostRunId);
    return Object.freeze({ rootEnded: true, host });
  }

  /** History delete or archive: ends the run's root as a Stop does. Idempotent. */
  async endRoot(hostRunIdInput: string): Promise<void> {
    const hostRunId = hostRunIdInput.trim();
    await this.pending.get(hostRunId)?.catch(() => undefined);
    const root = this.active.get(hostRunId);
    if (!root) return;
    await root.stop();
    this.unregister(root);
    this.notifyEnded(hostRunId);
  }

  /**
   * autobyteus-278: `listener` runs once the run has ended by Stop, terminate or history delete/archive, after its agent
   * stopped. Idle shutdown does not end a run: its root stays and its agent returns.
   */
  onRunEnded(hostRunIdInput: string, listener: () => void): () => void {
    const hostRunId = hostRunIdInput.trim();
    const listeners = this.endListeners.get(hostRunId) ?? new Set<() => void>();
    listeners.add(listener);
    this.endListeners.set(hostRunId, listeners);
    return () => {
      listeners.delete(listener);
      if (!listeners.size && this.endListeners.get(hostRunId) === listeners) this.endListeners.delete(hostRunId);
    };
  }

  private notifyEnded(hostRunId: string): void {
    for (const listener of [...this.endListeners.get(hostRunId) ?? []]) {
      try { listener(); } catch (error) { console.error(`Agent run '${hostRunId}': an end listener failed:`, error); }
    }
  }

  /** Server shutdown: every root closes before the standalone runs (their agents) stop. */
  async stopAll(): Promise<void> {
    this.admissionOpen = false;
    const errors: unknown[] = [];
    for (const hostRunId of [...this.active.keys()]) {
      const root = this.active.get(hostRunId);
      if (!root) continue;
      try {
        const result = await root.terminate();
        if (!result.accepted) throw new Error(result.message ?? `Agent root '${hostRunId}' did not finish stopping.`);
        this.unregister(root);
      } catch (error) { errors.push(error); }
    }
    if (errors.length) throw new AggregateError(errors, "Failed to stop all Agent roots.");
  }

  /** The live root's view snapshot, else the stopped run's own agent; null for a run that is not eligible. Never restores. */
  async getInspection(hostRunIdInput: string): Promise<StandaloneRootInspection | null> {
    const hostRunId = hostRunIdInput.trim();
    const active = this.getActive(hostRunId);
    if (active) {
      const connection = await active.openPackageSnapshotConnection();
      try {
        return Object.freeze({ hostRunId, isActive: true, snapshot: connection.snapshot,
          baseChangeSequence: connection.baseChangeSequence, liveSequenceId: connection.liveSequenceId,
          lastMessageChangeSequence: connection.lastMessageChangeSequence });
      } finally { connection.close(); }
    }
    const metadata = await this.options.host.readMetadata(hostRunId);
    if (!metadata || !isCollaborationEligibleStandaloneRun(metadata)) return null;
    return Object.freeze({ hostRunId, isActive: false, baseChangeSequence: 0, liveSequenceId: null, lastMessageChangeSequence: null,
      snapshot: Object.freeze({ host: await this.hostOf(metadata), createdAt: metadata.startedAt ?? new Date(0).toISOString(), statuses: Object.freeze([]) }) });
  }

  /** The run's messages (autobyteus-358: the one log reader): the live root's, else its own stored log. */
  async getCollaborationRecordsSnapshot(hostRunIdInput: string): Promise<StandaloneRootCollaborationRecordsSnapshot> {
    const hostRunId = hostRunIdInput.trim();
    const active = this.getActive(hostRunId);
    const metadata = await this.options.host.readMetadata(hostRunId);
    if (!metadata) throw new StandaloneRootUnavailableError(`Agent run '${hostRunId}' was not found.`);
    if (active) return Object.freeze({ host: await this.hostOf(metadata), messages: active.getCommunicationSnapshot() });
    const messages = await this.store.readMessagesLog(this.layout.getStandaloneRunDirPath(hostRunId), hostRunId);
    return Object.freeze({ host: await this.hostOf(metadata), messages: messages ?? emptyStandaloneRootMessages(hostRunId) });
  }

  private async hostOf(metadata: AgentRunMetadata): Promise<StandaloneRootHost> {
    return Object.freeze({ address: await this.hostContexts.resolveHostAddress(metadata), agentRunId: metadata.runId, agentDefinitionId: metadata.agentDefinitionId });
  }

  private async load(metadata: AgentRunMetadata): Promise<StandaloneAgentRunRoot> {
    const hostRunId = metadata.runId;
    const runDir = this.layout.getStandaloneRunDirPath(hostRunId);
    const root = this.roots.build({
      host: await this.hostOf(metadata),
      createdAt: metadata.startedAt ?? new Date().toISOString(),
      messages: await this.store.readMessagesLog(runDir, hostRunId) ?? emptyStandaloneRootMessages(hostRunId),
      runDir,
      rootLaunchConfiguration: launchConfigurationOf(metadata),
      delegatedFrom: metadata.delegatedFrom ?? null,
      hostHandle: new StandaloneHostAgentHandle({
        hostRunId,
        backend: this.options.host,
        // Built per activation from the current metadata: a reopened run keeps its stable address.
        buildMemberExecutionContext: async () => {
          const current = await this.options.host.readMetadata(hostRunId);
          if (!current) throw new StandaloneRootUnavailableError(`Agent run '${hostRunId}' was not found.`);
          return this.hostContexts.build(current);
        },
      }),
      onTerminated: (terminated) => this.unregister(terminated),
    });
    const reservation = this.directory.reserve(root.rootIdentity, root);
    try {
      this.active.set(hostRunId, root);
      reservation.commit();
    } catch (error) {
      this.active.delete(hostRunId);
      reservation.release();
      await root.terminate().catch(() => undefined);
      throw error;
    }
    return root;
  }

  private unregister(root: StandaloneAgentRunRoot): void {
    if (this.active.get(root.hostRunId) !== root) return;
    this.active.delete(root.hostRunId);
    this.directory.unregister(root.rootIdentity, root);
  }
}

let processManager: StandaloneAgentRunRootManager | null = null;

/** Binds the process manager once at process composition (the general process run supervisor). */
export const bindProcessStandaloneAgentRunRootManager = (manager: StandaloneAgentRunRootManager): void => {
  if (!manager) throw new Error("A process StandaloneAgentRunRootManager is required.");
  if (processManager) throw new Error("The process StandaloneAgentRunRootManager is already initialized.");
  processManager = manager;
};

export const releaseProcessStandaloneAgentRunRootManager = (manager: StandaloneAgentRunRootManager): void => {
  if (processManager === manager) processManager = null;
};

/** The process manager, for the API edge (streams, GraphQL, REST, history). */
export const getStandaloneAgentRunRootManager = (): StandaloneAgentRunRootManager => {
  if (!processManager) throw new Error("The process StandaloneAgentRunRootManager is not initialized.");
  return processManager;
};

/** The process manager when one is bound (history mutations in a process without standalone runs). */
export const findStandaloneAgentRunRootManager = (): StandaloneAgentRunRootManager | null => processManager;
