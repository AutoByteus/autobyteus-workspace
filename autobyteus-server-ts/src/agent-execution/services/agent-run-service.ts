import type { PeerRunOf } from "../../agent-collaboration/execution/remote/peer-runs.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { LaunchConfigurationSource } from "../../agent-collaboration/domain/launch-configuration-source.js";
import type { AgentRun } from "../domain/agent-run.js";
import { AgentRunManager } from "./agent-run-manager.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import {
  type DelegatedFrom,
  type AgentRunMetadata,
  type SystemRunOwner,
} from "../../run-history/store/agent-run-metadata-types.js";
import {
  AgentRunMetadataService,
} from "../../run-history/services/agent-run-metadata-service.js";
import {
  AgentRunHistoryCatalogService,
} from "../../run-history/services/agent-run-history-catalog-service.js";
import type { ObservedRunLifecycleEvent } from "../../runtime-management/domain/observed-run-lifecycle-event.js";
import { isAgentRunEvent } from "../domain/agent-run-event.js";
import { AgentRunCanonicalFailureObserver } from "../events/agent-run-canonical-failure-observer.js";
import { AgentRunProvisioningService, type RemovedEmptyNeverStartedRun } from "./agent-run-provisioning-service.js";
import type { AgentRunIdentityAllocator } from "./agent-run-identity-allocator.js";
import {
  StandaloneAgentRunLifecycleService,
  type StandaloneAgentRunActivationResult,
} from "./standalone-agent-run-lifecycle-service.js";
import type { StandaloneRunLifecyclePort } from "./standalone-run-ports.js";
import type { RunModelConfigUpdateResult } from "../../run-history/domain/run-model-config.js";
import type { StoppedRunSelectionInput } from "./standalone-stopped-run-selection-updater.js";

export interface CreateAgentRunInput {
  agentDefinitionId: string;
  workspaceRootPath: string;
  workspaceId?: string | null;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  llmConfig?: Record<string, unknown> | null;
  runtimeKind: string;
  applicationBinding?: {
    applicationId: string;
    bindingId: string;
    displayName: string | null;
  } | null;
  /** A delegated run (local or peer-started): its origin, written once at creation (contract §2.2). */
  delegatedFrom?: DelegatedFrom;
  /** The run's own address when it is fixed at creation (a delegated run: its delegation address, contract §2.3). */
  address?: AgentTeamAddress;
  /** How the run's launch was resolved (a delegated run's resolved launch, contract §2.2). */
  launchSource?: LaunchConfigurationSource;
  /** autobyteus-32: the server service that owns the run (never a collaboration member). */
  systemRunOwner?: SystemRunOwner;
  /** The Project the run is started under (REQ-004); refused with `PROJECT_NOT_FOUND` when it does not exist. */
  projectId?: string | null;
}

export interface CreateAgentRunResult {
  runId: string;
}

export interface PrepareAgentRunInput extends CreateAgentRunInput {
  initialSummary?: string | null;
}

export interface PrepareAgentRunResult {
  runId: string;
  activationState: "PREPARED";
  preparedExpiresAt: string;
}

export interface RestoreAgentRunResult {
  run: AgentRun;
  metadata: AgentRunMetadata;
}

export interface CancelPreparedAgentRunResult {
  success: boolean;
  message: string;
}

export type AgentRunTerminationRoute = "native" | "runtime" | "not_found";

export interface AgentRunTerminationResult {
  success: boolean;
  message: string;
  route: AgentRunTerminationRoute;
  runtimeKind: RuntimeKind | null;
}


export class AgentRunService {
  private agentRunManager: AgentRunManager;
  private metadataService: AgentRunMetadataService;
  private historyCatalogService: AgentRunHistoryCatalogService;
  private readonly provisioningService: AgentRunProvisioningService;
  private readonly lifecycleService: StandaloneAgentRunLifecycleService;
  private readonly standaloneRuns: StandaloneRunLifecyclePort;
  private readonly peerRunOf: PeerRunOf | null;

