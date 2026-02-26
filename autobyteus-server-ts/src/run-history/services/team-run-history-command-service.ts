import type { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import {
  TeamRunIndexRow,
  TeamRunKnownStatus,
  TeamRunManifest,
} from "../domain/team-models.js";
import { TeamMemberMemoryLayoutStore } from "../store/team-member-memory-layout-store.js";
import { TeamMemberRunManifestStore } from "../store/team-member-run-manifest-store.js";
import { TeamRunIndexStore } from "../store/team-run-index-store.js";
import { TeamRunManifestStore } from "../store/team-run-manifest-store.js";
import { TeamHistoryRuntimeStateProbeService } from "./team-history-runtime-state-probe-service.js";
import {
  TeamRunHistoryDeleteCoordinatorService,
  type TeamRunHistoryDeleteCoordinatorResult,
} from "./team-run-history-delete-coordinator-service.js";
import type { TeamRunDeleteHistoryResult } from "./team-run-history-service.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const nowIso = (): string => new Date().toISOString();

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

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

export class TeamRunHistoryCommandService {
  private readonly manifestStore: TeamRunManifestStore;
  private readonly indexStore: TeamRunIndexStore;
  private readonly memberLayoutStore: TeamMemberMemoryLayoutStore;
  private readonly memberRunManifestStore: TeamMemberRunManifestStore;
  private readonly teamRunManager: AgentTeamRunManager;
  private readonly deleteCoordinator: TeamRunHistoryDeleteCoordinatorService;
  private readonly runtimeStateProbeService: TeamHistoryRuntimeStateProbeService;
  private readonly localNodeId: string;

  constructor(input: {
    manifestStore: TeamRunManifestStore;
    indexStore: TeamRunIndexStore;
    memberLayoutStore: TeamMemberMemoryLayoutStore;
    memberRunManifestStore: TeamMemberRunManifestStore;
    teamRunManager: AgentTeamRunManager;
    deleteCoordinator: TeamRunHistoryDeleteCoordinatorService;
    runtimeStateProbeService: TeamHistoryRuntimeStateProbeService;
    localNodeId: string;
  }) {
    this.manifestStore = input.manifestStore;
    this.indexStore = input.indexStore;
    this.memberLayoutStore = input.memberLayoutStore;
    this.memberRunManifestStore = input.memberRunManifestStore;
    this.teamRunManager = input.teamRunManager;
    this.deleteCoordinator = input.deleteCoordinator;
    this.runtimeStateProbeService = input.runtimeStateProbeService;
    this.localNodeId = input.localNodeId;
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
      summary: compactSummary(options.summary),
      lastActivityAt: options.lastActivityAt ?? nowIso(),
      lastKnownStatus: options.lastKnownStatus ?? "ACTIVE",
      deleteLifecycle: "READY",
    };
    await this.manifestStore.writeManifest(options.teamRunId, options.manifest);
    await this.memberLayoutStore.ensureLocalMemberSubtrees(
      options.teamRunId,
      this.resolveLocalMemberAgentIds(options.manifest),
    );
    await this.upsertLocalMemberRunManifests(options.teamRunId, options.manifest, row.lastKnownStatus);
    await this.indexStore.upsertRow(row);
  }

  async onTeamEvent(teamRunId: string, options: { status?: TeamRunKnownStatus; summary?: string } = {}): Promise<void> {
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
        summary: compactSummary(options.summary ?? ""),
        lastActivityAt: nowIso(),
        lastKnownStatus: options.status ?? "ACTIVE",
        deleteLifecycle: "READY",
      });
      return;
    }
    await this.indexStore.updateRow(teamRunId, {
      lastActivityAt: nowIso(),
      summary: options.summary !== undefined ? compactSummary(options.summary) : existing.summary,
      lastKnownStatus: options.status ?? existing.lastKnownStatus,
    });
  }

  async onTeamTerminated(teamRunId: string): Promise<void> {
    await this.indexStore.updateRow(teamRunId, {
      lastKnownStatus: "IDLE",
      lastActivityAt: nowIso(),
    });
  }

  async deleteTeamRunHistory(teamRunId: string): Promise<TeamRunDeleteHistoryResult> {
    const normalizedTeamId = teamRunId.trim();
    if (!normalizedTeamId) {
      return {
        success: false,
        message: "Team ID is required.",
      };
    }

    try {
      const [manifest, existingRow] = await Promise.all([
        this.manifestStore.readManifest(normalizedTeamId),
        this.indexStore.getRow(normalizedTeamId),
      ]);

      if (!manifest) {
        await this.indexStore.removeRow(normalizedTeamId);
        await this.memberLayoutStore.removeTeamDirPath(normalizedTeamId);
        return {
          success: true,
          message: `Team run '${normalizedTeamId}' is already deleted.`,
        };
      }

      const preflight = await this.runtimeStateProbeService.probeDeletePrecondition(
        normalizedTeamId,
        manifest,
      );
      if (!preflight.canDelete) {
        return {
          success: false,
          message: preflight.retryable
            ? `Delete preflight is retryable for '${normalizedTeamId}': ${preflight.detail}`
            : `Delete blocked for '${normalizedTeamId}': ${preflight.detail}`,
        };
      }

      if (!existingRow) {
        await this.indexStore.upsertRow({
          teamRunId: normalizedTeamId,
          teamDefinitionId: manifest.teamDefinitionId,
          teamDefinitionName: manifest.teamDefinitionName,
          summary: "",
          lastActivityAt: nowIso(),
          lastKnownStatus: "IDLE",
          deleteLifecycle: "READY",
        });
      }

      await this.indexStore.updateRow(normalizedTeamId, {
        deleteLifecycle: "CLEANUP_PENDING",
        lastActivityAt: nowIso(),
      });

      const deleteResult = await this.deleteCoordinator.executeDeletePlan(normalizedTeamId, manifest);
      if (deleteResult.status === "PENDING_RETRY") {
        await this.indexStore.updateRow(normalizedTeamId, {
          deleteLifecycle: "CLEANUP_PENDING",
          lastActivityAt: nowIso(),
        });
        return {
          success: false,
          message: `Team run '${normalizedTeamId}' cleanup pending on nodes: ${deleteResult.pendingNodeIds.join(", ")}.`,
        };
      }

      await this.finalizeDelete(normalizedTeamId, deleteResult);
      return {
        success: true,
        message: `Team run '${normalizedTeamId}' deleted permanently.`,
      };
    } catch (error) {
      logger.warn(`Failed to delete team run history '${normalizedTeamId}': ${String(error)}`);
      return {
        success: false,
        message: `Failed to delete team run history '${normalizedTeamId}'.`,
      };
    }
  }

  private async finalizeDelete(
    teamRunId: string,
    _deleteResult: TeamRunHistoryDeleteCoordinatorResult,
  ): Promise<void> {
    await this.memberLayoutStore.removeTeamDirPath(teamRunId);
    await this.indexStore.removeRow(teamRunId);
  }

  private resolveLocalMemberAgentIds(manifest: TeamRunManifest): string[] {
    return this.resolveLocalMemberBindings(manifest)
      .map((binding) => normalizeRequiredString(binding.memberAgentId, "memberAgentId"));
  }

  private resolveLocalMemberBindings(manifest: TeamRunManifest): TeamRunManifest["memberBindings"] {
    return manifest.memberBindings
      .filter((binding) => {
        const hostNodeId = normalizeOptionalString(binding.hostNodeId);
        if (!hostNodeId || hostNodeId === "embedded-local" || hostNodeId === "local") {
          return true;
        }
        return hostNodeId === this.localNodeId;
      });
  }

  private async upsertLocalMemberRunManifests(
    teamRunId: string,
    manifest: TeamRunManifest,
    lastKnownStatus: TeamRunKnownStatus,
  ): Promise<void> {
    const localBindings = this.resolveLocalMemberBindings(manifest);
    await Promise.all(
      localBindings.map((binding) =>
        this.memberRunManifestStore.writeManifest(teamRunId, {
          version: 1,
          teamRunId,
          runVersion: manifest.runVersion,
          memberRouteKey: binding.memberRouteKey,
          memberName: binding.memberName,
          memberAgentId: binding.memberAgentId,
          hostNodeId: binding.hostNodeId ?? null,
          agentDefinitionId: binding.agentDefinitionId,
          llmModelIdentifier: binding.llmModelIdentifier,
          autoExecuteTools: binding.autoExecuteTools,
          llmConfig: binding.llmConfig ?? null,
          workspaceRootPath: binding.workspaceRootPath ?? null,
          lastKnownStatus,
          createdAt: manifest.createdAt,
          updatedAt: manifest.updatedAt,
        }),
      ),
    );
  }
}
