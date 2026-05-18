import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  SkillAccessMode,
  resolveSkillAccessMode,
} from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../domain/agent-run-config.js";
import type { AgentRun } from "../domain/agent-run.js";
import { AgentRunManager } from "./agent-run-manager.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  RuntimeKind,
  runtimeKindFromString,
} from "../../runtime-management/runtime-kind-enum.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import type {
  AgentRunMetadata,
} from "../../run-history/store/agent-run-metadata-types.js";
import { canonicalizeWorkspaceRootPath } from "../../run-history/utils/workspace-path-normalizer.js";
import {
  AgentRunMetadataService,
} from "../../run-history/services/agent-run-metadata-service.js";
import {
  AgentRunHistoryIndexService,
  getAgentRunHistoryIndexService,
} from "../../run-history/services/agent-run-history-index-service.js";
import { AgentRunMemoryLayout } from "../../agent-memory/store/agent-run-memory-layout.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { generateStandaloneAgentRunId } from "../../run-history/utils/agent-run-id-utils.js";
import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import { getAgentRunCommandRegistry } from "./agent-run-command-registry.js";
import type {
  CancelPreparedAgentRunResult,
  CreateAgentRunInput,
  PrepareAgentRunInput,
  PrepareAgentRunResult,
} from "./agent-run-service.js";

const hasNonEmptyString = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

const normalizeRequiredRunId = (runId: string): string => {
  const normalized = runId.trim();
  if (!normalized) {
    throw new Error("runId is required.");
  }
  return normalized;
};

const PREPARED_RUN_TTL_MS = 24 * 60 * 60 * 1000;

export class AgentRunProvisioningService {
  private readonly memoryLayout: AgentRunMemoryLayout;
  private readonly agentRunManager: AgentRunManager;
  private readonly metadataService: AgentRunMetadataService;
  private readonly historyIndexService: AgentRunHistoryIndexService;
  private readonly workspaceManager: ReturnType<typeof getWorkspaceManager>;
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

  async prepareAgentRun(
    input: PrepareAgentRunInput,
  ): Promise<PrepareAgentRunResult> {
    const preparedInput = await this.validateAndPrepareRunInput(input, "preparing");
    const preparedRun = await this.prepareFreshRun(preparedInput);
    const runId = preparedRun.runId;
    const memoryDir = preparedRun.config.memoryDir;
    if (!memoryDir) {
      throw new Error("Fresh run preparation must provide a memoryDir.");
    }

    const preparedAt = new Date();
    const preparedExpiresAt = new Date(preparedAt.getTime() + PREPARED_RUN_TTL_MS);
    const metadata: AgentRunMetadata = {
      runId,
      agentDefinitionId: preparedInput.agentDefinitionId,
      workspaceRootPath: preparedInput.workspaceRootPath,
      memoryDir,
      llmModelIdentifier: preparedInput.llmModelIdentifier,
      llmConfig: preparedInput.llmConfig,
      autoExecuteTools: preparedInput.autoExecuteTools,
      skillAccessMode: preparedInput.skillAccessMode,
      runtimeKind: preparedInput.runtimeKind,
      platformAgentRunId: null,
      lastKnownStatus: "IDLE",
      activationState: "PREPARED",
      preparedAt: preparedAt.toISOString(),
      preparedExpiresAt: preparedExpiresAt.toISOString(),
      applicationExecutionContext: preparedInput.applicationExecutionContext,
    };

    await this.metadataService.writeMetadata(runId, metadata);
    await this.historyIndexService.recordRunCreated({
      runId,
      metadata,
      summary: input.initialSummary ?? "",
      lastKnownStatus: "IDLE",
      lastActivityAt: preparedAt.toISOString(),
    });
    return {
      runId,
      activationState: "PREPARED",
      preparedExpiresAt: preparedExpiresAt.toISOString(),
    };
  }

