import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type {
  AgentApiStatus,
  AgentStatusPayload,
} from "../../agent-execution/domain/agent-status-payload.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type { TeamRunHistoryItem } from "../domain/team-run-history-index-types.js";
import type { TeamRunIndexRow } from "../domain/team-run-history-index-types.js";
import type {
  TeamRunMetadata,
  TeamRunAgentMemberMetadata,
} from "../store/team-run-metadata-types.js";
import {
  isUnsupportedLegacyTeamRunMetadataError,
  TeamRunMetadataStore,
  toLegacyTeamRunMetadataUpgradeRequiredError,
} from "../store/team-run-metadata-store.js";
import {
  TeamRunHistoryCatalogService,
  getTeamRunHistoryCatalogService,
} from "./team-run-history-catalog-service.js";
import { TeamRunLiveProjectionService } from "./team-run-live-projection-service.js";
import {
  getTeamRunLeafAgentMetadata,
  resolveTeamWorkspaceRootPath,
} from "./team-run-metadata-flattener.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export interface DeleteStoredTeamRunResult {
  success: boolean;
  message: string;
}

export interface ArchiveStoredTeamRunResult {
  success: boolean;
  message: string;
}

export interface TeamRunResumeConfig {
  teamRunId: string;
  isActive: boolean;
  metadata: TeamRunMetadata;
}

export class TeamRunHistoryService {
  private readonly metadataStore: TeamRunMetadataStore;
  private readonly catalogService: TeamRunHistoryCatalogService;
  private readonly teamRunManager: AgentTeamRunManager;
  private readonly liveProjectionService: TeamRunLiveProjectionService;

  constructor(
    memoryDir: string,
    options: {
      metadataStore?: TeamRunMetadataStore;
      catalogService?: TeamRunHistoryCatalogService;
      teamRunManager?: AgentTeamRunManager;
      liveProjectionService?: TeamRunLiveProjectionService;
    } = {},
  ) {
    this.metadataStore = options.metadataStore ?? new TeamRunMetadataStore(memoryDir);
    this.catalogService = options.catalogService ?? getTeamRunHistoryCatalogService();
    this.teamRunManager = options.teamRunManager ?? AgentTeamRunManager.getInstance();
    this.liveProjectionService = options.liveProjectionService ??
      new TeamRunLiveProjectionService(this.teamRunManager);
  }

  async listTeamRunHistory(): Promise<TeamRunHistoryItem[]> {
    const rows = await this.catalogService.listCatalogRows();
    const items: TeamRunHistoryItem[] = [];

    for (const row of rows) {
      const projection = this.liveProjectionService.getCatalogListLiveProjection(row.teamRunId);
      if (row.archivedAt && !projection.isActive) {
        continue;
      }

      let metadata: TeamRunMetadata | null = null;
      try {
        metadata = await this.metadataStore.readMetadata(row.teamRunId);
      } catch (error) {
        if (isUnsupportedLegacyTeamRunMetadataError(error)) {
          logger.warn(
            `Skipping unmigrated legacy team run metadata '${row.teamRunId}'. Open Settings -> Server -> Migrations for details.`,
          );
          continue;
        }
        throw error;
      }
      if (!metadata) {
        logger.warn(
          `Skipping indexed team run '${row.teamRunId}' because team_run_metadata.json is missing. Run the app-data migration or repair script if history is incomplete.`,
        );
        continue;
      }

      items.push(this.toHistoryItem(row, metadata, projection));
    }

    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getTeamRunResumeConfig(teamRunId: string): Promise<TeamRunResumeConfig> {
    let metadata: TeamRunMetadata | null = null;
    try {
      metadata = await this.metadataStore.readMetadata(teamRunId);
    } catch (error) {
      if (isUnsupportedLegacyTeamRunMetadataError(error)) {
        throw toLegacyTeamRunMetadataUpgradeRequiredError(error);
      }
      throw error;
    }
    if (!metadata) {
      throw new Error(`Team run metadata not found for '${teamRunId}'.`);
    }
    return {
      teamRunId,
      isActive: this.isTeamRunActive(teamRunId),
      metadata,
    };
  }

  async archiveStoredTeamRun(teamRunId: string): Promise<ArchiveStoredTeamRunResult> {
    return this.catalogService.archiveTeamRun(teamRunId);
  }

  async deleteStoredTeamRun(teamRunId: string): Promise<DeleteStoredTeamRunResult> {
    return this.catalogService.deleteTeamRun(teamRunId);
  }

  private toHistoryItem(
    row: TeamRunIndexRow,
    metadata: TeamRunMetadata,
    projection: {
      isActive: boolean;
      memberStatusSnapshots: AgentStatusPayload[];
    },
  ): TeamRunHistoryItem {
    const coordinatorMemberRouteKey = resolveCoordinatorMemberRouteKey(metadata);
    return {
      teamRunId: row.teamRunId,
      teamDefinitionId: row.teamDefinitionId,
      teamDefinitionName: row.teamDefinitionName,
      coordinatorMemberRouteKey,
      workspaceRootPath: row.workspaceRootPath ?? resolveTeamWorkspaceRootPath(metadata) ?? null,
      summary: row.summary,
      createdAt: row.createdAt,
      archivedAt: row.archivedAt ?? null,
      terminatedAt: row.terminatedAt ?? null,
      isActive: projection.isActive,
      members: getTeamRunLeafAgentMetadata(metadata).map((member) => ({
        memberRouteKey: member.memberRouteKey,
        memberName: member.memberName,
        memberRunId: member.memberRunId,
        status: this.resolveMemberHistoryStatus(member, projection.memberStatusSnapshots),
        runtimeKind: member.runtimeKind,
        platformAgentRunId: member.platformAgentRunId,
        agentDefinitionId: member.agentDefinitionId,
        llmModelIdentifier: member.llmModelIdentifier,
        autoExecuteTools: member.autoExecuteTools,
        llmConfig: member.llmConfig ?? null,
        workspaceRootPath: member.workspaceRootPath,
      })),
      memberTree: metadata.memberTree,
    };
  }

  private isTeamRunActive(teamRunId: string): boolean {
    return this.teamRunManager.getActiveRun(teamRunId) !== null;
  }

  private resolveMemberHistoryStatus(
    member: TeamRunAgentMemberMetadata,
    statusSnapshots: AgentStatusPayload[],
  ): AgentApiStatus {
    const snapshot = statusSnapshots.find((candidate) =>
      candidate.agent_id === member.memberRunId ||
      candidate.agent_id === member.platformAgentRunId,
    );
    return snapshot?.status ?? "offline";
  }
}

const resolveCoordinatorMemberRouteKey = (metadata: TeamRunMetadata): string =>
  metadata.coordinatorMemberRouteKey.trim() ||
  getTeamRunLeafAgentMetadata(metadata)[0]?.memberRouteKey?.trim() ||
  "";

let cachedTeamRunHistoryService: TeamRunHistoryService | null = null;

export const getTeamRunHistoryService = (): TeamRunHistoryService => {
  if (!cachedTeamRunHistoryService) {
    cachedTeamRunHistoryService = new TeamRunHistoryService(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedTeamRunHistoryService;
};
