import type { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import {
  TeamRunHistoryItem,
  TeamRunIndexRow,
} from "../domain/team-models.js";
import { TeamRunIndexStore } from "../store/team-run-index-store.js";
import { TeamRunManifestStore } from "../store/team-run-manifest-store.js";
import type { TeamRunResumeConfig } from "./team-run-history-service.js";

const nowIso = (): string => new Date().toISOString();

export class TeamRunHistoryQueryService {
  private readonly manifestStore: TeamRunManifestStore;
  private readonly indexStore: TeamRunIndexStore;
  private readonly teamRunManager: AgentTeamRunManager;

  constructor(input: {
    manifestStore: TeamRunManifestStore;
    indexStore: TeamRunIndexStore;
    teamRunManager: AgentTeamRunManager;
  }) {
    this.manifestStore = input.manifestStore;
    this.indexStore = input.indexStore;
    this.teamRunManager = input.teamRunManager;
  }

  async listTeamRunHistory(): Promise<TeamRunHistoryItem[]> {
    let rows = await this.indexStore.listRows();
    if (rows.length === 0) {
      rows = await this.rebuildIndexFromDisk();
    }

    const items: TeamRunHistoryItem[] = [];
    for (const row of rows) {
      const manifest = await this.manifestStore.readManifest(row.teamRunId);
      if (!manifest) {
        continue;
      }
      const isActive = this.teamRunManager.getTeamRun(row.teamRunId) !== null;
      items.push({
        teamRunId: row.teamRunId,
        teamDefinitionId: row.teamDefinitionId,
        teamDefinitionName: row.teamDefinitionName,
        summary: row.summary,
        lastActivityAt: row.lastActivityAt,
        lastKnownStatus: isActive ? "ACTIVE" : row.lastKnownStatus,
        deleteLifecycle: row.deleteLifecycle,
        isActive,
        members: manifest.memberBindings.map((binding) => ({
          memberRouteKey: binding.memberRouteKey,
          memberName: binding.memberName,
          memberAgentId: binding.memberAgentId,
          agentDefinitionId: binding.agentDefinitionId,
          llmModelIdentifier: binding.llmModelIdentifier,
          autoExecuteTools: binding.autoExecuteTools,
          llmConfig: binding.llmConfig ?? null,
          workspaceRootPath: binding.workspaceRootPath,
          hostNodeId: binding.hostNodeId,
        })),
      });
    }

    items.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
    return items;
  }

  async getTeamRunResumeConfig(teamRunId: string): Promise<TeamRunResumeConfig> {
    const manifest = await this.manifestStore.readManifest(teamRunId);
    if (!manifest) {
      throw new Error(`Team run manifest not found for '${teamRunId}'.`);
    }
    return {
      teamRunId,
      isActive: this.teamRunManager.getTeamRun(teamRunId) !== null,
      manifest,
    };
  }

  async rebuildIndexFromDisk(): Promise<TeamRunIndexRow[]> {
    const teamIds = await this.manifestStore.listTeamIds();
    const rows: TeamRunIndexRow[] = [];
    for (const teamRunId of teamIds) {
      const manifest = await this.manifestStore.readManifest(teamRunId);
      if (!manifest) {
        continue;
      }
      rows.push({
        teamRunId,
        teamDefinitionId: manifest.teamDefinitionId,
        teamDefinitionName: manifest.teamDefinitionName,
        summary: "",
        lastActivityAt: manifest.updatedAt || manifest.createdAt || nowIso(),
        lastKnownStatus: this.teamRunManager.getTeamRun(teamRunId) ? "ACTIVE" : "IDLE",
        deleteLifecycle: "READY",
      });
    }
    await this.indexStore.writeIndex({
      version: 1,
      rows,
    });
    return rows;
  }
}