  async activatePreparedRun(runId: string): Promise<AgentRun> {
    const normalizedRunId = normalizeRequiredRunId(runId);
    const activeRun = this.agentRunManager.getActiveRun(normalizedRunId);
    if (activeRun) {
      throw new Error(`Run '${normalizedRunId}' is already active and cannot be prepared-activated again.`);
    }

    const metadata = await this.metadataService.readMetadata(normalizedRunId);
    if (!metadata) {
      throw new Error(`Run '${normalizedRunId}' cannot be activated because metadata is missing.`);
    }
    const activationState = metadata.activationState ?? "ACTIVATED";
    if (activationState !== "PREPARED" && activationState !== "ACTIVATION_FAILED") {
      throw new Error(`Run '${normalizedRunId}' is not in a prepared activation state.`);
    }

    const activatingMetadata: AgentRunMetadata = {
      ...metadata,
      activationState: "ACTIVATING",
    };
    await this.metadataService.writeMetadata(normalizedRunId, activatingMetadata);

    try {
      const workspace = await this.workspaceManager.ensureWorkspaceByRootPath(
        activatingMetadata.workspaceRootPath,
      );
      const createdRun = await this.agentRunManager.createAgentRun(
        new AgentRunConfig({
          runtimeKind: activatingMetadata.runtimeKind,
          agentDefinitionId: activatingMetadata.agentDefinitionId,
          llmModelIdentifier: activatingMetadata.llmModelIdentifier,
          autoExecuteTools: activatingMetadata.autoExecuteTools,
          workspaceId: workspace.workspaceId,
          memoryDir: activatingMetadata.memoryDir,
          llmConfig: activatingMetadata.llmConfig,
          skillAccessMode: activatingMetadata.skillAccessMode ?? SkillAccessMode.PRELOADED_ONLY,
          applicationExecutionContext: activatingMetadata.applicationExecutionContext ?? null,
        }),
        normalizedRunId,
      );

      const activatedMetadata: AgentRunMetadata = {
        ...activatingMetadata,
        runtimeKind: createdRun.runtimeKind,
        platformAgentRunId: createdRun.getPlatformAgentRunId(),
        lastKnownStatus: "ACTIVE",
        activationState: "ACTIVATED",
      };
      await this.metadataService.writeMetadata(normalizedRunId, activatedMetadata);
      await this.historyIndexService.recordRunRestored({
        runId: normalizedRunId,
        metadata: activatedMetadata,
        lastKnownStatus: "ACTIVE",
        lastActivityAt: new Date().toISOString(),
      });
      return createdRun;
    } catch (error) {
      const failedMetadata: AgentRunMetadata = {
        ...activatingMetadata,
        lastKnownStatus: "ERROR",
        activationState: "ACTIVATION_FAILED",
      };
      await this.metadataService.writeMetadata(normalizedRunId, failedMetadata);
      await this.historyIndexService.recordRunActivity({
        runId: normalizedRunId,
        metadata: failedMetadata,
        summary: "",
        lastKnownStatus: "ERROR",
        lastActivityAt: new Date().toISOString(),
      });
      throw error;
    }
  }

  async cancelPreparedAgentRun(runId: string): Promise<CancelPreparedAgentRunResult> {
    const normalizedRunId = normalizeRequiredRunId(runId);
    if (this.agentRunManager.hasActiveRun(normalizedRunId)) {
      return {
        success: false,
        message: "Prepared run already has an active runtime.",
      };
    }
    if (getAgentRunCommandRegistry().hasInFlightCommand(normalizedRunId)) {
      return {
        success: false,
        message: "Prepared run has a command in progress.",
      };
    }

    const metadata = await this.metadataService.readMetadata(normalizedRunId);
    if (!metadata) {
      return { success: true, message: "Prepared run already removed." };
    }
    if ((metadata.activationState ?? "ACTIVATED") !== "PREPARED") {
      return {
        success: false,
        message: "Only unactivated prepared runs can be cancelled.",
      };
    }

    await this.historyIndexService.removeRow(normalizedRunId);
    await fs.rm(metadata.memoryDir, { recursive: true, force: true });
    return { success: true, message: "Prepared run cancelled." };
  }

