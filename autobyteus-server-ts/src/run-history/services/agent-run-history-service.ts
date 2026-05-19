import fsPromises from "node:fs/promises";
import path from "node:path";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import {
  AgentRunStatusProjectionService,
} from "../../agent-execution/services/agent-run-status-projection-service.js";
import { MemoryFileStore } from "../../agent-memory/store/memory-file-store.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  RunHistoryAgentGroup,
  RunHistoryIndexRow,
  RunHistoryWorkspaceGroup,
  RunKnownStatus,
} from "../domain/agent-run-history-index-types.js";
import {
  canonicalizeWorkspaceRootPath,
  workspaceDisplayNameFromRootPath,
} from "../utils/workspace-path-normalizer.js";
import {
  AgentRunHistoryIndexService,
  getAgentRunHistoryIndexService,
} from "./agent-run-history-index-service.js";
import { AgentRunMetadataStore } from "../store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";
import {
  AgentRunViewProjectionService,
  type RunProjection,
} from "./agent-run-view-projection-service.js";
import { compactSummary } from "./run-history-service-helpers.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export interface DeleteStoredRunResult {
  success: boolean;
  message: string;
}

export interface ArchiveStoredRunResult {
  success: boolean;
  message: string;
}

export class AgentRunHistoryService {
  private readonly indexService: AgentRunHistoryIndexService;
  private readonly memoryStore: MemoryFileStore;
  private readonly agentRunManager: AgentRunManager;
  private readonly metadataStore: AgentRunMetadataStore;
  private readonly agentRunViewProjectionService: AgentRunViewProjectionService;
  private readonly statusProjectionService: AgentRunStatusProjectionService;

  constructor(
    memoryDir: string,
    dependencies: {
      indexService?: AgentRunHistoryIndexService;
      metadataStore?: AgentRunMetadataStore;
      agentRunViewProjectionService?: AgentRunViewProjectionService;
      statusProjectionService?: AgentRunStatusProjectionService;
    } = {},
  ) {
    this.indexService =
      dependencies.indexService ?? getAgentRunHistoryIndexService();
    this.memoryStore = new MemoryFileStore(memoryDir);
    this.agentRunManager = AgentRunManager.getInstance();
    this.metadataStore =
      dependencies.metadataStore ?? new AgentRunMetadataStore(memoryDir);
    this.agentRunViewProjectionService =
      dependencies.agentRunViewProjectionService ??
      new AgentRunViewProjectionService(memoryDir);
    this.statusProjectionService =
      dependencies.statusProjectionService ??
      new AgentRunStatusProjectionService({
        agentRunManager: this.agentRunManager,
        metadataService: {
          readMetadata: (runId: string) => this.metadataStore.readMetadata(runId),
        },
      });
  }

