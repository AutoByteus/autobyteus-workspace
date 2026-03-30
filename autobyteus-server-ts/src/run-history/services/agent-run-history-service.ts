import fsPromises from "node:fs/promises";
import path from "node:path";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
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

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export interface DeleteStoredRunResult {
  success: boolean;
  message: string;
}

export class AgentRunHistoryService {
  private readonly indexService: AgentRunHistoryIndexService;
  private readonly memoryStore: MemoryFileStore;
  private readonly agentRunManager: AgentRunManager;
  private readonly metadataStore: AgentRunMetadataStore;

  constructor(
    memoryDir: string,
    dependencies: {
      indexService?: AgentRunHistoryIndexService;
      metadataStore?: AgentRunMetadataStore;
    } = {},
  ) {
    this.indexService =
      dependencies.indexService ?? getAgentRunHistoryIndexService();
    this.memoryStore = new MemoryFileStore(memoryDir);
    this.agentRunManager = AgentRunManager.getInstance();
    this.metadataStore =
      dependencies.metadataStore ?? new AgentRunMetadataStore(memoryDir);
  }

  async listRunHistory(limitPerAgent = 6): Promise<RunHistoryWorkspaceGroup[]> {
    let rows = await this.indexService.listRows();
    if (rows.length === 0) {
      rows = await this.indexService.rebuildIndexFromDisk();
    }

    const activeRunIds = new Set(this.agentRunManager.listActiveRuns());
    const staleRunIds: string[] = [];
    const normalizedRows = (
      await Promise.all(
        rows.map(async (row) => {
          const metadata = await this.metadataStore.readMetadata(row.runId);
          if (!metadata) {
            staleRunIds.push(row.runId);
            return null;
          }
          return {
            ...row,
            workspaceRootPath: canonicalizeWorkspaceRootPath(row.workspaceRootPath),
          };
        }),
      )
    ).filter((row): row is RunHistoryIndexRow => row !== null);

    if (staleRunIds.length > 0) {
      await Promise.all(staleRunIds.map((runId) => this.indexService.removeRow(runId)));
    }

    const workspaceMap = new Map<string, Map<string, RunHistoryAgentGroup>>();
    for (const row of normalizedRows) {
      const isActive = activeRunIds.has(row.runId);
      const runStatus: RunKnownStatus = isActive ? "ACTIVE" : row.lastKnownStatus;
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
        lastKnownStatus: runStatus,
        isActive,
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