  constructor(
    memoryDir: string,
    deps: {
      agentRunManager?: AgentRunManager;
      metadataService?: AgentRunMetadataService;
      historyCatalogService?: AgentRunHistoryCatalogService;
      workspaceManager?: ReturnType<typeof getWorkspaceManager>;
      agentRunIdentityAllocator?: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
      provisioningService?: AgentRunProvisioningService;
      lifecycleService: StandaloneAgentRunLifecycleService;
      /**
       * The owner of eligible standalone runs (their `StandaloneAgentRunRoot`s); an application execution scope passes
       * `APPLICATION_HOST_STANDALONE_RUNS`, whose runs are never eligible (autobyteus-500 FU-018).
       */
      standaloneRuns: StandaloneRunLifecyclePort;
      /** A run on a peer node by its own ID (SR-066): its Stop goes to its node. */
      peerRunOf?: PeerRunOf;
    },
  ) {
    if (!deps?.lifecycleService) {
      throw new Error("lifecycleService is required.");
    }
    this.agentRunManager = deps.agentRunManager ?? AgentRunManager.getInstance();
    this.metadataService =
      deps.metadataService ?? new AgentRunMetadataService(memoryDir);
    this.historyCatalogService =
      deps.historyCatalogService ?? new AgentRunHistoryCatalogService(memoryDir);
    const workspaceManager = deps.workspaceManager ?? getWorkspaceManager();
    this.provisioningService = deps.provisioningService ?? new AgentRunProvisioningService(memoryDir, {
      agentRunManager: this.agentRunManager,
      metadataService: this.metadataService,
      historyCatalogService: this.historyCatalogService,
      workspaceManager,
      agentRunIdentityAllocator: deps.agentRunIdentityAllocator,
    });
    this.lifecycleService = deps.lifecycleService;
    if (!deps.standaloneRuns) throw new Error("standaloneRuns is required.");
    this.standaloneRuns = deps.standaloneRuns;
    this.peerRunOf = deps.peerRunOf ?? null;
  }

  async terminateAgentRun(runId: string): Promise<AgentRunTerminationResult> {
    // A delegated run on a peer node is stopped as itself, by its node (SR-066, REQ-013).
    const peer = this.peerRunOf?.(runId) ?? null;
    if (peer?.kind === "agent" && peer.runId === runId) {
      const result = await peer.terminate();
      return result.accepted ? { success: true, message: "Stopped on its node.", route: "runtime", runtimeKind: null }
        : { success: false, message: result.message ?? "The run on another node did not stop.", route: "not_found", runtimeKind: null };
    }
    // An eligible run's root stops every child first, then its agent, even when the agent's own
    // runtime already died.
    const stopped = await this.standaloneRuns.stopRoot(runId);
    if (stopped) {
      const { agent } = stopped;
      if (agent.outcome === "terminated") return this.terminated(agent.runtimeKind);
      if (agent.outcome === "rejected") return this.notFound(agent.runtimeKind);
      if (!stopped.rootEnded) return this.notFound(null);
      await this.historyCatalogService.recordRunTerminated({ runId });
      return { success: true, message: "Agent run terminated successfully.", route: "runtime", runtimeKind: null };
    }
    const activeRun = this.agentRunManager.getActiveRun(runId);
    if (!activeRun) return this.notFound(null);

    const route: AgentRunTerminationRoute =
      activeRun.runtimeKind === RuntimeKind.AUTOBYTEUS ? "native" : "runtime";
    const terminated = await this.agentRunManager.terminateAgentRun(runId);
    if (!terminated) {
      return this.notFound(activeRun.runtimeKind);
    }

    await this.historyCatalogService.recordRunTerminated({ runId });
    return {
      success: true,
      message: "Agent run terminated successfully.",
      route,
      runtimeKind: activeRun.runtimeKind,
    };
  }

  private terminated(runtimeKind: RuntimeKind | null): AgentRunTerminationResult {
    return {
      success: true,
      message: "Agent run terminated successfully.",
      route: runtimeKind === RuntimeKind.AUTOBYTEUS ? "native" : "runtime",
      runtimeKind,
    };
  }

  getAgentRun(runId: string): AgentRun | null {
    return this.agentRunManager.getActiveRun(normalizeRequiredRunId(runId));
  }

  async resolveAgentRun(runId: string): Promise<AgentRun | null> {
    const normalizedRunId = normalizeRequiredRunId(runId);
    const activeRun = this.getAgentRun(normalizedRunId);
    if (activeRun) {
      return activeRun;
    }
    try {
      const restored = await this.restoreAgentRun(normalizedRunId);
      return restored.run;
    } catch {
      return null;
    }
  }

