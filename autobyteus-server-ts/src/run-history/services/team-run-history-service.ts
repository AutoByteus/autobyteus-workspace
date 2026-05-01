import fs from "node:fs/promises";
import path from "node:path";
import { MemoryFileStore } from "../../agent-memory/store/memory-file-store.js";
import { TeamMemberMemoryLayout } from "../../agent-memory/store/team-member-memory-layout.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  TeamRunHistoryItem,
} from "../domain/team-run-history-index-types.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";
import {
  TeamRunMetadata,
  type TeamRunMemberMetadata,
} from "../store/team-run-metadata-types.js";
import { TeamRunMetadataStore } from "../store/team-run-metadata-store.js";
import { extractSummaryFromRawTraces } from "./run-history-service-helpers.js";
import { AgentRunViewProjectionService } from "./agent-run-view-projection-service.js";
import { TeamMemberLocalRunProjectionReader } from "./team-member-local-run-projection-reader.js";
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
  private readonly indexService: TeamRunHistoryIndexService;
  private readonly teamRunManager: AgentTeamRunManager;
  private readonly memberLayout: TeamMemberMemoryLayout;
  private readonly projectionReader: TeamMemberLocalRunProjectionReader;
  private readonly agentRunViewProjectionService: AgentRunViewProjectionService;

  constructor(
    memoryDir: string,
    options: {
      metadataStore?: TeamRunMetadataStore;
      indexService?: TeamRunHistoryIndexService;
      teamRunManager?: AgentTeamRunManager;
      projectionReader?: TeamMemberLocalRunProjectionReader;
      agentRunViewProjectionService?: AgentRunViewProjectionService;
    } = {},
  ) {
    this.metadataStore = options.metadataStore ?? new TeamRunMetadataStore(memoryDir);
    this.indexService =
      options.indexService ?? getTeamRunHistoryIndexService();
    this.teamRunManager = options.teamRunManager ?? AgentTeamRunManager.getInstance();
    this.memberLayout = new TeamMemberMemoryLayout(memoryDir);
    this.projectionReader =
      options.projectionReader ?? new TeamMemberLocalRunProjectionReader(memoryDir);
    this.agentRunViewProjectionService =
      options.agentRunViewProjectionService ?? new AgentRunViewProjectionService(memoryDir);
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
      if (metadata.archivedAt && !isActive) {
        continue;
      }
      const summary = await this.resolveSummary(row, metadata);
      const coordinatorMemberRouteKey = resolveCoordinatorMemberRouteKey(metadata);
      items.push({
        teamRunId: row.teamRunId,
        teamDefinitionId: row.teamDefinitionId,
        teamDefinitionName: row.teamDefinitionName,
        coordinatorMemberRouteKey,
        workspaceRootPath: row.workspaceRootPath ?? resolveTeamWorkspaceRootPath(metadata) ?? null,
        summary,
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

  async archiveStoredTeamRun(teamRunId: string): Promise<ArchiveStoredTeamRunResult> {
    const normalizedTeamRunId = this.resolveSafeArchiveTeamRunId(teamRunId);
    if (!normalizedTeamRunId) {
      return {
        success: false,
        message: "Invalid team run ID path.",
      };
    }

    if (this.isTeamRunActive(normalizedTeamRunId)) {
      return {
        success: false,
        message: "Team run is active. Terminate it before archiving history.",
      };
    }

    try {
      const metadata = await this.metadataStore.readMetadata(normalizedTeamRunId);
      if (!metadata) {
        return {
          success: false,
          message: `Team run metadata not found for '${normalizedTeamRunId}'.`,
        };
      }

      const archivedAt = metadata.archivedAt ?? new Date().toISOString();
      await this.metadataStore.writeMetadata(normalizedTeamRunId, {
        ...metadata,
        archivedAt,
      });

      return {
        success: true,
        message: `Team run '${normalizedTeamRunId}' archived.`,
      };
    } catch (error) {
      logger.warn(`Failed to archive stored team run '${normalizedTeamRunId}': ${String(error)}`);
      return {
        success: false,
        message: `Failed to archive stored team run '${normalizedTeamRunId}'.`,
      };
    }
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

  private resolveSafeArchiveTeamRunId(teamRunId: string): string | null {
    const normalizedTeamRunId = teamRunId.trim();
    if (!this.isSafeArchiveIdentity(normalizedTeamRunId, "temp-")) {
      return null;
    }

    const teamsRoot = path.resolve(this.memberLayout.getTeamRootDirPath());
    const targetDir = path.resolve(teamsRoot, normalizedTeamRunId);
    const metadataPath = path.resolve(targetDir, "team_run_metadata.json");
    if (!this.isStrictlyInsideRoot(targetDir, teamsRoot)) {
      return null;
    }
    if (!this.isStrictlyInsideRoot(metadataPath, teamsRoot)) {
      return null;
    }
    return normalizedTeamRunId;
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

  private isTeamRunActive(teamRunId: string): boolean {
    return this.teamRunManager.getActiveRun(teamRunId) !== null;
  }

  private async resolveSummary(
    row: Pick<
      TeamRunHistoryItem,
      "teamRunId" | "summary" | "lastKnownStatus" | "lastActivityAt"
    >,
    metadata: TeamRunMetadata,
  ): Promise<string> {
    const existing = row.summary.trim();
    if (existing) {
      return existing;
    }

    const recovered = await this.extractSummaryFromCoordinator(metadata);
    if (!recovered) {
      return "";
    }

    await this.indexService.recordRunActivity({
      teamRunId: row.teamRunId,
      metadata,
      summary: recovered,
      lastKnownStatus: row.lastKnownStatus,
      lastActivityAt: row.lastActivityAt,
    });
    return recovered;
  }

  private async extractSummaryFromCoordinator(metadata: TeamRunMetadata): Promise<string> {
    const coordinatorMemberRouteKey = resolveCoordinatorMemberRouteKey(metadata);
    const coordinatorMember =
      metadata.memberMetadata.find(
        (member) => member.memberRouteKey.trim() === coordinatorMemberRouteKey,
      ) ?? metadata.memberMetadata[0];

    if (!coordinatorMember) {
      return "";
    }

    const teamDir = this.memberLayout.getTeamDirPath(metadata.teamRunId);
    const memberStore = new MemoryFileStore(teamDir, {
      runRootSubdir: "",
      warnOnMissingFiles: false,
    });

    const rawTraceSummary = extractSummaryFromRawTraces(
      memberStore.readRawTracesActive(coordinatorMember.memberRunId, 300),
      memberStore.readRawTracesArchive(coordinatorMember.memberRunId, 300),
    );
    if (rawTraceSummary) {
      return rawTraceSummary;
    }

    const localProjection = await this.projectionReader.getProjection(
      metadata.teamRunId,
      coordinatorMember.memberRunId,
    );
    const resolvedProjection = await this.agentRunViewProjectionService.getProjectionFromMetadata({
      runId: coordinatorMember.memberRunId,
      metadata: this.toMemberRunMetadata(metadata, coordinatorMember),
      localProjection,
      allowFallbackProvider: false,
    });
    return resolvedProjection.summary?.trim() || "";
  }

  private toMemberRunMetadata(
    metadata: TeamRunMetadata,
    member: TeamRunMemberMetadata,
  ): AgentRunMetadata {
    return {
      runId: member.memberRunId,
      agentDefinitionId: member.agentDefinitionId,
      workspaceRootPath:
        member.workspaceRootPath ??
        metadata.memberMetadata.find((candidate) => candidate.workspaceRootPath)?.workspaceRootPath ??
        process.cwd(),
      memoryDir: this.memberLayout.getMemberDirPath(metadata.teamRunId, member.memberRunId),
      llmModelIdentifier: member.llmModelIdentifier,
      llmConfig: member.llmConfig ?? null,
      autoExecuteTools: member.autoExecuteTools,
      skillAccessMode: member.skillAccessMode,
      runtimeKind: member.runtimeKind,
      platformAgentRunId: member.platformAgentRunId,
      lastKnownStatus: "IDLE",
    };
  }

}

const resolveCoordinatorMemberRouteKey = (metadata: TeamRunMetadata): string =>
  metadata.coordinatorMemberRouteKey.trim() || metadata.memberMetadata[0]?.memberRouteKey?.trim() || "";

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