  async listRunHistory(limitPerAgent = 6): Promise<RunHistoryWorkspaceGroup[]> {
    let rows = await this.indexService.listRows();
    if (rows.length === 0) {
      rows = await this.indexService.rebuildIndexFromDisk();
    }

    const staleRunIds: string[] = [];
    const normalizedRows = (
      await Promise.all(
        rows.map(async (row) => {
          const metadata = await this.metadataStore.readMetadata(row.runId);
          if (!metadata) {
            staleRunIds.push(row.runId);
            return null;
          }
          const projection = await this.statusProjectionService.getRunStatusProjection(row.runId);
          if (metadata.archivedAt && !projection.isActive) {
            return null;
          }
          const summary = await this.resolveSummary(row, metadata, projection.isActive);
          return {
            ...row,
            workspaceRootPath: canonicalizeWorkspaceRootPath(row.workspaceRootPath),
            summary,
            projection,
          };
        }),
      )
    ).filter((row): row is RunHistoryIndexRow & {
      projection: Awaited<ReturnType<AgentRunStatusProjectionService["getRunStatusProjection"]>>;
    } => row !== null);

    if (staleRunIds.length > 0) {
      await Promise.all(staleRunIds.map((runId) => this.indexService.removeRow(runId)));
    }

    const workspaceMap = new Map<string, Map<string, RunHistoryAgentGroup>>();
    for (const row of normalizedRows) {
      const isActive = row.projection.isActive;
      const runStatus: RunKnownStatus = row.projection.lastKnownStatus;
      const status = row.projection.status;
      let agentMap = workspaceMap.get(row.workspaceRootPath);
      if (!agentMap) {
        agentMap = new Map<string, RunHistoryAgentGroup>();
        workspaceMap.set(row.workspaceRootPath, agentMap);
      }
      let agentGroup = agentMap.get(row.agentDefinitionId);
      if (!agentGroup) {
        agentGroup = {
          agentDefinitionId: row.agentDefinitionId,
          agentName: row.agentName,
          runs: [],
        };
        agentMap.set(row.agentDefinitionId, agentGroup);
      }
      agentGroup.runs.push({
        runId: row.runId,
        summary: row.summary,
        lastActivityAt: row.lastActivityAt,
        status,
        lastKnownStatus: runStatus,
        isActive,
        shouldConnectStream: row.projection.shouldConnectStream,
        statusSource: row.projection.statusSource,
      });
    }

    const workspaceGroups: RunHistoryWorkspaceGroup[] = [];
    for (const [workspaceRootPath, agentMap] of workspaceMap.entries()) {
      const agents = Array.from(agentMap.values())
        .map((group) => ({
          ...group,
          runs: group.runs
            .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
            .slice(0, Math.max(limitPerAgent, 1)),
        }))
        .sort((a, b) => a.agentName.localeCompare(b.agentName));
      workspaceGroups.push({
        workspaceRootPath,
        workspaceName: workspaceDisplayNameFromRootPath(workspaceRootPath),
        agents,
      });
    }

    workspaceGroups.sort((a, b) => a.workspaceName.localeCompare(b.workspaceName));
    return workspaceGroups;
  }

  async archiveStoredRun(runId: string): Promise<ArchiveStoredRunResult> {
    const normalizedRunId = this.resolveSafeArchiveRunId(runId);
    if (!normalizedRunId) {
      return {
        success: false,
        message: "Invalid run ID path.",
      };
    }

    if (this.agentRunManager.hasActiveRun(normalizedRunId)) {
      return {
        success: false,
        message: "Run is active. Terminate it before archiving history.",
      };
    }

    try {
      const metadata = await this.metadataStore.readMetadata(normalizedRunId);
      if (!metadata) {
        return {
          success: false,
          message: `Run metadata not found for '${normalizedRunId}'.`,
        };
      }

      const archivedAt = metadata.archivedAt ?? new Date().toISOString();
      await this.metadataStore.writeMetadata(normalizedRunId, {
        ...metadata,
        archivedAt,
      });

      return {
        success: true,
        message: `Run '${normalizedRunId}' archived.`,
      };
    } catch (error) {
      logger.warn(`Failed to archive stored run '${normalizedRunId}': ${String(error)}`);
      return {
        success: false,
        message: `Failed to archive stored run '${normalizedRunId}'.`,
      };
    }
  }

  async deleteStoredRun(runId: string): Promise<DeleteStoredRunResult> {
    const normalizedRunId = runId.trim();
    if (!normalizedRunId) {
      return {
        success: false,
        message: "Run ID is required.",
      };
    }

    if (this.agentRunManager.hasActiveRun(normalizedRunId)) {
      return {
        success: false,
        message: "Run is active. Terminate it before deleting history.",
      };
    }

    const safeTarget = this.resolveSafeRunDirectory(normalizedRunId);
    if (!safeTarget) {
      return {
        success: false,
        message: "Invalid run ID path.",
      };
    }

    try {
      await fsPromises.rm(safeTarget, { recursive: true, force: true });
      await this.indexService.removeRow(normalizedRunId);
      return {
        success: true,
        message: `Run '${normalizedRunId}' deleted permanently.`,
      };
    } catch (error) {
      logger.warn(`Failed to delete stored run '${normalizedRunId}': ${String(error)}`);
      return {
        success: false,
        message: `Failed to delete stored run '${normalizedRunId}'.`,
      };
    }
  }