  async observeAgentRunLifecycle(
    runId: string,
    listener: (event: ObservedRunLifecycleEvent) => void,
  ): Promise<(() => void) | null> {
    const run = await this.resolveAgentRun(runId);
    if (!run) {
      return null;
    }

    listener({
      runtimeSubject: "AGENT_RUN",
      runId: run.runId,
      phase: "ATTACHED",
      occurredAt: new Date().toISOString(),
    });

    let terminalPhase: ObservedRunLifecycleEvent["phase"] | null = null;
    const failureObserver = new AgentRunCanonicalFailureObserver();
    const unsubscribe = run.subscribeToEvents((event) => {
      if (!isAgentRunEvent(event)) {
        return;
      }
      if (terminalPhase) {
        return;
      }
      const failure = failureObserver.observe(event);
      if (!failure) return;
      terminalPhase = "FAILED";
      listener({
        runtimeSubject: "AGENT_RUN",
        runId: run.runId,
        phase: "FAILED",
        occurredAt: new Date().toISOString(),
        errorMessage: failure.message,
      });
    });

    const inactivePollHandle = setInterval(() => {
      if (terminalPhase || run.isActive()) {
        return;
      }
      terminalPhase = "TERMINATED";
      listener({
        runtimeSubject: "AGENT_RUN",
        runId: run.runId,
        phase: "TERMINATED",
        occurredAt: new Date().toISOString(),
      });
    }, 1_000);
    inactivePollHandle.unref?.();

    return () => {
      clearInterval(inactivePollHandle);
      unsubscribe();
    };
  }

  async createAgentRun(
    input: CreateAgentRunInput,
  ): Promise<CreateAgentRunResult> {
    const prepared = await this.provisioningService.prepareAgentRun(input);
    try {
      const activeRun = (await this.activate(prepared.runId)).run;
      return { runId: activeRun.runId };
    } catch (error) {
      // One call, all or nothing: a run whose activation failed is undone (a started run is refused and kept).
      const cancelled = await this.provisioningService.cancelPreparedAgentRun(prepared.runId)
        .catch((cancelError: unknown): CancelPreparedAgentRunResult => ({ success: false, message: String(cancelError) }));
      if (!cancelled.success) {
        logger.warn(`Run '${prepared.runId}' failed to activate and was kept: ${cancelled.message}`);
      }
      throw error;
    }
  }

  async prepareAgentRun(
    input: PrepareAgentRunInput,
  ): Promise<PrepareAgentRunResult> {
    return this.provisioningService.prepareAgentRun(input);
  }

  async activatePreparedRun(runId: string): Promise<AgentRun> {
    return (await this.activate(normalizeRequiredRunId(runId))).run;
  }

  /** The plain command path; an eligible run's commands go through its root (`StandaloneRunCommandPort`). */
  resolveCommandReadyAgentRun(runId: string): Promise<AgentRun> {
    return this.lifecycleService.resolveCommandReadyAgentRun(runId);
  }

  async cancelPreparedAgentRun(runId: string): Promise<CancelPreparedAgentRunResult> {
    return this.provisioningService.cancelPreparedAgentRun(runId);
  }

  removeEmptyNeverStartedRuns(): Promise<RemovedEmptyNeverStartedRun[]> {
    return this.provisioningService.removeEmptyNeverStartedRuns();
  }

  async hasRunIdentity(runId: string): Promise<boolean> {
    return this.provisioningService.hasRunIdentity(runId);
  }

  async getRunMetadata(runId: string): Promise<AgentRunMetadata | null> {
    return this.provisioningService.getRunMetadata(runId);
  }

  /**
   * DS-5 (contract T-1, `model.py` `stop`): a closed Task's run stops as for the user's Stop, and its row records the
   * stop also when it was not running. `stillClosed` is asked where the run's gate closes (CR-461-001): a reopen or a new
   * assignment committed while the stop waited keeps the run (`kept_open`), with nothing stopped or recorded.
   */
  async stopForTaskClosure(runId: string, stillClosed: () => boolean): Promise<"stopped" | "kept_open" | "not_stopped"> {
    const stopped = await this.standaloneRuns.stopRootForTaskClosure(runId, stillClosed);
    if (stopped === "kept_open") return "kept_open";
    if (stopped?.agent.outcome === "rejected") return "not_stopped";
    if (!stopped) {
      if (!stillClosed()) return "kept_open";
      if (this.agentRunManager.getActiveRun(runId) && !(await this.agentRunManager.terminateAgentRun(runId))) return "not_stopped";
    }
    if (!(await this.historyCatalogService.getCatalogRow(runId))?.terminatedAt) await this.historyCatalogService.recordRunTerminated({ runId });
    return "stopped";
  }

