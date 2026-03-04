import fs from "node:fs/promises";
import path from "node:path";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import {
  getTeamMemberRuntimeOrchestrator,
  type TeamMemberRuntimeOrchestrator,
} from "../../agent-team-execution/services/team-member-runtime-orchestrator.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  TeamMemberRunManifest,
  TeamRunHistoryItem,
  TeamRunIndexRow,
  TeamRunKnownStatus,
  TeamRunManifest,
  TeamRunMemberBinding,
} from "../domain/team-models.js";
import { TeamMemberMemoryLayoutStore } from "../store/team-member-memory-layout-store.js";
import { TeamMemberRunManifestStore } from "../store/team-member-run-manifest-store.js";
import { TeamRunIndexStore } from "../store/team-run-index-store.js";
import { TeamRunManifestStore } from "../store/team-run-manifest-store.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const nowIso = (): string => new Date().toISOString();

const compactSummary = (value: string | null): string => {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= 120) {
    return normalized;
  }
  return `${normalized.slice(0, 117)}...`;
};

export interface TeamRunDeleteHistoryResult {
  success: boolean;
  message: string;
}

export interface TeamRunResumeConfig {
  teamRunId: string;
  isActive: boolean;
  manifest: TeamRunManifest;
}

export class TeamRunHistoryService {
  private readonly manifestStore: TeamRunManifestStore;
  private readonly indexStore: TeamRunIndexStore;
  private readonly memberLayoutStore: TeamMemberMemoryLayoutStore;
  private readonly memberRunManifestStore: TeamMemberRunManifestStore;
  private readonly teamRunManager: AgentTeamRunManager;
  private readonly teamMemberRuntimeOrchestrator: TeamMemberRuntimeOrchestrator | null;

  constructor(
    memoryDir: string,
    options: {
      teamRunManager?: AgentTeamRunManager;
      teamMemberRuntimeOrchestrator?: TeamMemberRuntimeOrchestrator;
    } = {},
  ) {
    this.manifestStore = new TeamRunManifestStore(memoryDir);
    this.indexStore = new TeamRunIndexStore(memoryDir);
    this.memberLayoutStore = new TeamMemberMemoryLayoutStore(memoryDir);
    this.memberRunManifestStore = new TeamMemberRunManifestStore(memoryDir);
    this.teamRunManager = options.teamRunManager ?? AgentTeamRunManager.getInstance();
    this.teamMemberRuntimeOrchestrator = options.teamMemberRuntimeOrchestrator ?? null;
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
      const isActive = this.isTeamRunActive(row.teamRunId);
      items.push({
        teamRunId: row.teamRunId,
        teamDefinitionId: row.teamDefinitionId,
        teamDefinitionName: row.teamDefinitionName,
        workspaceRootPath: row.workspaceRootPath ?? manifest.workspaceRootPath ?? null,
        summary: row.summary,
        lastActivityAt: row.lastActivityAt,
        lastKnownStatus: isActive ? "ACTIVE" : row.lastKnownStatus,
        deleteLifecycle: row.deleteLifecycle,
        isActive,
        members: manifest.memberBindings.map((binding) => ({
          memberRouteKey: binding.memberRouteKey,
          memberName: binding.memberName,
          memberRunId: binding.memberRunId,
          runtimeKind: binding.runtimeKind,
          runtimeReference: binding.runtimeReference ?? null,
          agentDefinitionId: binding.agentDefinitionId,
          llmModelIdentifier: binding.llmModelIdentifier,
          autoExecuteTools: binding.autoExecuteTools,
          llmConfig: binding.llmConfig ?? null,
          workspaceRootPath: binding.workspaceRootPath,
        })),
      });
    }

