import fs from "node:fs/promises";
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
  AgentRunHistoryCatalogService,
} from "../../run-history/services/agent-run-history-catalog-service.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { AgentRunIdentityAllocator } from "./agent-run-identity-allocator.js";
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
  private readonly memoryLayout: AgentMemoryLayout;
  private readonly agentRunManager: AgentRunManager;
  private readonly metadataService: AgentRunMetadataService;
  private readonly historyCatalogService: AgentRunHistoryCatalogService;
  private readonly workspaceManager: ReturnType<typeof getWorkspaceManager>;
  private readonly agentRunIdentityAllocator: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
  private readonly activationLocks = new Map<string, Promise<AgentRun>>();

  constructor(
    memoryDir: string,
    deps: {
      agentRunManager?: AgentRunManager;
      metadataService?: AgentRunMetadataService;
      historyCatalogService?: AgentRunHistoryCatalogService;
      workspaceManager?: ReturnType<typeof getWorkspaceManager>;
      agentRunIdentityAllocator?: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
    } = {},
  ) {
    this.memoryLayout = new AgentMemoryLayout(memoryDir);
    this.agentRunManager = deps.agentRunManager ?? AgentRunManager.getInstance();
    this.metadataService =
      deps.metadataService ?? new AgentRunMetadataService(memoryDir);
    this.historyCatalogService =
      deps.historyCatalogService ?? new AgentRunHistoryCatalogService(memoryDir);
    this.workspaceManager = deps.workspaceManager ?? getWorkspaceManager();
    this.agentRunIdentityAllocator =
      deps.agentRunIdentityAllocator ?? new AgentRunIdentityAllocator({
        agentRunManager: this.agentRunManager,
        agentRunMetadataService: this.metadataService,
        memoryDir,
      });
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
      preparedAt: preparedAt.toISOString(),
      preparedExpiresAt: preparedExpiresAt.toISOString(),
      startedAt: null,
      applicationExecutionContext: preparedInput.applicationExecutionContext,
    };

    await this.historyCatalogService.recordPreparedRun({
      runId,
      metadata,
      summary: input.initialSummary ?? "",
      createdAt: preparedAt.toISOString(),
    });
    return {
      runId,
      activationState: "PREPARED",
      preparedExpiresAt: preparedExpiresAt.toISOString(),
    };
  }

  async activatePreparedRun(runId: string): Promise<AgentRun> {
    const normalizedRunId = normalizeRequiredRunId(runId);
    const existingLock = this.activationLocks.get(normalizedRunId);
    if (existingLock) {
      return existingLock;
    }
    const lock = this.activatePreparedRunUnlocked(normalizedRunId);
    this.activationLocks.set(normalizedRunId, lock);
    try {
      return await lock;
    } finally {
      if (this.activationLocks.get(normalizedRunId) === lock) {
        this.activationLocks.delete(normalizedRunId);
      }
    }
  }

  private async activatePreparedRunUnlocked(normalizedRunId: string): Promise<AgentRun> {
    const activeRun = this.agentRunManager.getActiveRun(normalizedRunId);
    if (activeRun) {
      throw new Error(`Run '${normalizedRunId}' is already active and cannot be prepared-activated again.`);
    }

    const metadata = await this.metadataService.readMetadata(normalizedRunId);
    if (!metadata) {
      throw new Error(`Run '${normalizedRunId}' cannot be activated because metadata is missing.`);
    }
    if (!metadata.preparedAt || metadata.startedAt) {
      throw new Error(`Run '${normalizedRunId}' is not in a prepared activation state.`);
    }

    const workspace = await this.workspaceManager.ensureWorkspaceByRootPath(
      metadata.workspaceRootPath,
    );
    const createdRun = await this.agentRunManager.createAgentRun(
      new AgentRunConfig({
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
      normalizedRunId,
    );

    const activatedMetadata = await this.historyCatalogService.recordRunStarted({
      runId: normalizedRunId,
      runtimeKind: createdRun.runtimeKind,
      platformAgentRunId: createdRun.getPlatformAgentRunId(),
      startedAt: new Date().toISOString(),
    });
    if (!activatedMetadata) {
      throw new Error(`Run '${normalizedRunId}' cannot be activated because metadata disappeared.`);
    }
    return createdRun;
  }

  async cancelPreparedAgentRun(runId: string): Promise<CancelPreparedAgentRunResult> {
    const normalizedRunId = normalizeRequiredRunId(runId);
    if (getAgentRunCommandRegistry().hasOutstandingCommands(normalizedRunId)) {
      return {
        success: false,
        message: "Prepared run has a command in progress.",
      };
    }
    return this.historyCatalogService.cancelPreparedRun(normalizedRunId);
  }

  async cleanupStalePreparedRuns(now: Date = new Date()): Promise<number> {
    let removed = 0;
    let entries: string[] = [];
    try {
      entries = await fs.readdir(this.memoryLayout.getStandaloneRootDirPath());
    } catch {
      return 0;
    }

    for (const runId of entries) {
      const metadata = await this.metadataService.readMetadata(runId);
      if (!metadata || !metadata.preparedAt || metadata.startedAt) {
        continue;
      }
      if (this.agentRunManager.hasActiveRun(runId) || getAgentRunCommandRegistry().hasOutstandingCommands(runId)) {
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
    const runId = await this.agentRunIdentityAllocator.allocateForAgentDefinition(input.agentDefinitionId);
    const memoryDir = this.memoryLayout.getStandaloneRunDirPath(runId);
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
