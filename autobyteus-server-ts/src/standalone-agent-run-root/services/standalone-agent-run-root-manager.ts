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
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import { StandaloneRootPackageStore } from "../persistence/standalone-root-package-store.js";
import type { StandaloneAgentRunRoot, StandaloneRootPackageSnapshot } from "../domain/standalone-agent-run-root.js";
import { StandaloneHostAgentHandle, type StandaloneHostActivationBackend } from "../domain/standalone-host-agent-handle.js";
import {
  emptyStandaloneRootMessages,
  emptyStandaloneRootTree,
  type StandaloneRootTreeSnapshot,
} from "../domain/standalone-root-tree.js";
import { StandaloneHostMemberContextBuilder } from "./standalone-host-member-context-builder.js";
import { StandaloneRootExecutionIndex } from "./standalone-root-execution-index.js";
import type { TaskExecutionResourcePort } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import { listClosedTaskExecutions } from "../../agent-collaboration/execution/task/task-execution-closure.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import { createAgentRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import {
  StandaloneRootBuilder,
  type StandaloneRootBuilderDependencies,
} from "./standalone-root-builder.js";

/** Host facts and mechanics the manager needs from the standalone side; wired at process composition. */
export type StandaloneRootHostServices = StandaloneHostActivationBackend & Readonly<{
  readMetadata(hostRunId: string): Promise<AgentRunMetadata | null>;
  recordCollaborationPackageCreated(hostRunId: string): Promise<void>;
}>;

export class StandaloneRootUnavailableError extends Error {
  readonly code = "AGENT_ROOT_UNAVAILABLE";
  constructor(message: string) {
    super(message);
    this.name = "StandaloneRootUnavailableError";
  }
}

export type StandaloneRootInspection = Readonly<{
  hostRunId: string;
  isActive: boolean;
  snapshot: StandaloneRootPackageSnapshot;
  baseChangeSequence: number;
}>;

const launchConfigurationOf = (metadata: AgentRunMetadata): AgentLaunchConfiguration => Object.freeze({
  runtimeKind: metadata.runtimeKind,
  llmModelIdentifier: metadata.llmModelIdentifier,
  llmConfig: metadata.llmConfig === null ? null : structuredClone(metadata.llmConfig),
  autoExecuteTools: metadata.autoExecuteTools,
  workspaceRootPath: metadata.workspaceRootPath,
});

