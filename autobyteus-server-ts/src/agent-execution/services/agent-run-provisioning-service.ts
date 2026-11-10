import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { AgentRunConfig } from "../domain/agent-run-config.js";
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
import { projectNewRunLlmConfig } from "../../llm-management/services/new-run-llm-config-projection.js";
import { AgentRunIdentityAllocator } from "./agent-run-identity-allocator.js";
import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import { getAgentRunCommandRegistry } from "./agent-run-command-registry.js";
import { recordRunProjectStart } from "../domain/run-project-context.js";
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
const RUN_METADATA_FILE_NAME = "run_metadata.json";

const logger = console;

export type RemovedEmptyNeverStartedRun = Readonly<{ runId: string; title: string }>;

/**
 * Whether a run folder holds nothing but its record: only directories and the top-level regular
 * `run_metadata.json`. Walks without following symbolic links (a symlink, socket or any other entry is
 * content). Throws when any part of the folder cannot be read, so the caller keeps the run.
 */
const holdsOnlyItsRecord = async (dir: string, top = true): Promise<boolean> => {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!(await holdsOnlyItsRecord(path.join(dir, entry.name), false))) return false;
      continue;
    }
    if (top && entry.isFile() && entry.name === RUN_METADATA_FILE_NAME) continue;
    return false;
  }
  return true;
};

export class AgentRunProvisioningService {
  private readonly memoryLayout: AgentMemoryLayout;
  private readonly agentRunManager: AgentRunManager;
  private readonly metadataService: AgentRunMetadataService;
  private readonly historyCatalogService: AgentRunHistoryCatalogService;
  private readonly workspaceManager: ReturnType<typeof getWorkspaceManager>;
  private readonly agentRunIdentityAllocator: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;

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
      deps.agentRunIdentityAllocator ?? new AgentRunIdentityAllocator();
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

    // The Project records the start with the allocated id before any run record (DS-001); an unknown Project is refused.
    if (preparedInput.projectId) await recordRunProjectStart(preparedInput.projectId, { kind: "agent", runId });
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
      runtimeKind: preparedInput.runtimeKind,
      platformAgentRunId: null,
      preparedAt: preparedAt.toISOString(),
      preparedExpiresAt: preparedExpiresAt.toISOString(),
      startedAt: null,
      applicationExecutionContext: preparedRun.config.applicationExecutionContext,
      ...(input.delegatedFrom ? { delegatedFrom: input.delegatedFrom } : {}),
      ...(input.systemRunOwner ? { systemRunOwner: input.systemRunOwner } : {}),
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

  /**
   * Startup removal of debris from failed or cut starts (autobyteus-349, REQ-002): a standalone run that
   * was prepared, never started, and whose folder holds nothing but its record. Any content, an
   * unreadable or missing record, or a folder that cannot be fully read keeps the run. Never throws.
   */
  async removeEmptyNeverStartedRuns(): Promise<RemovedEmptyNeverStartedRun[]> {
    const removed: RemovedEmptyNeverStartedRun[] = [];
    const rootDir = this.memoryLayout.getStandaloneRootDirPath();
    let entries: Dirent[];
    try {
      entries = await fs.readdir(rootDir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
        logger.warn(`Empty never-started run removal skipped: '${rootDir}' could not be read: ${String(error)}`);
      }
      return removed;
    }
    const withoutRecord: string[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const runId = entry.name;
      try {
        const record = await this.metadataService.readMetadataState(runId);
        if (record.kind === "missing") { withoutRecord.push(runId); continue; }
        if (record.kind === "unreadable") {
          logger.warn(`Kept run '${runId}': its record could not be read: ${record.error.message}`);
          continue;
        }
        const { metadata } = record;
        if (!metadata.preparedAt || metadata.startedAt) continue;
        try {
          if (!(await holdsOnlyItsRecord(this.memoryLayout.getStandaloneRunDirPath(runId)))) continue;
        } catch (error) {
          logger.warn(`Kept never-started run '${runId}': its folder could not be fully read: ${String(error)}`);
          continue;
        }
        if (this.agentRunManager.hasActiveRun(runId) || getAgentRunCommandRegistry().hasOutstandingCommands(runId)) continue;
        const title = (await this.historyCatalogService.getCatalogRow(runId))?.summary ?? "";
        const result = await this.cancelPreparedAgentRun(runId);
        if (!result.success) {
          logger.warn(`Kept empty never-started run '${runId}': ${result.message}`);
          continue;
        }
        logger.info(`Removed empty never-started run '${runId}' ('${title}')`);
        removed.push({ runId, title });
      } catch (error) {
        logger.warn(`Kept run '${runId}': empty never-started check failed: ${String(error)}`);
      }
    }
    if (withoutRecord.length) {
      logger.info(`Empty never-started run removal skipped ${withoutRecord.length} folder(s) without a standalone run record`);
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
    applicationBinding: CreateAgentRunInput["applicationBinding"];
    projectId: string | undefined;
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

    const projectId = input.projectId?.trim() || undefined;
    const workspaceRootPath = canonicalizeWorkspaceRootPath(input.workspaceRootPath.trim());
    const workspace = await this.workspaceManager.ensureWorkspaceByRootPath(workspaceRootPath);
    const runtimeKind = runtimeKindFromString(input.runtimeKind);
    if (!runtimeKind) {
      throw new Error(`runtimeKind '${input.runtimeKind}' is not supported.`);
    }

    const llmModelIdentifier = input.llmModelIdentifier.trim();
    return {
      agentDefinitionId: input.agentDefinitionId.trim(),
      runtimeKind,
      workspaceId: workspace.workspaceId,
      workspaceRootPath: this.resolveWorkspaceRootPath({
        workspaceRootPath,
        workspaceId: workspace.workspaceId,
      }),
      llmModelIdentifier,
      autoExecuteTools: input.autoExecuteTools,
      // A new run stores and launches only declared settings (undeclared keys are dropped silently).
      llmConfig: await projectNewRunLlmConfig({ runtimeKind, llmModelIdentifier, llmConfig: input.llmConfig }),
      applicationBinding: input.applicationBinding ?? null,
      projectId,
    };
  }

  private async prepareFreshRun(input: {
    agentDefinitionId: string;
    runtimeKind: RuntimeKind;
    workspaceId: string | null;
    llmModelIdentifier: string;
    autoExecuteTools: boolean;
    llmConfig: Record<string, unknown> | null;
    applicationBinding: CreateAgentRunInput["applicationBinding"];
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
        applicationExecutionContext: input.applicationBinding
          ? createApplicationExecutionContext(input.applicationBinding, runId)
          : null,
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

const createApplicationExecutionContext = (
  binding: NonNullable<CreateAgentRunInput["applicationBinding"]>,
  agentRunId: string,
): ApplicationExecutionContext => Object.freeze({
  applicationId: normalizeRequiredRunId(binding.applicationId),
  bindingId: normalizeRequiredRunId(binding.bindingId),
  producer: Object.freeze({
    agentRunId,
    displayName: binding.displayName?.trim() || null,
  }),
});
