import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import {
  AgentRunStatusProjectionService,
} from "../../agent-execution/services/agent-run-status-projection-service.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  RunHistoryAgentGroup,
  RunHistoryIndexRow,
  RunHistoryItem,
  RunHistoryWorkspaceGroup,
} from "../domain/agent-run-history-index-types.js";
import {
  canonicalizeWorkspaceRootPath,
  workspaceDisplayNameFromRootPath,
} from "../utils/workspace-path-normalizer.js";
import { AgentRunMetadataStore } from "../store/agent-run-metadata-store.js";
import {
  AgentRunHistoryCatalogService,
} from "./agent-run-history-catalog-service.js";

export interface DeleteStoredRunResult {
  success: boolean;
  message: string;
}

export interface ArchiveStoredRunResult {
  success: boolean;
  message: string;
}

export interface ArchiveStoredAgentRunGroupResult {
  archivedRunIds: string[];
  /** Non-empty means the group had running runs and nothing was archived. */
  activeRunIds: string[];
  failedRunIds: string[];
}

export class AgentRunHistoryService {
  private readonly catalogService: AgentRunHistoryCatalogService;
  private readonly agentRunManager: AgentRunManager;
  private readonly metadataStore: AgentRunMetadataStore;
  private readonly statusProjectionService: AgentRunStatusProjectionService;

  constructor(
    memoryDir: string,
    dependencies: {
      catalogService?: AgentRunHistoryCatalogService;
      metadataStore?: AgentRunMetadataStore;
      statusProjectionService?: AgentRunStatusProjectionService;
      agentRunManager?: AgentRunManager;
    } = {},
  ) {
    this.catalogService =
      dependencies.catalogService ?? new AgentRunHistoryCatalogService(memoryDir);
    this.agentRunManager = dependencies.agentRunManager ?? AgentRunManager.getInstance();
    this.metadataStore =
      dependencies.metadataStore ?? new AgentRunMetadataStore(memoryDir);
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
    const rows = await this.catalogService.listCatalogRows();
    const workspaceMap = new Map<string, Map<string, {
      agentDefinitionId: string;
      agentName: string;
      rows: RunHistoryIndexRow[];
    }>>();
    for (const row of rows) {
      if (row.archivedAt) {
        continue;
      }
      const workspaceRootPath = canonicalizeWorkspaceRootPath(row.workspaceRootPath);
      let agentMap = workspaceMap.get(workspaceRootPath);
      if (!agentMap) {
        agentMap = new Map();
        workspaceMap.set(workspaceRootPath, agentMap);
      }
      let agentGroup = agentMap.get(row.agentDefinitionId);
      if (!agentGroup) {
        agentGroup = {
          agentDefinitionId: row.agentDefinitionId,
          agentName: row.agentName,
          rows: [],
        };
        agentMap.set(row.agentDefinitionId, agentGroup);
      }
      agentGroup.rows.push({
        ...row,
        workspaceRootPath,
      });
    }

    const limit = Math.max(limitPerAgent, 1);
    const workspaceGroups: RunHistoryWorkspaceGroup[] = [];
    for (const [workspaceRootPath, agentMap] of workspaceMap.entries()) {
      const agents: RunHistoryAgentGroup[] = [];
      for (const group of agentMap.values()) {
        const limitedRows = group.rows
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, limit);
        agents.push({
          agentDefinitionId: group.agentDefinitionId,
          agentName: group.agentName,
          runs: await Promise.all(limitedRows.map((row) => this.toHistoryItem(row))),
        });
      }
      agents.sort((a, b) => a.agentName.localeCompare(b.agentName));
      workspaceGroups.push({
        workspaceRootPath,
        workspaceName: workspaceDisplayNameFromRootPath(workspaceRootPath),
        agents,
      });
    }

    workspaceGroups.sort((a, b) => a.workspaceName.localeCompare(b.workspaceName));
    return workspaceGroups;
  }

  private async toHistoryItem(row: RunHistoryIndexRow): Promise<RunHistoryItem> {
    const projection = await Promise.resolve(
      this.statusProjectionService.getCatalogListStatusProjection(row.runId),
    );
    const terminatedInactive = Boolean(row.terminatedAt) && !projection.isActive;
    return {
      runId: row.runId,
      summary: row.summary,
      status: terminatedInactive ? "offline" : projection.status,
      isActive: projection.isActive,
      shouldConnectStream: projection.shouldConnectStream,
      statusSource: terminatedInactive ? "TERMINATED_METADATA" : projection.statusSource,
      createdAt: row.createdAt,
      archivedAt: row.archivedAt ?? null,
      terminatedAt: row.terminatedAt ?? null,
      hasCollaboration: row.hasCollaboration === true,
    };
  }

  async archiveStoredRun(runId: string): Promise<ArchiveStoredRunResult> {
    return this.catalogService.archiveRun(runId);
  }

  /**
   * Archives every unarchived stored run of one agent in one workspace, including runs
   * beyond the history listing cap. All-or-nothing: when any of those runs is active,
   * nothing is archived and the active run IDs are returned.
   */
  async archiveStoredAgentRunGroup(input: {
    workspaceRootPath: string;
    agentDefinitionId: string;
  }): Promise<ArchiveStoredAgentRunGroupResult> {
    const agentDefinitionId = input.agentDefinitionId.trim();
    if (!input.workspaceRootPath.trim() || !agentDefinitionId) {
      throw new Error("workspaceRootPath and agentDefinitionId are required.");
    }
    const workspaceRootPath = canonicalizeWorkspaceRootPath(input.workspaceRootPath);
    const groupRunIds = (await this.catalogService.listCatalogRows())
      .filter((row) => !row.archivedAt
        && row.agentDefinitionId === agentDefinitionId
        && canonicalizeWorkspaceRootPath(row.workspaceRootPath) === workspaceRootPath)
      .map((row) => row.runId);

    const activeRunIds = groupRunIds.filter(
      (runId) => this.statusProjectionService.getCatalogListStatusProjection(runId).isActive,
    );
    if (activeRunIds.length > 0) {
      return { archivedRunIds: [], activeRunIds, failedRunIds: [] };
    }

    const result: ArchiveStoredAgentRunGroupResult = { archivedRunIds: [], activeRunIds: [], failedRunIds: [] };
    for (const runId of groupRunIds) {
      const archived = await this.catalogService.archiveRun(runId);
      (archived.success ? result.archivedRunIds : result.failedRunIds).push(runId);
    }
    return result;
  }

  async deleteStoredRun(runId: string): Promise<DeleteStoredRunResult> {
    return this.catalogService.deleteRun(runId);
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
