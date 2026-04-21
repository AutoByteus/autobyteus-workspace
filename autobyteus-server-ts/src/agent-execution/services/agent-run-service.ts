import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  SkillAccessMode,
  resolveSkillAccessMode,
} from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../domain/agent-run-config.js";
import { AgentRunContext, type RuntimeAgentRunContext } from "../domain/agent-run-context.js";
import type { AgentRun } from "../domain/agent-run.js";
import { AgentRunManager } from "./agent-run-manager.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  RuntimeKind,
  runtimeKindFromString,
} from "../../runtime-management/runtime-kind-enum.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import {
  type AgentRunMetadata,
} from "../../run-history/store/agent-run-metadata-types.js";
import { canonicalizeWorkspaceRootPath } from "../../run-history/utils/workspace-path-normalizer.js";
import {
  AgentRunMetadataService,
} from "../../run-history/services/agent-run-metadata-service.js";
import {
  AgentRunHistoryIndexService,
  getAgentRunHistoryIndexService,
} from "../../run-history/services/agent-run-history-index-service.js";
import type { RunKnownStatus } from "../../run-history/domain/agent-run-history-index-types.js";
import { AgentRunMemoryLayout } from "../../agent-memory/store/agent-run-memory-layout.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { generateStandaloneAgentRunId } from "../../run-history/utils/agent-run-id-utils.js";
import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import type { ObservedRunLifecycleEvent } from "../../runtime-management/domain/observed-run-lifecycle-event.js";
import { AgentRunEventType, isAgentRunEvent } from "../domain/agent-run-event.js";

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

export interface RestoreAgentRunResult {
  run: AgentRun;
  metadata: AgentRunMetadata;
}

export type AgentRunTerminationRoute = "native" | "runtime" | "not_found";

export interface AgentRunTerminationResult {
  success: boolean;
  message: string;
  route: AgentRunTerminationRoute;
  runtimeKind: RuntimeKind | null;
}

const hasNonEmptyString = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

export class AgentRunService {
  private agentRunManager: AgentRunManager;
  private metadataService: AgentRunMetadataService;
  private historyIndexService: AgentRunHistoryIndexService;
  private workspaceManager = getWorkspaceManager();
  private readonly memoryLayout: AgentRunMemoryLayout;
  private readonly agentDefinitionService: AgentDefinitionService;

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
    this.memoryLayout = new AgentRunMemoryLayout(memoryDir);
    this.agentRunManager = deps.agentRunManager ?? AgentRunManager.getInstance();
    this.metadataService =
      deps.metadataService ?? new AgentRunMetadataService(memoryDir);
    this.historyIndexService =
      deps.historyIndexService ?? getAgentRunHistoryIndexService();
    this.workspaceManager = deps.workspaceManager ?? getWorkspaceManager();
    this.agentDefinitionService =
      deps.agentDefinitionService ?? AgentDefinitionService.getInstance();
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
    if (!hasNonEmptyString(input.agentDefinitionId)) {
      throw new Error("agentDefinitionId is required when creating a new run.");
    }
    if (!hasNonEmptyString(input.workspaceRootPath)) {
      throw new Error("workspaceRootPath is required when creating a new run.");
    }
    if (!hasNonEmptyString(input.llmModelIdentifier)) {
      throw new Error("llmModelIdentifier is required when creating a new run.");
    }
    if (!hasNonEmptyString(input.runtimeKind)) {
      throw new Error("runtimeKind is required when creating a new run.");
    }

    let workspaceId = input.workspaceId?.trim() || null;
    const workspaceRootPath = canonicalizeWorkspaceRootPath(input.workspaceRootPath.trim());
    const workspace = await this.workspaceManager.ensureWorkspaceByRootPath(workspaceRootPath);
    workspaceId = workspace.workspaceId;

    const runtimeKind = runtimeKindFromString(input.runtimeKind);
    if (!runtimeKind) {
      throw new Error(`runtimeKind '${input.runtimeKind}' is not supported.`);
    }
    const skillAccessMode = resolveSkillAccessMode(input.skillAccessMode, 0);
    const preparedRun = await this.prepareFreshRun({
      agentDefinitionId: input.agentDefinitionId.trim(),
      runtimeKind,
      workspaceId,
      llmModelIdentifier: input.llmModelIdentifier.trim(),
      autoExecuteTools: input.autoExecuteTools,
      llmConfig: input.llmConfig ?? null,
      skillAccessMode,
      applicationExecutionContext: input.applicationExecutionContext ?? null,
    });
    const activeRun = await this.agentRunManager.createAgentRun(
      preparedRun.config,
      preparedRun.runId,
    );
    const runId = activeRun.runId;

