import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../domain/agent-run-config.js";
import { AgentRunContext, type RuntimeAgentRunContext } from "../domain/agent-run-context.js";
import type { AgentRun } from "../domain/agent-run.js";
import { AgentRunManager } from "./agent-run-manager.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import {
  type AgentRunMetadata,
} from "../../run-history/store/agent-run-metadata-types.js";
import {
  AgentRunMetadataService,
} from "../../run-history/services/agent-run-metadata-service.js";
import {
  AgentRunHistoryIndexService,
  getAgentRunHistoryIndexService,
} from "../../run-history/services/agent-run-history-index-service.js";
import type { RunKnownStatus } from "../../run-history/domain/agent-run-history-index-types.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import type { ObservedRunLifecycleEvent } from "../../runtime-management/domain/observed-run-lifecycle-event.js";
import { AgentRunEventType, isAgentRunEvent } from "../domain/agent-run-event.js";
import { AgentRunProvisioningService } from "./agent-run-provisioning-service.js";

export interface CreateAgentRunInput {
  agentDefinitionId: string;
  workspaceRootPath: string;
  workspaceId?: string | null;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  llmConfig?: Record<string, unknown> | null;
  skillAccessMode: SkillAccessMode;
  runtimeKind: string;
  applicationExecutionContext?: ApplicationExecutionContext | null;
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
  private historyIndexService: AgentRunHistoryIndexService;
  private workspaceManager = getWorkspaceManager();
  private readonly provisioningService: AgentRunProvisioningService;

  constructor(
    memoryDir: string,
    deps: {
      agentRunManager?: AgentRunManager;
      metadataService?: AgentRunMetadataService;
      historyIndexService?: AgentRunHistoryIndexService;
      workspaceManager?: ReturnType<typeof getWorkspaceManager>;
      agentDefinitionService?: AgentDefinitionService;
    } = {},
  ) {
    this.agentRunManager = deps.agentRunManager ?? AgentRunManager.getInstance();
    this.metadataService =
      deps.metadataService ?? new AgentRunMetadataService(memoryDir);
    this.historyIndexService =
      deps.historyIndexService ?? getAgentRunHistoryIndexService();
    this.workspaceManager = deps.workspaceManager ?? getWorkspaceManager();
    this.provisioningService = new AgentRunProvisioningService(memoryDir, {
      agentRunManager: this.agentRunManager,
      metadataService: this.metadataService,
      historyIndexService: this.historyIndexService,
      workspaceManager: this.workspaceManager,
      agentDefinitionService: deps.agentDefinitionService,
    });
  }