    items.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
    return items;
  }

  async upsertTeamRunHistoryRow(options: {
    teamRunId: string;
    manifest: TeamRunManifest;
    summary: string;
    lastKnownStatus?: TeamRunKnownStatus;
    lastActivityAt?: string;
  }): Promise<void> {
    const row: TeamRunIndexRow = {
      teamRunId: options.teamRunId,
      teamDefinitionId: options.manifest.teamDefinitionId,
      teamDefinitionName: options.manifest.teamDefinitionName,
      workspaceRootPath: options.manifest.workspaceRootPath,
      summary: compactSummary(options.summary),
      lastActivityAt: options.lastActivityAt ?? nowIso(),
      lastKnownStatus: options.lastKnownStatus ?? "ACTIVE",
      deleteLifecycle: "READY",
    };
    await this.memberLayoutStore.ensureLocalMemberSubtrees(
      options.teamRunId,
      options.manifest.memberBindings.map((binding) => binding.memberRunId),
    );
    await this.writeMemberRunManifests(
      options.teamRunId,
      options.manifest,
      row.lastKnownStatus,
      row.lastActivityAt,
    );
    await this.manifestStore.writeManifest(options.teamRunId, options.manifest);
    await this.indexStore.upsertRow(row);
  }

  async onTeamEvent(
    teamRunId: string,
    options: { status?: TeamRunKnownStatus; summary?: string } = {},
  ): Promise<void> {
    const existing = await this.indexStore.getRow(teamRunId);
    if (!existing) {
      const manifest = await this.manifestStore.readManifest(teamRunId);
      if (!manifest) {
        return;
      }
      await this.indexStore.upsertRow({
        teamRunId,
        teamDefinitionId: manifest.teamDefinitionId,
        teamDefinitionName: manifest.teamDefinitionName,
        workspaceRootPath: manifest.workspaceRootPath,
        summary: compactSummary(options.summary ?? ""),
        lastActivityAt: nowIso(),
        lastKnownStatus: options.status ?? "ACTIVE",
        deleteLifecycle: "READY",
      });
      const nextStatus = options.status ?? "ACTIVE";
      const timestamp = nowIso();
      const refreshedManifest = this.mergeManifestWithActiveBindings(
        teamRunId,
        manifest,
        timestamp,
      );
      await this.writeMemberRunManifests(teamRunId, refreshedManifest, nextStatus, timestamp);
      await this.manifestStore.writeManifest(teamRunId, refreshedManifest);
      return;
    }
    const nextStatus = options.status ?? existing.lastKnownStatus;
    const nextLastActivityAt = nowIso();
    await this.indexStore.updateRow(teamRunId, {
      lastActivityAt: nextLastActivityAt,
      summary: options.summary !== undefined ? compactSummary(options.summary) : existing.summary,
      lastKnownStatus: nextStatus,
    });
    const manifest = await this.manifestStore.readManifest(teamRunId);
    if (manifest) {
      const refreshedManifest = this.mergeManifestWithActiveBindings(
        teamRunId,
        manifest,
        nextLastActivityAt,
      );
      await this.writeMemberRunManifests(teamRunId, refreshedManifest, nextStatus, nextLastActivityAt);
      await this.manifestStore.writeManifest(teamRunId, refreshedManifest);
    }
  }

  async onTeamTerminated(
    teamRunId: string,
    options: { memberBindingsOverride?: TeamRunMemberBinding[] } = {},
  ): Promise<void> {
    const terminatedAt = nowIso();
    await this.indexStore.updateRow(teamRunId, {
      lastKnownStatus: "IDLE",
      lastActivityAt: terminatedAt,
    });
    const manifest = await this.manifestStore.readManifest(teamRunId);
    if (manifest) {
      const refreshedManifest = this.mergeManifestWithActiveBindings(
        teamRunId,
        manifest,
        terminatedAt,
        options.memberBindingsOverride ?? null,
      );
      await this.writeMemberRunManifests(teamRunId, refreshedManifest, "IDLE", terminatedAt);
      await this.manifestStore.writeManifest(teamRunId, refreshedManifest);
    }
  }

  async getTeamRunResumeConfig(teamRunId: string): Promise<TeamRunResumeConfig> {
    const manifest = await this.manifestStore.readManifest(teamRunId);
    if (!manifest) {
      throw new Error(`Team run manifest not found for '${teamRunId}'.`);
    }
    return {
      teamRunId,
      isActive: this.isTeamRunActive(teamRunId),
      manifest,
    };
  }

  async deleteTeamRunHistory(teamRunId: string): Promise<TeamRunDeleteHistoryResult> {
    const normalizedTeamRunId = teamRunId.trim();
    if (!normalizedTeamRunId) {
      return {
        success: false,
        message: "Team run ID is required.",
      };
    }
    if (this.teamRunManager.getTeamRun(normalizedTeamRunId)) {
      return {
        success: false,
        message: "Team run is active. Terminate it before deleting history.",
      };
    }
    if (this.teamMemberRuntimeOrchestrator?.hasActiveMemberBinding?.(normalizedTeamRunId)) {
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
      await this.indexStore.removeRow(normalizedTeamRunId);
      return {
        success: true,
        message: `Team run '${normalizedTeamRunId}' deleted permanently.`,
      };
    } catch (error) {
      logger.warn(`Failed to delete team run history '${normalizedTeamRunId}': ${String(error)}`);
      return {
        success: false,
        message: `Failed to delete team run history '${normalizedTeamRunId}'.`,
      };
    }
  }

  async rebuildIndexFromDisk(): Promise<TeamRunIndexRow[]> {
    const teamRunIds = await this.manifestStore.listTeamRunIds();
    const rows: TeamRunIndexRow[] = [];
    for (const teamRunId of teamRunIds) {
      const manifest = await this.manifestStore.readManifest(teamRunId);
      if (!manifest) {
        continue;
      }
      rows.push({
        teamRunId,
        teamDefinitionId: manifest.teamDefinitionId,
        teamDefinitionName: manifest.teamDefinitionName,
        workspaceRootPath: manifest.workspaceRootPath,
        summary: "",
        lastActivityAt: manifest.updatedAt || manifest.createdAt || nowIso(),
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

  private resolveSafeTeamDirectory(teamRunId: string): string | null {
    const teamsRoot = path.resolve(this.manifestStore.getTeamDirPath(""));
    const targetPath = path.resolve(this.manifestStore.getTeamDirPath(teamRunId));
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
    return (
      this.teamRunManager.getTeamRun(teamRunId) !== null ||
      this.teamMemberRuntimeOrchestrator?.hasActiveMemberBinding?.(teamRunId) === true
    );
  }

  private async writeMemberRunManifests(
    teamRunId: string,
    manifest: TeamRunManifest,
    lastKnownStatus: TeamRunKnownStatus,
    timestamp: string,
  ): Promise<void> {
    for (const binding of manifest.memberBindings) {
      const memberManifest: TeamMemberRunManifest = {
        version: 1,
        teamRunId,
        runVersion: manifest.runVersion,
        memberRouteKey: binding.memberRouteKey,
        memberName: binding.memberName,
        memberRunId: binding.memberRunId,
        runtimeKind: binding.runtimeKind,
        runtimeReference: binding.runtimeReference ?? null,
        agentDefinitionId: binding.agentDefinitionId,
        llmModelIdentifier: binding.llmModelIdentifier,
        autoExecuteTools: binding.autoExecuteTools,
        llmConfig: binding.llmConfig ?? null,
        workspaceRootPath: binding.workspaceRootPath ?? manifest.workspaceRootPath ?? null,
        lastKnownStatus,
        createdAt: manifest.createdAt,
        updatedAt: timestamp,
      };
      await this.memberRunManifestStore.writeManifest(teamRunId, memberManifest);
    }
  }

  private mergeManifestWithActiveBindings(
    teamRunId: string,
    manifest: TeamRunManifest,
    timestamp: string,
    activeBindingsOverride: TeamRunMemberBinding[] | null = null,
  ): TeamRunManifest {
    const activeBindings =
      activeBindingsOverride ?? this.teamMemberRuntimeOrchestrator?.getActiveMemberBindings?.(teamRunId) ?? [];
    if (activeBindings.length === 0) {
      return manifest;
    }

    const activeBindingByRunId = new Map<string, TeamRunMemberBinding>();
    for (const binding of activeBindings) {
      activeBindingByRunId.set(binding.memberRunId, binding);
    }

    let changed = false;
    const mergedBindings = manifest.memberBindings.map((binding) => {
      const active = activeBindingByRunId.get(binding.memberRunId);
      if (!active) {
        return binding;
      }

      const mergedBinding: TeamRunMemberBinding = {
        ...binding,
        memberRouteKey: active.memberRouteKey,
        memberName: active.memberName,
        memberRunId: active.memberRunId,
        runtimeKind: active.runtimeKind,
        runtimeReference: active.runtimeReference ?? null,
        agentDefinitionId: active.agentDefinitionId,
        llmModelIdentifier: active.llmModelIdentifier,
        autoExecuteTools: active.autoExecuteTools,
        llmConfig: active.llmConfig ?? null,
        workspaceRootPath: active.workspaceRootPath ?? binding.workspaceRootPath,
      };

      if (JSON.stringify(mergedBinding) !== JSON.stringify(binding)) {
        changed = true;
      }
      return mergedBinding;
    });

    if (!changed) {
      return manifest;
    }

    return {
      ...manifest,
      updatedAt: timestamp,
      memberBindings: mergedBindings,
    };
  }
}

let cachedTeamRunHistoryService: TeamRunHistoryService | null = null;

export const getTeamRunHistoryService = (): TeamRunHistoryService => {
  if (!cachedTeamRunHistoryService) {
    cachedTeamRunHistoryService = new TeamRunHistoryService(
      appConfigProvider.config.getMemoryDir(),
      {
        teamMemberRuntimeOrchestrator: getTeamMemberRuntimeOrchestrator(),
      },
    );
  }
  return cachedTeamRunHistoryService;
};