    const resolvedWorkspaceRootPath = this.resolveWorkspaceRootPath({
      workspaceRootPath,
      workspaceId,
    });

    const preparedMemoryDir = preparedRun.config.memoryDir;
    if (!preparedMemoryDir) {
      throw new Error("Fresh run preparation must provide a memoryDir.");
    }

    const metadata: AgentRunMetadata = {
      runId,
      agentDefinitionId: input.agentDefinitionId.trim(),
      workspaceRootPath: resolvedWorkspaceRootPath,
      memoryDir: activeRun.config.memoryDir ?? preparedMemoryDir,
      llmModelIdentifier: input.llmModelIdentifier.trim(),
      llmConfig: input.llmConfig ?? null,
      autoExecuteTools: input.autoExecuteTools,
      skillAccessMode,
      runtimeKind: activeRun.runtimeKind,
      platformAgentRunId: activeRun.getPlatformAgentRunId(),
      lastKnownStatus: "IDLE",
      applicationExecutionContext: input.applicationExecutionContext ?? null,
    };

    await this.metadataService.writeMetadata(runId, metadata);
    await this.historyIndexService.recordRunCreated({
      runId,
      metadata,
      summary: "",
      lastKnownStatus: "IDLE",
      lastActivityAt: new Date().toISOString(),
    });
    return { runId };
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

  private async prepareFreshRun(input: {
    agentDefinitionId: string;
    runtimeKind: RuntimeKind;
    workspaceId: string | null;
    llmModelIdentifier: string;
    autoExecuteTools: boolean;
    llmConfig: Record<string, unknown> | null;
    skillAccessMode: SkillAccessMode;
    applicationExecutionContext: ApplicationExecutionContext | null;
  }): Promise<{ runId: string; config: AgentRunConfig }> {
    const runId = await this.generateFreshRunId(input.runtimeKind, input.agentDefinitionId);
    const memoryDir = this.memoryLayout.getRunDirPath(runId);
    return {
      runId,
      config: new AgentRunConfig({
        runtimeKind: input.runtimeKind,
        agentDefinitionId: input.agentDefinitionId,
        llmModelIdentifier: input.llmModelIdentifier,
        autoExecuteTools: input.autoExecuteTools,
        workspaceId: input.workspaceId,
        memoryDir,
        llmConfig: input.llmConfig,
        skillAccessMode: input.skillAccessMode,
        applicationExecutionContext: input.applicationExecutionContext,
      }),
    };
  }

  private async generateFreshRunId(
    runtimeKind: RuntimeKind,
    agentDefinitionId: string,
  ): Promise<string> {
    if (runtimeKind !== RuntimeKind.AUTOBYTEUS) {
      return this.generateUniqueRunId(() => randomUUID());
    }

    const definition = await this.agentDefinitionService.getFreshAgentDefinitionById(
      agentDefinitionId,
    );
    if (!definition) {
      throw new Error(
        `AgentDefinition '${agentDefinitionId}' cannot be loaded for standalone AutoByteus run provisioning.`,
      );
    }

    return this.generateUniqueRunId(() =>
      generateStandaloneAgentRunId(definition.name, definition.role),
    );
  }

  private async generateUniqueRunId(generator: () => string): Promise<string> {
    for (let attempt = 0; attempt < 64; attempt += 1) {
      const candidate = generator().trim();
      if (!candidate) {
        continue;
      }
      if (await this.runIdExists(candidate)) {
        continue;
      }
      return candidate;
    }
    throw new Error("Unable to provision a unique run id.");
  }

  private async runIdExists(runId: string): Promise<boolean> {
    if (this.agentRunManager.hasActiveRun(runId)) {
      return true;
    }
    if (await this.metadataService.readMetadata(runId)) {
      return true;
    }
    try {
      await fs.access(this.memoryLayout.getRunDirPath(runId));
      return true;
    } catch {
      return false;
    }
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

  private resolveWorkspaceRootPath(options: {
    workspaceRootPath: string | null;
    workspaceId: string | null;
  }): string {
    if (options.workspaceRootPath) {
      return canonicalizeWorkspaceRootPath(options.workspaceRootPath);
    }
    if (options.workspaceId) {
      const workspace = this.workspaceManager.getWorkspaceById(options.workspaceId);
      const basePath = workspace?.getBasePath();
      if (basePath) {
        return canonicalizeWorkspaceRootPath(basePath);
      }
    }
    return canonicalizeWorkspaceRootPath(appConfigProvider.config.getTempWorkspaceDir());
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
