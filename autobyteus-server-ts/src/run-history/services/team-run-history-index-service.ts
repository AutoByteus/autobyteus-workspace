import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type {
  TeamRunIndexRow,
  TeamRunKnownStatus,
} from "../domain/team-run-history-index-types.js";
import { TeamRunHistoryIndexStore } from "../store/team-run-history-index-store.js";
import type {
  TeamRunMemberMetadata,
  TeamRunMetadata,
} from "../store/team-run-metadata-types.js";
import { TeamRunMetadataStore } from "../store/team-run-metadata-store.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";
import { compactSummary } from "./run-history-service-helpers.js";

const nowIso = (): string => new Date().toISOString();

export class TeamRunHistoryIndexService {
  private readonly indexStore: TeamRunHistoryIndexStore;
  private readonly metadataStore: TeamRunMetadataStore;
  private readonly teamRunManager: AgentTeamRunManager;

  constructor(
    memoryDir: string,
    dependencies: {
      indexStore?: TeamRunHistoryIndexStore;
      metadataStore?: TeamRunMetadataStore;
      teamRunManager?: AgentTeamRunManager;
    } = {},
  ) {
    this.indexStore =
      dependencies.indexStore ?? new TeamRunHistoryIndexStore(memoryDir);
    this.metadataStore =
      dependencies.metadataStore ?? new TeamRunMetadataStore(memoryDir);
    this.teamRunManager =
      dependencies.teamRunManager ?? AgentTeamRunManager.getInstance();
  }

  async listRows(): Promise<TeamRunIndexRow[]> {
    return this.indexStore.listRows();
  }

  async removeRow(teamRunId: string): Promise<void> {
    await this.indexStore.removeRow(teamRunId);
  }

  async recordRunCreated(input: {
    teamRunId: string;
    metadata: TeamRunMetadata;
    summary: string;
    lastKnownStatus?: TeamRunKnownStatus;
    lastActivityAt?: string;
  }): Promise<void> {
    await this.upsertFromMetadata({
      teamRunId: input.teamRunId,
      metadata: input.metadata,
      summary: input.summary,
      lastKnownStatus: input.lastKnownStatus ?? "ACTIVE",
      lastActivityAt: input.lastActivityAt ?? nowIso(),
    });
  }

  async recordRunRestored(input: {
    teamRunId: string;
    metadata: TeamRunMetadata;
    lastKnownStatus?: TeamRunKnownStatus;
    lastActivityAt?: string;
  }): Promise<void> {
    const existing = await this.indexStore.getRow(input.teamRunId);
    await this.upsertFromMetadata({
      teamRunId: input.teamRunId,
      metadata: input.metadata,
      summary: existing?.summary ?? "",
      lastKnownStatus: input.lastKnownStatus ?? "ACTIVE",
      lastActivityAt: input.lastActivityAt ?? nowIso(),
    });
  }

  async recordRunActivity(input: {
    teamRunId: string;
    metadata?: TeamRunMetadata | null;
    summary?: string | null;
    lastKnownStatus?: TeamRunKnownStatus;
    lastActivityAt?: string;
  }): Promise<void> {
    const lastActivityAt = input.lastActivityAt ?? nowIso();
    const lastKnownStatus = input.lastKnownStatus ?? "ACTIVE";

    if (input.metadata) {
      await this.upsertFromMetadata({
        teamRunId: input.teamRunId,
        metadata: input.metadata,
        summary: input.summary ?? "",
        lastKnownStatus,
        lastActivityAt,
      });
      return;
    }

    await this.indexStore.updateRow(input.teamRunId, {
      ...(input.summary !== undefined && input.summary !== null
        ? { summary: compactSummary(input.summary) }
        : {}),
      lastKnownStatus,
      lastActivityAt,
    });
  }

  async recordRunTerminated(teamRunId: string): Promise<void> {
    await this.indexStore.updateRow(teamRunId, {
      lastActivityAt: nowIso(),
    });
  }

  async rebuildIndexFromDisk(): Promise<TeamRunIndexRow[]> {
    const teamRunIds = await this.metadataStore.listTeamRunIds();
    const rows: TeamRunIndexRow[] = [];
    for (const teamRunId of teamRunIds) {
      const metadata = await this.metadataStore.readMetadata(teamRunId);
      if (!metadata) {
        continue;
      }
      rows.push({
        teamRunId,
        teamDefinitionId: metadata.teamDefinitionId,
        teamDefinitionName: metadata.teamDefinitionName,
        workspaceRootPath: resolveTeamWorkspaceRootPath(metadata.memberMetadata),
        summary: "",
        lastActivityAt: metadata.updatedAt || metadata.createdAt || nowIso(),
        lastKnownStatus: this.isTeamRunActive(teamRunId) ? "ACTIVE" : "IDLE",
        deleteLifecycle: "READY",
      });
    }
    await this.indexStore.writeIndex({
      version: 1,
      rows,
    });
    return rows;
  }

  private async upsertFromMetadata(input: {
    teamRunId: string;
    metadata: TeamRunMetadata;
    summary: string;
    lastKnownStatus: TeamRunKnownStatus;
    lastActivityAt: string;
  }): Promise<void> {
    const row: TeamRunIndexRow = {
      teamRunId: input.teamRunId,
      teamDefinitionId: input.metadata.teamDefinitionId,
      teamDefinitionName: input.metadata.teamDefinitionName,
      workspaceRootPath: resolveTeamWorkspaceRootPath(input.metadata.memberMetadata),
      summary: compactSummary(input.summary),
      lastActivityAt: input.lastActivityAt,
      lastKnownStatus: input.lastKnownStatus,
      deleteLifecycle: "READY",
    };
    await this.indexStore.upsertRow(row);
  }

  private isTeamRunActive(teamRunId: string): boolean {
    const activeRunIds = new Set(this.teamRunManager.listActiveRuns());
    return (
      activeRunIds.has(teamRunId) ||
      this.teamRunManager.getTeamRun(teamRunId) !== null
    );
  }
}

let cachedTeamRunHistoryIndexService: TeamRunHistoryIndexService | null = null;

export const getTeamRunHistoryIndexService = (): TeamRunHistoryIndexService => {
  if (!cachedTeamRunHistoryIndexService) {
    cachedTeamRunHistoryIndexService = new TeamRunHistoryIndexService(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedTeamRunHistoryIndexService;
};

const resolveTeamWorkspaceRootPath = (
  memberMetadata: TeamRunMemberMetadata[],
): string | null => {
  const workspaceRootPath =
    memberMetadata.find((member) => member.workspaceRootPath)?.workspaceRootPath ?? null;
  return workspaceRootPath ? canonicalizeWorkspaceRootPath(workspaceRootPath) : null;
};