  async cleanupStalePreparedRuns(now: Date = new Date()): Promise<number> {
    let removed = 0;
    let entries: string[] = [];
    try {
      entries = await fs.readdir(this.memoryLayout.getRunsRootDirPath());
    } catch {
      return 0;
    }

    for (const runId of entries) {
      const metadata = await this.metadataService.readMetadata(runId);
      if (!metadata || (metadata.activationState ?? "ACTIVATED") !== "PREPARED") {
        continue;
      }
      if (this.agentRunManager.hasActiveRun(runId) || getAgentRunCommandRegistry().hasInFlightCommand(runId)) {
        continue;
      }
      const expiresAt = metadata.preparedExpiresAt ? Date.parse(metadata.preparedExpiresAt) : NaN;
      if (!Number.isFinite(expiresAt) || expiresAt > now.getTime()) {
        continue;
      }
      await this.cancelPreparedAgentRun(runId);
      removed += 1;
    }
    return removed;
  }

  async hasRunIdentity(runId: string): Promise<boolean> {
    const normalizedRunId = normalizeRequiredRunId(runId);
    return this.agentRunManager.hasActiveRun(normalizedRunId)
      || Boolean(await this.metadataService.readMetadata(normalizedRunId));
  }

  async getRunMetadata(runId: string): Promise<AgentRunMetadata | null> {
    return this.metadataService.readMetadata(normalizeRequiredRunId(runId));
  }

  private async validateAndPrepareRunInput(
    input: CreateAgentRunInput,
    action: string,
  ): Promise<{
    agentDefinitionId: string;
    runtimeKind: RuntimeKind;
    workspaceId: string | null;
    workspaceRootPath: string;
    llmModelIdentifier: string;
    autoExecuteTools: boolean;
    llmConfig: Record<string, unknown> | null;
    skillAccessMode: SkillAccessMode;
    applicationExecutionContext: ApplicationExecutionContext | null;
  }> {
    if (!hasNonEmptyString(input.agentDefinitionId)) {
      throw new Error(`agentDefinitionId is required when ${action} a run.`);
    }
    if (!hasNonEmptyString(input.workspaceRootPath)) {
      throw new Error(`workspaceRootPath is required when ${action} a run.`);
    }
    if (!hasNonEmptyString(input.llmModelIdentifier)) {
      throw new Error(`llmModelIdentifier is required when ${action} a run.`);
    }
    if (!hasNonEmptyString(input.runtimeKind)) {
      throw new Error(`runtimeKind is required when ${action} a run.`);
    }

    const workspaceRootPath = canonicalizeWorkspaceRootPath(input.workspaceRootPath.trim());
    const workspace = await this.workspaceManager.ensureWorkspaceByRootPath(workspaceRootPath);
    const runtimeKind = runtimeKindFromString(input.runtimeKind);
    if (!runtimeKind) {
      throw new Error(`runtimeKind '${input.runtimeKind}' is not supported.`);
    }

    return {
      agentDefinitionId: input.agentDefinitionId.trim(),
      runtimeKind,
      workspaceId: workspace.workspaceId,
      workspaceRootPath: this.resolveWorkspaceRootPath({
        workspaceRootPath,
        workspaceId: workspace.workspaceId,
      }),
      llmModelIdentifier: input.llmModelIdentifier.trim(),
      autoExecuteTools: input.autoExecuteTools,
      llmConfig: input.llmConfig ?? null,
      skillAccessMode: resolveSkillAccessMode(input.skillAccessMode, 0),
      applicationExecutionContext: input.applicationExecutionContext ?? null,
    };
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
}
