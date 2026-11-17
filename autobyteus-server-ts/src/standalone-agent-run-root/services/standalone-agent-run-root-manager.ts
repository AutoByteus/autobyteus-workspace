import { ClosedTaskEntryFence, ClosedTaskFence } from "../../agent-collaboration/execution/task/closed-task-fence.js";
import { agentRunOwnDelegations, createDelegatedRunRestorability, type DelegatedRunRestorability } from "../../agent-collaboration/execution/task/delegated-run-restorability.js";
import { RunOwnAgentsReader } from "../../run-history/store/run-own-agents-reader.js";
import { storedRemoteLinkCheck, type RemoteInboundQuery, type StoredRemoteLinkCheck } from "../../agent-collaboration/execution/remote/remote-run-links.js";
import {
  ActiveCollaborationRootDirectory,
  getActiveCollaborationRootDirectory,
} from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { isCollaborationEligibleStandaloneRun } from "../../agent-execution/services/standalone-agent-run-eligibility.js";
import type { StandaloneAgentRunActivationResult } from "../../agent-execution/services/standalone-agent-run-lifecycle-service.js";
import type {
  RunInputRefusal,
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
import { StandaloneRunAgentHandle, type StandaloneRunAgentActivationBackend } from "../domain/standalone-run-agent-handle.js";
import { emptyStandaloneRootMessages, type StandaloneRunAgent, type StandaloneRootMessagesFile } from "../domain/standalone-run-agent.js";
import { StandaloneRunAgentContextBuilder } from "./standalone-run-agent-context-builder.js";
import { createAgentRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { StandaloneRootBuilder, type StandaloneRootBuilderDependencies } from "./standalone-root-builder.js";
import type { RunAgentAccess } from "../../agent-collaboration/execution/remote/run-agent-access.js";
import { StandaloneRunAgentAccess } from "./standalone-run-agent-access.js";

/** Host facts and mechanics the manager needs from the standalone side; wired at process composition. */
export type StandaloneRunAgentServices = StandaloneRunAgentActivationBackend & Readonly<{
  readMetadata(agentRunId: string): Promise<AgentRunMetadata | null>;
}>;

export class StandaloneRootUnavailableError extends Error {
  readonly code = "AGENT_ROOT_UNAVAILABLE";
  constructor(message: string) {
    super(message);
    this.name = "StandaloneRootUnavailableError";
  }
}

export type StandaloneRootCollaborationRecordsSnapshot = Readonly<{
  agent: StandaloneRunAgent;
  messages: StandaloneRootMessagesFile;
}>;

export type StandaloneRootInspection = Readonly<{
  agentRunId: string;
  isActive: boolean;
  snapshot: StandaloneRootPackageSnapshot;
  baseChangeSequence: number;
  /** The live sequence `baseChangeSequence` counts in; null for a stopped run. */
  liveSequenceId: string | null;
  /** The sequence of the root's latest message through `baseChangeSequence`; null for a stopped run. */
  lastMessageChangeSequence: number | null;
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
  /** A stop in progress per run (its root's end and its agent's), which a resolution waits for (CR-461-001). */
  private readonly ending = new Map<string, Promise<void>>();
  private readonly agentContexts: StandaloneRunAgentContextBuilder;
  private readonly roots: StandaloneRootBuilder;
  private admissionOpen = true;
  /** autobyteus-278: a run a peer started, as this node serves that peer's owner (behind `RemoteRootDirectory`). */
  readonly runAgents: RunAgentAccess = new StandaloneRunAgentAccess(this);
  /** autobyteus-278 (DS-006): who learns that a run ended by Stop, terminate or history delete/archive (not idle shutdown). */
  private readonly endListeners = new Map<string, Set<() => void>>();
  private readonly closedTasks: ClosedTaskEntryFence;
  private readonly restorability: DelegatedRunRestorability;

  constructor(private readonly options: Readonly<{
    memoryDir: string;
    agentServices: StandaloneRunAgentServices;
    definitions: Pick<AgentDefinitionService, "getAgentDefinitionById">;
    /** An org definition's authored instruction, read fresh: an org copy reads its org's (SR-058). */
    orgInstruction(orgDefinitionId: string): Promise<string | null>;
    rootDependencies: Omit<StandaloneRootBuilderDependencies, "packageStore">;
    packageStore?: StandaloneRootPackageStore;
    activeRootDirectory?: ActiveCollaborationRootDirectory;
  }>) {
    this.layout = new AgentMemoryLayout(options.memoryDir);
    this.store = options.packageStore ?? new StandaloneRootPackageStore();
    this.directory = options.activeRootDirectory ?? getActiveCollaborationRootDirectory();
    this.roots = new StandaloneRootBuilder({ ...options.rootDependencies, packageStore: this.store });
    this.closedTasks = new ClosedTaskEntryFence({ fence: new ClosedTaskFence({ tree: options.rootDependencies.delegationIndex, tasks: options.rootDependencies.taskRecords }),
      tasks: options.rootDependencies.taskRecords, files: new RunOwnAgentsReader(options.memoryDir) });
    // A delegated agent run's restore check (CR-461-070): its agent's liveness is this manager's.
    this.restorability = createDelegatedRunRestorability({ memoryDir: options.memoryDir, tree: options.rootDependencies.delegationIndex,
      ownDelegations: agentRunOwnDelegations(new RunOwnAgentsReader(options.memoryDir)), liveAgents: () => this.runAgents });
    this.agentContexts = new StandaloneRunAgentContextBuilder({
      definitions: options.definitions,
      tree: options.rootDependencies.delegationIndex,
      orgInstruction: options.orgInstruction,
      getActiveRoot: (agentRunId) => this.getActive(agentRunId),
      readStoredAgentAddress: async (agentRunId) => (await this.options.agentServices.readMetadata(agentRunId))?.address ?? null, // contract §3.3
    });
  }

  getActive(agentRunId: string): StandaloneAgentRunRoot | null {
    const root = this.active.get(agentRunId.trim()) ?? null;
    return root?.isActive() ? root : null;
  }

  /** A root is registered (or loading) for the run, whether or not its agent is running. */
  hasRoot(agentRunIdInput: string): boolean {
    const agentRunId = agentRunIdInput.trim();
    return this.active.has(agentRunId) || this.pending.has(agentRunId);
  }

  /**
   * The root of an eligible run: the registered one, else loaded from its own log and registered. Never starts its agent.
   * A run that is stopping is waited for, then loaded again: a delivery during a stop wakes the run after it, and the
   * run never has two roots (CR-461-001).
   */
  async resolveRoot(agentRunIdInput: string): Promise<StandaloneAgentRunRoot | null> {
    const agentRunId = agentRunIdInput.trim();
    await this.untilEnded(agentRunId);
    const existing = this.getActive(agentRunId);
    if (existing) return existing;
    const metadata = await this.options.agentServices.readMetadata(agentRunId);
    if (!metadata) throw new StandaloneRootUnavailableError(`Agent run '${agentRunId}' was not found.`);
    if (!isCollaborationEligibleStandaloneRun(metadata)) return null;
    await this.untilEnded(agentRunId);
    const registered = this.getActive(agentRunId);
    if (registered) return registered;
    const inFlight = this.pending.get(agentRunId);
    if (inFlight) return inFlight;
    if (!this.admissionOpen) throw new StandaloneRootUnavailableError("Agent root admission is closed for process shutdown.");
    const attempt = this.load(metadata);
    this.pending.set(agentRunId, attempt);
    try {
      return await attempt;
    } finally {
      if (this.pending.get(agentRunId) === attempt) this.pending.delete(agentRunId);
    }
  }

  /** N-303 / N-304: a peer's request checked against the run's links (back-link included); it loads nothing. */
  async storedRemoteLinkCheck(agentRunIdInput: string, query: RemoteInboundQuery): Promise<StoredRemoteLinkCheck> {
    const agentRunId = agentRunIdInput.trim();
    if (query.kind !== "owner" && this.hasRoot(agentRunId)) return "proceed";
    const metadata = await this.options.agentServices.readMetadata(agentRunId);
    if (!metadata || !isCollaborationEligibleStandaloneRun(metadata)) return "not_found";
    const delegatedFrom = peerDelegatedFromOf(metadata); // AR-016: only a run a peer started has a peer delegator
    return storedRemoteLinkCheck(delegatedFrom
      ? { peerRuns: () => [], backLink: { pairedAgentRunIds: () => [agentRunId], delegatedFrom } }
      : { run: createAgentRootExecutionIdentity(agentRunId), tree: this.options.rootDependencies.delegationIndex }, query);
  }

  /**
   * `StandaloneRunCommandPort`: the closed-Task fence (DS-15, SR-070), then whether a delegated run can be restored
   * (CR-461-070), before the run's root is resolved or restored, so a refused input registers nothing, changes no status
   * and binds no stream. The root's gate head checks the fence again.
   */
  async inputRefusal(runId: string): Promise<RunInputRefusal | null> {
    const run = createAgentRootExecutionIdentity(runId.trim());
    return await this.closedTasks.refusal(run) ?? await this.restorability.refusal(run);
  }

  /** `StandaloneRunCommandPort`: refused when its Task is closed; else the root executes the command in its gate. */
  async postUserMessage(input: StandaloneRunPostInput): Promise<StandaloneRunPostResult | null> {
    const refusal = await this.inputRefusal(input.runId);
    if (refusal) return { kind: "refused", refusal };
    const root = await this.resolveRoot(input.runId);
    if (!root) return null;
    const { runId: _runId, ...command } = input;
    return root.postAgentUserMessage(command);
  }

  /** `StandaloneRunLifecyclePort`: create, activate, restore and resolve of an eligible run. */
  async resolveRootAndEnsureAgent(agentRunId: string): Promise<StandaloneAgentRunActivationResult | null> {
    const root = await this.resolveRoot(agentRunId);
    if (!root) return null;
    const run = await root.ensureAgentReady();
    const metadata = await this.options.agentServices.readMetadata(root.agentRunId);
    if (!metadata) throw new StandaloneRootUnavailableError(`Agent run '${root.agentRunId}' metadata is unavailable.`);
    root.setInheritedLaunch(launchConfigurationOf(metadata));
    return Object.freeze({ run, metadata });
  }

  /** `StandaloneRunLifecyclePort`: a saved edit of the stopped run reaches the registered root's inherited launch. */
  async refreshInheritedLaunch(agentRunIdInput: string): Promise<void> {
    const agentRunId = agentRunIdInput.trim();
    const root = await this.pending.get(agentRunId)?.catch(() => undefined) ?? this.active.get(agentRunId);
    if (!root) return;
    const metadata = await this.options.agentServices.readMetadata(agentRunId);
    if (metadata && isCollaborationEligibleStandaloneRun(metadata)) root.setInheritedLaunch(launchConfigurationOf(metadata));
  }

  /** Stop (DS-4, TC-1): the run's own agent only, then the root unregisters. Null for a run that is not eligible. */
  stopRoot(agentRunIdInput: string): Promise<StandaloneRootStopResult | null> {
    const agentRunId = agentRunIdInput.trim();
    return this.whileEnding(agentRunId, () => this.stopRootNow(agentRunId));
  }

  private async stopRootNow(agentRunId: string): Promise<StandaloneRootStopResult | null> {
    await this.pending.get(agentRunId)?.catch(() => undefined);
    const root = this.active.get(agentRunId);
    if (!root) {
      const metadata = await this.options.agentServices.readMetadata(agentRunId);
      if (!metadata || !isCollaborationEligibleStandaloneRun(metadata)) return null;
      const stopped = Object.freeze({ rootEnded: false, agent: await this.options.agentServices.terminateRunAgent(agentRunId) });
      this.notifyEnded(agentRunId);
      return stopped;
    }
    const agent = await root.stop();
    this.unregister(root);
    this.notifyEnded(agentRunId);
    return Object.freeze({ rootEnded: true, agent });
  }

  /** A closed Task's stop (CR-461-001): as `stopRoot`, unless the run's Task entry is open again where its gate closes. */
  stopRootForTaskClosure(agentRunIdInput: string, stillClosed: () => boolean): Promise<StandaloneRootStopResult | "kept_open" | null> {
    const agentRunId = agentRunIdInput.trim();
    return this.whileEnding(agentRunId, () => this.stopRootForTaskClosureNow(agentRunId, stillClosed));
  }

  private async stopRootForTaskClosureNow(agentRunId: string, stillClosed: () => boolean): Promise<StandaloneRootStopResult | "kept_open" | null> {
    await this.pending.get(agentRunId)?.catch(() => undefined);
    const root = this.active.get(agentRunId);
    if (!root) {
      const metadata = await this.options.agentServices.readMetadata(agentRunId);
      if (!metadata || !isCollaborationEligibleStandaloneRun(metadata)) return null;
      if (!stillClosed()) return "kept_open";
      const stopped = Object.freeze({ rootEnded: false, agent: await this.options.agentServices.terminateRunAgent(agentRunId) });
      this.notifyEnded(agentRunId);
      return stopped;
    }
    const stopping = root.stopForTaskClosure(stillClosed);
    if (!stopping) return "kept_open";
    const agent = await stopping;
    this.unregister(root);
    this.notifyEnded(agentRunId);
    return Object.freeze({ rootEnded: true, agent });
  }

  /** History delete or archive: ends the run's root as a Stop does. Idempotent. */
  endRoot(agentRunIdInput: string): Promise<void> {
    const agentRunId = agentRunIdInput.trim();
    return this.whileEnding(agentRunId, async () => {
      await this.pending.get(agentRunId)?.catch(() => undefined);
      const root = this.active.get(agentRunId);
      if (!root) return;
      await root.stop();
      this.unregister(root);
      this.notifyEnded(agentRunId);
    });
  }

  /** Marks the run as stopping from the call on (before any await), so a resolution meanwhile waits for the stop. */
  private whileEnding<T>(agentRunId: string, stop: () => Promise<T>): Promise<T> {
    const previous = this.ending.get(agentRunId);
    const stopping = (previous ? previous.then(stop) : stop());
    const marker = stopping.then(() => undefined, () => undefined);
    this.ending.set(agentRunId, marker);
    void marker.then(() => { if (this.ending.get(agentRunId) === marker) this.ending.delete(agentRunId); });
    return stopping;
  }

  /** Waits while the run is stopping, or while its root ends by itself (a fail-stop); returns at once otherwise. */
  private async untilEnded(agentRunId: string): Promise<void> {
    for (;;) {
      const stopping = this.ending.get(agentRunId);
      const terminating = this.active.get(agentRunId);
      if (stopping) await stopping;
      else if (terminating && !terminating.isActive()) {
        await terminating.terminate().catch(() => undefined);
        this.unregister(terminating);
      } else return;
    }
  }

  /**
   * autobyteus-278: `listener` runs once the run has ended by Stop, terminate or history delete/archive, after its agent
   * stopped. Idle shutdown does not end a run: its root stays and its agent returns.
   */
  onRunEnded(agentRunIdInput: string, listener: () => void): () => void {
    const agentRunId = agentRunIdInput.trim();
    const listeners = this.endListeners.get(agentRunId) ?? new Set<() => void>();
    listeners.add(listener);
    this.endListeners.set(agentRunId, listeners);
    return () => {
      listeners.delete(listener);
      if (!listeners.size && this.endListeners.get(agentRunId) === listeners) this.endListeners.delete(agentRunId);
    };
  }

  private notifyEnded(agentRunId: string): void {
    for (const listener of [...this.endListeners.get(agentRunId) ?? []]) {
      try { listener(); } catch (error) { console.error(`Agent run '${agentRunId}': an end listener failed:`, error); }
    }
  }

  /** Server shutdown: every root closes before the standalone runs (their agents) stop. */
  async stopAll(): Promise<void> {
    this.admissionOpen = false;
    const errors: unknown[] = [];
    for (const agentRunId of [...this.active.keys()]) {
      const root = this.active.get(agentRunId);
      if (!root) continue;
      try {
        const result = await root.terminate();
        if (!result.accepted) throw new Error(result.message ?? `Agent root '${agentRunId}' did not finish stopping.`);
        this.unregister(root);
      } catch (error) { errors.push(error); }
    }
    if (errors.length) throw new AggregateError(errors, "Failed to stop all Agent roots.");
  }

  /** The live root's view snapshot, else the stopped run's own agent; null for a run that is not eligible. Never restores. */
  async getInspection(agentRunIdInput: string): Promise<StandaloneRootInspection | null> {
    const agentRunId = agentRunIdInput.trim();
    const active = this.getActive(agentRunId);
    if (active) {
      const connection = await active.openPackageSnapshotConnection();
      try {
        return Object.freeze({ agentRunId, isActive: true, snapshot: connection.snapshot,
          baseChangeSequence: connection.baseChangeSequence, liveSequenceId: connection.liveSequenceId,
          lastMessageChangeSequence: connection.lastMessageChangeSequence });
      } finally { connection.close(); }
    }
    const metadata = await this.options.agentServices.readMetadata(agentRunId);
    if (!metadata || !isCollaborationEligibleStandaloneRun(metadata)) return null;
    return Object.freeze({ agentRunId, isActive: false, baseChangeSequence: 0, liveSequenceId: null, lastMessageChangeSequence: null,
      snapshot: Object.freeze({ agent: await this.agentOf(metadata), createdAt: metadata.startedAt ?? new Date(0).toISOString() }) });
  }

  /** The run's messages (autobyteus-358: the one log reader): the live root's, else its own stored log. */
  async getCollaborationRecordsSnapshot(agentRunIdInput: string): Promise<StandaloneRootCollaborationRecordsSnapshot> {
    const agentRunId = agentRunIdInput.trim();
    const active = this.getActive(agentRunId);
    const metadata = await this.options.agentServices.readMetadata(agentRunId);
    if (!metadata) throw new StandaloneRootUnavailableError(`Agent run '${agentRunId}' was not found.`);
    if (active) return Object.freeze({ agent: await this.agentOf(metadata), messages: active.getCommunicationSnapshot() });
    const messages = await this.store.readMessagesLog(this.layout.getStandaloneRunDirPath(agentRunId), agentRunId);
    return Object.freeze({ agent: await this.agentOf(metadata), messages: messages ?? emptyStandaloneRootMessages(agentRunId) });
  }

  private async agentOf(metadata: AgentRunMetadata): Promise<StandaloneRunAgent> {
    return Object.freeze({ address: await this.agentContexts.resolveAgentAddress(metadata), agentRunId: metadata.runId, agentDefinitionId: metadata.agentDefinitionId });
  }

  private async load(metadata: AgentRunMetadata): Promise<StandaloneAgentRunRoot> {
    const agentRunId = metadata.runId;
    const runDir = this.layout.getStandaloneRunDirPath(agentRunId);
    const root = this.roots.build({
      agent: await this.agentOf(metadata),
      createdAt: metadata.startedAt ?? new Date().toISOString(),
      messages: await this.store.readMessagesLog(runDir, agentRunId) ?? emptyStandaloneRootMessages(agentRunId),
      runDir,
      rootLaunchConfiguration: launchConfigurationOf(metadata),
      delegatedFrom: metadata.delegatedFrom ?? null,
      agentHandle: new StandaloneRunAgentHandle({
        agentRunId,
        backend: this.options.agentServices,
        // Built per activation from the current metadata: a reopened run keeps its stable address.
        buildMemberExecutionContext: async () => {
          const current = await this.options.agentServices.readMetadata(agentRunId);
          if (!current) throw new StandaloneRootUnavailableError(`Agent run '${agentRunId}' was not found.`);
          return this.agentContexts.build(current);
        },
      }),
      onTerminated: (terminated) => this.unregister(terminated),
    });
    const reservation = this.directory.reserve(root.rootIdentity, root);
    try {
      this.active.set(agentRunId, root);
      reservation.commit();
    } catch (error) {
      this.active.delete(agentRunId);
      reservation.release();
      await root.terminate().catch(() => undefined);
      throw error;
    }
    return root;
  }

  private unregister(root: StandaloneAgentRunRoot): void {
    if (this.active.get(root.agentRunId) !== root) return;
    this.active.delete(root.agentRunId);
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
