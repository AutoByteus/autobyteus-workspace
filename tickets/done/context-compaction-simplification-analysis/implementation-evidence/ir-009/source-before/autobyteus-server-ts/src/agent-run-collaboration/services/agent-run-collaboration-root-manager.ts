import {
  ActiveCollaborationRootDirectory,
  getActiveCollaborationRootDirectory,
} from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import {
  isCollaborationEligibleStandaloneRun,
  type StandaloneAgentRunCollaborationBinding,
} from "../../agent-execution/services/standalone-agent-run-collaboration-binding.js";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import { AgentRunCollaborationPackageStore } from "../../run-history/store/agent-run-collaboration-tree-store.js";
import type { AgentRunCollaborationRoot, AgentRunCollaborationPackageSnapshot } from "../domain/agent-run-collaboration-root.js";
import {
  emptyAgentRunCollaborationMessages,
  emptyAgentRunCollaborationTree,
  type AgentRunCollaborationTreeSnapshot,
} from "../domain/agent-run-collaboration-tree.js";
import { AgentRunCollaborationHostContextBuilder } from "./agent-run-collaboration-host-context-builder.js";
import {
  AgentRunCollaborationRootBuilder,
  type AgentRunCollaborationRootBuilderDependencies,
} from "./agent-run-collaboration-root-builder.js";

/** Host facts the manager needs from the standalone side; wired at process composition. */
export type AgentRunCollaborationHostServices = Readonly<{
  getActiveRun(hostRunId: string): AgentRun | null;
  /** Restores a stopped or crashed host in its transition lane and releases the lane on return. */
  resolveCommandReadyAgentRun(hostRunId: string): Promise<AgentRun>;
  readMetadata(hostRunId: string): Promise<AgentRunMetadata | null>;
  recordCollaborationPackageCreated(hostRunId: string): Promise<void>;
}>;

export class AgentRootUnavailableError extends Error {
  readonly code = "AGENT_ROOT_UNAVAILABLE";
  constructor(message: string) {
    super(message);
    this.name = "AgentRootUnavailableError";
  }
}