/**
 * The registry of `StandaloneAgentRunRoot`s, one per collaboration-eligible standalone run in
 * use. A root is created on first use (from its stored package, else empty) without starting
 * its host; it ends on an explicit Stop, a history delete or archive, or server shutdown. It is
 * also the process's `StandaloneRunCommandPort` and `StandaloneRunLifecyclePort`, through which
 * `agent-execution` reaches the roots without importing them.
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

  constructor(private readonly options: Readonly<{
    memoryDir: string;
    host: StandaloneRootHostServices;
    definitions: Pick<AgentDefinitionService, "getAgentDefinitionById">;
    rootDependencies: Omit<StandaloneRootBuilderDependencies, "packageStore">;
    /** The Task side's neutral port; the manager reads closure for stored inspections. */
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
      readStoredHostAddress: async (hostRunId) =>
        (await this.store.readTree(this.layout.getAgentRunCollaborationDirPath(hostRunId), hostRunId))?.host.address ?? null,
    });
  }

  getActive(hostRunId: string): StandaloneAgentRunRoot | null {
    const root = this.active.get(hostRunId.trim()) ?? null;
    return root?.isActive() ? root : null;
  }

  /** A root is registered (or loading) for the run, whether or not its host is running. */
  hasRoot(hostRunIdInput: string): boolean {
    const hostRunId = hostRunIdInput.trim();
    return this.active.has(hostRunId) || this.pending.has(hostRunId);
  }

  getActiveTree(hostRunId: string): StandaloneRootTreeSnapshot | null {
    return this.getActive(hostRunId)?.getExecutionTreeSnapshot() ?? null;
  }

  /**
   * The root of an eligible run: the registered one, else loaded from its package (or empty)
   * and registered. It never starts the host. Null for a run that cannot host collaborators.
   */
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

  /** `StandaloneRunCommandPort`: the root executes the host command in its gate. */
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
    return Object.freeze({ run, metadata });
  }

  /**
   * Explicit Stop: the root fences and stops every child, then its host, then unregisters.
   * Without a registered root only the host is stopped. Null for a run that is not eligible.
   */
  async stopRoot(hostRunIdInput: string): Promise<StandaloneRootStopResult | null> {
    const hostRunId = hostRunIdInput.trim();
    await this.pending.get(hostRunId)?.catch(() => undefined);
    const root = this.active.get(hostRunId);
    if (!root) {
      const metadata = await this.options.host.readMetadata(hostRunId);
      if (!metadata || !isCollaborationEligibleStandaloneRun(metadata)) return null;
      return Object.freeze({ rootEnded: false, host: await this.options.host.terminateHost(hostRunId) });
    }
    const host = await root.stop();
    this.unregister(root);
    return Object.freeze({ rootEnded: true, host });
  }

  /** History delete or archive: ends the run's root as a Stop does. Idempotent; throws when it cannot finish. */
  async endRoot(hostRunIdInput: string): Promise<void> {
    const hostRunId = hostRunIdInput.trim();
    await this.pending.get(hostRunId)?.catch(() => undefined);
    const root = this.active.get(hostRunId);
    if (!root) return;
    await root.stop();
    this.unregister(root);
  }

  /** Server shutdown: every root's children stop before the standalone runs (the hosts) stop. */
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

  /** Live snapshot of an active root, else the stored package with every child offline; null when none. Never restores. */
  async getInspection(hostRunIdInput: string): Promise<StandaloneRootInspection | null> {
    const hostRunId = hostRunIdInput.trim();
    const active = this.getActive(hostRunId);
    if (active) {
      const connection = await active.openPackageSnapshotConnection();
      try {
        return Object.freeze({ hostRunId, isActive: true, snapshot: connection.snapshot, baseChangeSequence: connection.baseChangeSequence });
      } finally { connection.close(); }
    }
    const dir = this.layout.getAgentRunCollaborationDirPath(hostRunId);
    const tree = await this.store.readTree(dir, hostRunId);
    if (!tree) return null;
    const messages = await this.store.readMessages(dir, hostRunId) ?? emptyStandaloneRootMessages(hostRunId);
    return Object.freeze({ hostRunId, isActive: false, baseChangeSequence: 0, snapshot: Object.freeze({
      tree, closedTaskExecutions: this.closedTaskExecutionsFor(hostRunId, tree), messages,
      statuses: Object.freeze([]), inputStates: Object.freeze([]),
    }) });
  }

  /** Closed (Task DONE or CANCELLED) task executions of a stored tree of this root. */
  private closedTaskExecutionsFor(hostRunId: string, tree: StandaloneRootTreeSnapshot): readonly TaskExecutionReference[] {
    const index = new StandaloneRootExecutionIndex(tree);
    return listClosedTaskExecutions({ port: this.options.taskExecutionResources, root: createAgentRootExecutionIdentity(hostRunId),
      contains: (reference) => index.getTaskExecution(reference) !== null });
  }

  private async load(metadata: AgentRunMetadata): Promise<StandaloneAgentRunRoot> {
    const hostRunId = metadata.runId;
    const collaborationDir = this.layout.getAgentRunCollaborationDirPath(hostRunId);
    const storedTree = await this.store.readTree(collaborationDir, hostRunId);
    const storedMessages = storedTree ? await this.store.readMessages(collaborationDir, hostRunId) : null;
    if (storedTree && !storedMessages) throw new Error(`Agent root '${hostRunId}' package has no communication messages.`);
    const tree = storedTree ?? emptyStandaloneRootTree({
      host: {
        address: await this.hostContexts.resolveHostAddress(metadata),
        agentRunId: hostRunId,
        agentDefinitionId: metadata.agentDefinitionId,
      },
      createdAt: new Date().toISOString(),
    });
    const root = await this.roots.build({
      tree,
      messages: storedMessages ?? emptyStandaloneRootMessages(hostRunId),
      packageExists: Boolean(storedTree),
      collaborationDir,
      rootLaunchConfiguration: launchConfigurationOf(metadata),
      host: new StandaloneHostAgentHandle({
        hostRunId,
        backend: this.options.host,
        // Built per activation from the current metadata: a reopened run keeps its stable address.
        buildMemberExecutionContext: async () => {
          const current = await this.options.host.readMetadata(hostRunId);
          if (!current) throw new StandaloneRootUnavailableError(`Agent run '${hostRunId}' was not found.`);
          return this.hostContexts.build(current);
        },
      }),
      onPackageCreated: () => this.options.host.recordCollaborationPackageCreated(hostRunId),
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