  /** The run collaborates (contract §3.3, §3.5): its own address is fixed, once, and its history row says so. */
  async recordCollaborating(runId: string, address: AgentTeamAddress): Promise<void> {
    const metadata = await this.metadataService.readMetadata(runId);
    if (metadata && !metadata.address) await this.metadataService.writeMetadata(runId, { ...metadata, address });
    await this.historyCatalogService.recordCollaborationPackageCreated({ runId });
  }

  async recordRunActivity(
    run: AgentRun,
    input: {
      summary?: string | null;
    } = {},
  ): Promise<void> {
    await this.recordRunTitle(run.runId, input.summary ?? "");
  }

  /**
   * The run's title from a message it accepted (autobyteus-269): the catalog keeps the first non-empty one, so only
   * the run's first message sets it, whoever sends it (the owner in the window, or a peer's work packet).
   */
  async recordRunTitle(runId: string, content: string): Promise<void> {
    await this.historyCatalogService.recordRunSummary({ runId, summary: content });
  }

  /** The run's title as its history row shows it (autobyteus-278: a peer reads it for a run it started). */
  async readRunTitle(runId: string): Promise<string | null> {
    return (await this.historyCatalogService.getCatalogRow(runId))?.summary || null;
  }

  async restoreAgentRun(runId: string): Promise<RestoreAgentRunResult> {
    return this.activate(normalizeRequiredRunId(runId));
  }

  /** An eligible run is activated by its root (with its agent's member context); any other run directly. */
  private async activate(runId: string): Promise<StandaloneAgentRunActivationResult> {
    const owned = await this.standaloneRuns.resolveRootAndEnsureAgent(runId);
    return owned ?? this.lifecycleService.activateRunAgent(runId, { memberExecutionContext: null });
  }

  /** Saves a stopped run's selection; a registered root of the run then follows it (FU-008), and a failed follow never fails the saved edit. */
  /** The ordinary stopped-run Save checked without writing (SR-039: a delegator's Settings checks every run first). */
  checkStoppedSelection(input: StoppedRunSelectionInput): Promise<RunModelConfigUpdateResult<AgentRunMetadata | null> | null> {
    return this.lifecycleService.checkStoppedSelection(input);
  }

  async updateStoppedSelection(input: StoppedRunSelectionInput): Promise<RunModelConfigUpdateResult<AgentRunMetadata | null>> {
    const result = await this.lifecycleService.updateStoppedSelection(input);
    if (result.outcome === "UPDATED") {
      await this.standaloneRuns.refreshInheritedLaunch(normalizeRequiredRunId(input.agentRunId)).catch((error) => {
        logger.warn(`Run '${input.agentRunId}' saved its selection but its root could not follow it: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
    return result;
  }

  private notFound(runtimeKind: RuntimeKind | null): AgentRunTerminationResult {
    return {
      success: false,
      message: "Agent run not found.",
      route: "not_found",
      runtimeKind,
    };
  }

}

const logger = console;

const normalizeRequiredRunId = (runId: string): string => {
  const normalized = runId.trim();
  if (!normalized) {
    throw new Error("runId is required.");
  }
  return normalized;
};

let cachedAgentRunService: AgentRunService | null = null;

export const bindProcessAgentRunService = (service: AgentRunService): void => {
  if (!service) {
    throw new Error("A process AgentRunService instance is required.");
  }
  if (cachedAgentRunService) {
    throw new Error("The process AgentRunService is already initialized.");
  }
  cachedAgentRunService = service;
};

export const releaseProcessAgentRunService = (service: AgentRunService): void => {
  if (cachedAgentRunService === service) {
    cachedAgentRunService = null;
  }
};

export const getAgentRunService = (): AgentRunService => {
  if (!cachedAgentRunService) {
    throw new Error("The process AgentRunService is not initialized.");
  }
  return cachedAgentRunService;
};