  private resolveSafeRunDirectory(runId: string): string | null {
    const agentsRoot = path.resolve(this.memoryStore.getRunDir(""));
    const targetPath = path.resolve(this.memoryStore.getRunDir(runId));

    if (targetPath === agentsRoot) {
      return null;
    }

    const targetWithinAgentsRoot =
      targetPath === agentsRoot ||
      targetPath.startsWith(`${agentsRoot}${path.sep}`);
    if (!targetWithinAgentsRoot) {
      return null;
    }

    return targetPath;
  }

  private resolveSafeArchiveRunId(runId: string): string | null {
    const normalizedRunId = runId.trim();
    if (!this.isSafeArchiveIdentity(normalizedRunId, "temp-")) {
      return null;
    }

    const agentsRoot = path.resolve(this.memoryStore.getRunDir(""));
    const targetDir = path.resolve(agentsRoot, normalizedRunId);
    const metadataPath = path.resolve(targetDir, "run_metadata.json");
    if (!this.isStrictlyInsideRoot(targetDir, agentsRoot)) {
      return null;
    }
    if (!this.isStrictlyInsideRoot(metadataPath, agentsRoot)) {
      return null;
    }
    return normalizedRunId;
  }

  private isSafeArchiveIdentity(value: string, draftPrefix: string): boolean {
    if (!value || value.startsWith(draftPrefix)) {
      return false;
    }
    if (path.isAbsolute(value) || path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) {
      return false;
    }
    if (/[\\/]/.test(value)) {
      return false;
    }
    const segments = value.split(/[\\/]+/);
    return !segments.some((segment) => segment === "." || segment === "..");
  }

  private isStrictlyInsideRoot(candidatePath: string, rootPath: string): boolean {
    const resolvedRoot = path.resolve(rootPath);
    const resolvedCandidate = path.resolve(candidatePath);
    return resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`);
  }

  private async resolveSummary(
    row: RunHistoryIndexRow,
    metadata: AgentRunMetadata,
    isActive: boolean,
  ): Promise<string> {
    const existing = compactSummary(row.summary);
    if (existing && !isActive) {
      return existing;
    }

    const projection = await this.tryGetProjection(row.runId, metadata);
    if (!projection?.summary) {
      return existing;
    }

    const recovered = compactSummary(projection.summary);
    if (!recovered) {
      return existing;
    }

    const shouldRepairMissingSummary = !existing;
    // Preserve intentional synthetic titles (for example compaction task labels)
    // unless the stored value is clearly one of the later user-message summaries.
    const shouldRepairActiveLatestUserSummary =
      isActive && this.matchesLaterUserSummary(existing, projection);
    if (!shouldRepairMissingSummary && !shouldRepairActiveLatestUserSummary) {
      return existing;
    }

    await this.indexService.recordRecoveredSummary({
      runId: row.runId,
      summary: recovered,
    }).catch((error) => {
      logger.warn(
        `Failed to repair run history summary for '${row.runId}': ${String(error)}`,
      );
    });
    return recovered;
  }

  private async tryGetProjection(
    runId: string,
    metadata: AgentRunMetadata,
  ): Promise<RunProjection | null> {
    try {
      return await this.agentRunViewProjectionService.getProjectionFromMetadata({
        runId,
        metadata,
      });
    } catch (error) {
      logger.warn(
        `Failed to resolve run projection for history summary recovery '${runId}': ${String(error)}`,
      );
      return null;
    }
  }

  private matchesLaterUserSummary(
    existing: string,
    projection: RunProjection,
  ): boolean {
    if (!existing || existing === compactSummary(projection.summary)) {
      return false;
    }

    const userSummaries = projection.conversation
      .filter((entry) => entry.role === "user")
      .map((entry) => compactSummary(entry.content ?? null))
      .filter((summary) => summary.length > 0);
    return userSummaries.slice(1).includes(existing);
  }
}

let cachedAgentRunHistoryService: AgentRunHistoryService | null = null;

export const getAgentRunHistoryService = (): AgentRunHistoryService => {
  if (!cachedAgentRunHistoryService) {
    cachedAgentRunHistoryService = new AgentRunHistoryService(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedAgentRunHistoryService;
};
