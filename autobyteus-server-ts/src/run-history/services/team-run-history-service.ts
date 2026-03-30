import fs from "node:fs/promises";
import path from "node:path";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  TeamRunHistoryItem,
} from "../domain/team-run-history-index-types.js";
import {
  TeamRunMetadata,
} from "../store/team-run-metadata-types.js";
import { TeamRunMetadataStore } from "../store/team-run-metadata-store.js";
import {
  TeamRunHistoryIndexService,
  getTeamRunHistoryIndexService,
} from "./team-run-history-index-service.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export interface DeleteStoredTeamRunResult {
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
  private readonly indexService: TeamRunHistoryIndexService;
  private readonly teamRunManager: AgentTeamRunManager;

  constructor(
    memoryDir: string,
    options: {
      metadataStore?: TeamRunMetadataStore;
      indexService?: TeamRunHistoryIndexService;
      teamRunManager?: AgentTeamRunManager;
    } = {},
  ) {
    this.metadataStore = options.metadataStore ?? new TeamRunMetadataStore(memoryDir);
    this.indexService =
      options.indexService ?? getTeamRunHistoryIndexService();
    this.teamRunManager = options.teamRunManager ?? AgentTeamRunManager.getInstance();
  }

  async listTeamRunHistory(): Promise<TeamRunHistoryItem[]> {
    let rows = await this.indexService.listRows();
    if (rows.length === 0) {
      rows = await this.indexService.rebuildIndexFromDisk();
    }

    const items: TeamRunHistoryItem[] = [];
    const staleTeamRunIds: string[] = [];
    for (const row of rows) {
      const metadata = await this.metadataStore.readMetadata(row.teamRunId);
      if (!metadata) {
        staleTeamRunIds.push(row.teamRunId);
        continue;
      }
      const isActive = this.isTeamRunActive(row.teamRunId);
      items.push({
        teamRunId: row.teamRunId,
        teamDefinitionId: row.teamDefinitionId,
        teamDefinitionName: row.teamDefinitionName,
        workspaceRootPath: row.workspaceRootPath ?? resolveTeamWorkspaceRootPath(metadata) ?? null,
        summary: row.summary,
        lastActivityAt: row.lastActivityAt,
        lastKnownStatus: isActive ? "ACTIVE" : row.lastKnownStatus,
        deleteLifecycle: row.deleteLifecycle,
        isActive,
        members: metadata.memberMetadata.map((member) => ({
          memberRouteKey: member.memberRouteKey,
          memberName: member.memberName,
          memberRunId: member.memberRunId,
          runtimeKind: member.runtimeKind,
          platformAgentRunId: member.platformAgentRunId,
          agentDefinitionId: member.agentDefinitionId,
          llmModelIdentifier: member.llmModelIdentifier,
          autoExecuteTools: member.autoExecuteTools,
          llmConfig: member.llmConfig ?? null,
          workspaceRootPath: member.workspaceRootPath,
        })),
      });
    }

    if (staleTeamRunIds.length > 0) {
      await Promise.all(staleTeamRunIds.map((teamRunId) => this.indexService.removeRow(teamRunId)));
    }

    items.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
    return items;
  }

  async getTeamRunResumeConfig(teamRunId: string): Promise<TeamRunResumeConfig> {
    const metadata = await this.metadataStore.readMetadata(teamRunId);
    if (!metadata) {
      throw new Error(`Team run metadata not found for '${teamRunId}'.`);
    }
    return {
      teamRunId,
      isActive: this.isTeamRunActive(teamRunId),
      metadata,
    };
  }

  async deleteStoredTeamRun(teamRunId: string): Promise<DeleteStoredTeamRunResult> {
    const normalizedTeamRunId = teamRunId.trim();
    if (!normalizedTeamRunId) {
      return {
        success: false,
        message: "Team run ID is required.",
      };
    }
    if (this.isTeamRunActive(normalizedTeamRunId)) {
      return {
        success: false,
        message: "Team run is active. Terminate it before deleting history.",
      };
    }
    const safeTarget = this.resolveSafeTeamDirectory(normalizedTeamRunId);
    if (!safeTarget) {
      return {
        success: false,
        message: "Invalid team run ID path.",
      };
    }

    try {
      await fs.rm(safeTarget, { recursive: true, force: true });
      await this.indexService.removeRow(normalizedTeamRunId);
      return {
        success: true,
        message: `Team run '${normalizedTeamRunId}' deleted permanently.`,
      };
    } catch (error) {
      logger.warn(`Failed to delete stored team run '${normalizedTeamRunId}': ${String(error)}`);
      return {
        success: false,
        message: `Failed to delete stored team run '${normalizedTeamRunId}'.`,
      };
    }
  }

  private resolveSafeTeamDirectory(teamRunId: string): string | null {
    const teamsRoot = path.resolve(this.metadataStore.getTeamDirPath(""));
    const targetPath = path.resolve(this.metadataStore.getTeamDirPath(teamRunId));
    if (targetPath === teamsRoot) {
      return null;
    }
    const targetWithinRoot = targetPath.startsWith(`${teamsRoot}${path.sep}`);
    if (!targetWithinRoot) {
      return null;
    }
    return targetPath;
  }

  private isTeamRunActive(teamRunId: string): boolean {
    return this.teamRunManager.getActiveRun(teamRunId) !== null;
  }

}

let cachedTeamRunHistoryService: TeamRunHistoryService | null = null;

export const getTeamRunHistoryService = (): TeamRunHistoryService => {
  if (!cachedTeamRunHistoryService) {
    cachedTeamRunHistoryService = new TeamRunHistoryService(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedTeamRunHistoryService;
};

const resolveTeamWorkspaceRootPath = (
  metadata: TeamRunMetadata,
): string | null =>
  metadata.memberMetadata.find((member) => member.workspaceRootPath)?.workspaceRootPath ?? null;