export type AgentRunCollaborationInspection = Readonly<{
  hostRunId: string;
  isActive: boolean;
  snapshot: AgentRunCollaborationPackageSnapshot;
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
 * Owns every Agent root's lifetime relative to its host. The root exists while the host is
 * managed: it is ensured when the host is published (no root gate is taken), survives a host
 * crash, and ends only on an explicit Stop or server shutdown. `resolveCommandReadyRoot` is
 * the only command entry.
 */
export class AgentRunCollaborationRootManager implements StandaloneAgentRunCollaborationBinding {
  private static instance: AgentRunCollaborationRootManager | null = null;

  static getInstance(): AgentRunCollaborationRootManager {
    if (!this.instance) throw new Error("The process AgentRunCollaborationRootManager is not initialized.");
    return this.instance;
  }
  static initializeProcessInstance(options: ConstructorParameters<typeof AgentRunCollaborationRootManager>[0]): AgentRunCollaborationRootManager {
    if (this.instance) throw new Error("The process AgentRunCollaborationRootManager is already initialized.");
    return this.instance = new AgentRunCollaborationRootManager(options);
  }
  static releaseProcessInstance(instance: AgentRunCollaborationRootManager): void {
    if (this.instance === instance) this.instance = null;
  }
  /** A root is registered (or loading) for the host, whether or not the host's runtime is up. */
  static hasRegisteredRoot(hostRunId: string): boolean {
    return this.instance?.hasRoot(hostRunId) ?? false;
  }
  /** Ends a registered root and its children (as an explicit Stop does); throws when it cannot finish. */
  static async endRegisteredRoot(hostRunId: string): Promise<void> {
    await this.instance?.terminateRoot(hostRunId);
  }

  private readonly layout: AgentMemoryLayout;
  private readonly store: AgentRunCollaborationPackageStore;
  private readonly directory: ActiveCollaborationRootDirectory;
  private readonly active = new Map<string, AgentRunCollaborationRoot>();
  private readonly pending = new Map<string, Promise<AgentRunCollaborationRoot>>();
  private readonly hostContexts: AgentRunCollaborationHostContextBuilder;
  private readonly roots: AgentRunCollaborationRootBuilder;
  private admissionOpen = true;

  constructor(private readonly options: Readonly<{
    memoryDir: string;
    host: AgentRunCollaborationHostServices;
    definitions: Pick<AgentDefinitionService, "getAgentDefinitionById">;
    rootDependencies: Omit<AgentRunCollaborationRootBuilderDependencies, "packageStore">;
    packageStore?: AgentRunCollaborationPackageStore;
    activeRootDirectory?: ActiveCollaborationRootDirectory;
  }>) {
    this.layout = new AgentMemoryLayout(options.memoryDir);
    this.store = options.packageStore ?? new AgentRunCollaborationPackageStore();
    this.directory = options.activeRootDirectory ?? getActiveCollaborationRootDirectory();
    this.roots = new AgentRunCollaborationRootBuilder({ ...options.rootDependencies, packageStore: this.store });
    this.hostContexts = new AgentRunCollaborationHostContextBuilder({
      definitions: options.definitions,
      getActiveRoot: (hostRunId) => this.getActive(hostRunId),
      readStoredHostAddress: async (hostRunId) =>
        (await this.store.readTree(this.layout.getAgentRunCollaborationDirPath(hostRunId), hostRunId))?.host.address ?? null,
    });
  }

  getActive(hostRunId: string): AgentRunCollaborationRoot | null {
    const root = this.active.get(hostRunId.trim()) ?? null;
    return root?.isActive() ? root : null;
  }

  hasRoot(hostRunIdInput: string): boolean {
    const hostRunId = hostRunIdInput.trim();
    return this.active.has(hostRunId) || this.pending.has(hostRunId);
  }

  getActiveTree(hostRunId: string): AgentRunCollaborationTreeSnapshot | null {
    return this.getActive(hostRunId)?.getExecutionTreeSnapshot() ?? null;
  }

  async buildHostMemberExecutionContext(metadata: AgentRunMetadata): Promise<MemberExecutionContext | null> {
    return isCollaborationEligibleStandaloneRun(metadata) ? this.hostContexts.build(metadata) : null;
  }

  async onHostPublished(input: Readonly<{ run: AgentRun; metadata: AgentRunMetadata }>): Promise<void> {
    await this.ensureRoot(input.metadata);
  }

  /** Idempotent and takes no root gate: returns the registered root, or loads and registers it. */
  async ensureRoot(metadata: AgentRunMetadata): Promise<AgentRunCollaborationRoot | null> {
    if (!isCollaborationEligibleStandaloneRun(metadata)) return null;
    const hostRunId = metadata.runId;
    const existing = this.getActive(hostRunId);
    if (existing) return existing;
    const inFlight = this.pending.get(hostRunId);
    if (inFlight) return inFlight;
    if (!this.admissionOpen) throw new AgentRootUnavailableError("Agent root admission is closed for process shutdown.");
    const attempt = this.load(metadata);
    this.pending.set(hostRunId, attempt);
    try {
      return await attempt;
    } finally {
      if (this.pending.get(hostRunId) === attempt) this.pending.delete(hostRunId);
    }
  }

  /**
   * The command-ready Agent root: the host is restored through the standalone lifecycle when
   * needed (its lane is released on return), then the registered root is returned. Callers
   * take the root gate only afterwards, so the lane and the gate are never nested.
   */
  async resolveCommandReadyRoot(hostRunIdInput: string): Promise<AgentRunCollaborationRoot> {
    const hostRunId = hostRunIdInput.trim();
    const metadata = await this.options.host.readMetadata(hostRunId);
    if (!metadata) throw new AgentRootUnavailableError(`Agent run '${hostRunId}' was not found.`);
    if (!isCollaborationEligibleStandaloneRun(metadata)) {
      throw new AgentRootUnavailableError(`Agent run '${hostRunId}' cannot host collaborators.`);
    }
    await this.options.host.resolveCommandReadyAgentRun(hostRunId);
    const root = this.getActive(hostRunId) ?? await this.ensureRoot(metadata);
    if (!root) throw new AgentRootUnavailableError(`Agent run '${hostRunId}' has no collaboration root.`);
    return root;
  }

  async terminateRoot(hostRunIdInput: string): Promise<boolean> {
    const hostRunId = hostRunIdInput.trim();
    await this.pending.get(hostRunId)?.catch(() => undefined);
    const root = this.active.get(hostRunId);
    if (!root) return false;
    const result = await root.terminate();
    if (!result.accepted) throw new Error(result.message ?? `Agent root '${hostRunId}' did not finish stopping.`);
    this.unregister(root);
    return true;
  }

  /** Server shutdown: every Agent root and its children stop before the standalone runs. */
  async stopAll(): Promise<void> {
    this.admissionOpen = false;
    const errors: unknown[] = [];
    for (const hostRunId of [...this.active.keys()]) {
      try { await this.terminateRoot(hostRunId); } catch (error) { errors.push(error); }
    }
    if (errors.length) throw new AggregateError(errors, "Failed to stop all Agent roots.");
  }

  /** Live snapshot of an active root, else the stored package with every child offline; null when none. Never restores. */
  async getInspection(hostRunIdInput: string): Promise<AgentRunCollaborationInspection | null> {
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
    const messages = await this.store.readMessages(dir, hostRunId) ?? emptyAgentRunCollaborationMessages(hostRunId);
    return Object.freeze({ hostRunId, isActive: false, baseChangeSequence: 0, snapshot: Object.freeze({ tree, messages, statuses: Object.freeze([]) }) });
  }

  private async load(metadata: AgentRunMetadata): Promise<AgentRunCollaborationRoot> {
    const hostRunId = metadata.runId;
    const collaborationDir = this.layout.getAgentRunCollaborationDirPath(hostRunId);
    const storedTree = await this.store.readTree(collaborationDir, hostRunId);
    const storedMessages = storedTree ? await this.store.readMessages(collaborationDir, hostRunId) : null;
    if (storedTree && !storedMessages) throw new Error(`Agent root '${hostRunId}' package has no communication messages.`);
    const tree = storedTree ?? emptyAgentRunCollaborationTree({
      host: {
        address: await this.hostContexts.resolveHostAddress(metadata),
        agentRunId: hostRunId,
        agentDefinitionId: metadata.agentDefinitionId,
      },
      createdAt: new Date().toISOString(),
    });
    const root = await this.roots.build({
      tree,
      messages: storedMessages ?? emptyAgentRunCollaborationMessages(hostRunId),
      packageExists: Boolean(storedTree),
      collaborationDir,
      rootLaunchConfiguration: launchConfigurationOf(metadata),
      host: Object.freeze({
        getActiveRun: () => this.options.host.getActiveRun(hostRunId),
        resolveCommandReadyRun: () => this.options.host.resolveCommandReadyAgentRun(hostRunId),
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

  private unregister(root: AgentRunCollaborationRoot): void {
    if (this.active.get(root.hostRunId) !== root) return;
    this.active.delete(root.hostRunId);
    this.directory.unregister(root.rootIdentity, root);
  }
}