  async terminateAgentRun(runId: string): Promise<AgentRunTerminationResult> {
    const activeRun = this.agentRunManager.getActiveRun(runId);
    if (!activeRun) {
      return this.notFound(null);
    }

    const route: AgentRunTerminationRoute =
      activeRun.runtimeKind === RuntimeKind.AUTOBYTEUS ? "native" : "runtime";
    const result = await activeRun.terminate();
    if (!result.accepted) {
      return this.notFound(activeRun.runtimeKind);
    }

    const metadata = await this.metadataService.readMetadata(runId);
    if (metadata) {
      await this.metadataService.writeMetadata(runId, {
        ...metadata,
        platformAgentRunId: activeRun.getPlatformAgentRunId() ?? metadata.platformAgentRunId,
        lastKnownStatus: "TERMINATED",
      });
    }
    await this.historyIndexService.recordRunTerminated(runId);
    return {
      success: true,
      message: "Agent run terminated successfully.",
      route,
      runtimeKind: activeRun.runtimeKind,
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
    const unsubscribe = run.subscribeToEvents((event) => {
      if (!isAgentRunEvent(event)) {
        return;
      }
      if (terminalPhase) {
        return;
      }
      if (event.eventType !== AgentRunEventType.ERROR && event.statusHint !== "ERROR") {
        return;
      }
      terminalPhase = "FAILED";
      listener({
        runtimeSubject: "AGENT_RUN",
        runId: run.runId,
        phase: "FAILED",
        occurredAt: new Date().toISOString(),
        errorMessage:
          typeof event.payload.message === "string"
            ? event.payload.message
            : typeof event.payload.error === "string"
              ? event.payload.error
              : null,
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
    const activeRun = await this.provisioningService.activatePreparedRun(prepared.runId);
    return { runId: activeRun.runId };
  }

  async prepareAgentRun(
    input: PrepareAgentRunInput,
  ): Promise<PrepareAgentRunResult> {
    return this.provisioningService.prepareAgentRun(input);
  }

  async activatePreparedRun(runId: string): Promise<AgentRun> {
    return this.provisioningService.activatePreparedRun(runId);
  }

  async cancelPreparedAgentRun(runId: string): Promise<CancelPreparedAgentRunResult> {
    return this.provisioningService.cancelPreparedAgentRun(runId);
  }

  async cleanupStalePreparedRuns(now: Date = new Date()): Promise<number> {
    return this.provisioningService.cleanupStalePreparedRuns(now);
  }

  async hasRunIdentity(runId: string): Promise<boolean> {
    return this.provisioningService.hasRunIdentity(runId);
  }

  async getRunMetadata(runId: string): Promise<AgentRunMetadata | null> {
    return this.provisioningService.getRunMetadata(runId);
  }

  async recordRunActivity(
    run: AgentRun,
    input: {
      summary?: string | null;
      lastKnownStatus?: RunKnownStatus;
      lastActivityAt?: string;
    } = {},
  ): Promise<void> {
    const metadata = await this.metadataService.readMetadata(run.runId);
    const updatedMetadata = metadata
      ? {
          ...metadata,
          platformAgentRunId: run.getPlatformAgentRunId() ?? metadata.platformAgentRunId,
          lastKnownStatus: input.lastKnownStatus ?? "ACTIVE",
        }
      : null;
    if (updatedMetadata) {
      await this.metadataService.writeMetadata(run.runId, updatedMetadata);
    }
    await this.historyIndexService.recordRunActivity({
      runId: run.runId,
      metadata: updatedMetadata,
      summary: input.summary ?? "",
      lastKnownStatus: input.lastKnownStatus ?? "ACTIVE",
      lastActivityAt: input.lastActivityAt ?? new Date().toISOString(),
    });
  }

  async restoreAgentRun(runId: string): Promise<RestoreAgentRunResult> {
    const normalizedRunId = normalizeRequiredRunId(runId);
    const activeRun = this.agentRunManager.getActiveRun(normalizedRunId);
    if (activeRun) {
      throw new Error(
        `Run '${normalizedRunId}' is already active and does not need restore.`,
      );
    }

    const metadata = await this.metadataService.readMetadata(normalizedRunId);
    if (!metadata) {
      throw new Error(
        `Run '${normalizedRunId}' cannot be restored because metadata is missing.`,
      );
    }
    const activationState = metadata.activationState ?? "ACTIVATED";
    if (activationState !== "ACTIVATED") {
      throw new Error(
        `Run '${normalizedRunId}' cannot be restored because activationState is '${activationState}'.`,
      );
    }
    if (metadata.lastKnownStatus === "TERMINATED") {
      throw new Error(
        `Run '${normalizedRunId}' cannot be restored because it is terminated.`,
      );
    }

    const workspace = await this.workspaceManager.ensureWorkspaceByRootPath(
      metadata.workspaceRootPath,
    );
    const restoredRun = await this.agentRunManager.restoreAgentRun(
      new AgentRunContext({
        runId: normalizedRunId,
        config: new AgentRunConfig({
          runtimeKind: metadata.runtimeKind,
          agentDefinitionId: metadata.agentDefinitionId,
          llmModelIdentifier: metadata.llmModelIdentifier,
          autoExecuteTools: metadata.autoExecuteTools,
          workspaceId: workspace.workspaceId,
          memoryDir: metadata.memoryDir,
          llmConfig: metadata.llmConfig,
          skillAccessMode: metadata.skillAccessMode ?? SkillAccessMode.PRELOADED_ONLY,
          applicationExecutionContext: metadata.applicationExecutionContext ?? null,
        }),
        runtimeContext: this.buildRestoreRuntimeContext(metadata),
      }),
    );

    const persistedMetadata: AgentRunMetadata = {
      ...metadata,
      runId: normalizedRunId,
      runtimeKind: restoredRun.runtimeKind,
      platformAgentRunId:
        restoredRun.getPlatformAgentRunId() ?? metadata.platformAgentRunId,
      lastKnownStatus: "ACTIVE",
      activationState: "ACTIVATED",
    };
    await this.metadataService.writeMetadata(normalizedRunId, persistedMetadata);
    await this.historyIndexService.recordRunRestored({
      runId: normalizedRunId,
      metadata: persistedMetadata,
      lastKnownStatus: "ACTIVE",
      lastActivityAt: new Date().toISOString(),
    });

    return {
      run: restoredRun,
      metadata: persistedMetadata,
    };
  }

  private notFound(runtimeKind: RuntimeKind | null): AgentRunTerminationResult {
    return {
      success: false,
      message: "Agent run not found.",
      route: "not_found",
      runtimeKind,
    };
  }

  private buildRestoreRuntimeContext(metadata: AgentRunMetadata): RuntimeAgentRunContext {
    if (metadata.runtimeKind === RuntimeKind.CODEX_APP_SERVER) {
      return {
        threadId: metadata.platformAgentRunId,
        activeTurnId: null,
      } as RuntimeAgentRunContext;
    }
    if (metadata.runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK) {
      return {
        sessionId: metadata.platformAgentRunId,
        hasCompletedTurn: false,
        activeTurnId: null,
      } as RuntimeAgentRunContext;
    }
    return null;
  }
}

const normalizeRequiredRunId = (runId: string): string => {
  const normalized = runId.trim();
  if (!normalized) {
    throw new Error("runId is required.");
  }
  return normalized;
};

let cachedAgentRunService: AgentRunService | null = null;

export const getAgentRunService = (): AgentRunService => {
  if (!cachedAgentRunService) {
    cachedAgentRunService = new AgentRunService(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedAgentRunService;
};
