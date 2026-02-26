import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  TeamRunHistoryItem,
  TeamRunKnownStatus,
  TeamRunManifest,
} from "../domain/team-models.js";
import { TeamHistoryCleanupDispatcher } from "../distributed/team-history-cleanup-dispatcher.js";
import { TeamRunIndexStore } from "../store/team-run-index-store.js";
import { TeamMemberMemoryLayoutStore } from "../store/team-member-memory-layout-store.js";
import { TeamMemberRunManifestStore } from "../store/team-member-run-manifest-store.js";
import { TeamRunManifestStore } from "../store/team-run-manifest-store.js";
import { TeamHistoryRuntimeStateProbeService } from "./team-history-runtime-state-probe-service.js";
import { TeamRunHistoryCommandService } from "./team-run-history-command-service.js";
import {
  TeamRunHistoryDeleteCoordinatorService,
} from "./team-run-history-delete-coordinator-service.js";
import { TeamRunHistoryQueryService } from "./team-run-history-query-service.js";
import {
  getTeamRunHistoryRuntimeDependencies,
  type TeamRunHistoryRuntimeDependencies,
} from "./team-run-history-runtime-dependencies.js";

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const resolveLocalNodeId = (): string =>
  normalizeOptionalString(process.env.AUTOBYTEUS_NODE_ID) ?? "node-local";

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
  private readonly queryService: TeamRunHistoryQueryService;
  private readonly commandService: TeamRunHistoryCommandService;

  constructor(
    memoryDir: string,
    options: {
      teamRunManager?: AgentTeamRunManager;
      deleteCoordinator?: TeamRunHistoryDeleteCoordinatorService;
      runtimeStateProbeService?: TeamHistoryRuntimeStateProbeService;
      runtimeDependencies?: TeamRunHistoryRuntimeDependencies | null;
    } = {},
  ) {
    const manifestStore = new TeamRunManifestStore(memoryDir);
    const indexStore = new TeamRunIndexStore(memoryDir);
    const memberLayoutStore = new TeamMemberMemoryLayoutStore(memoryDir);
    const memberRunManifestStore = new TeamMemberRunManifestStore(memoryDir);
    const teamRunManager = options.teamRunManager ?? AgentTeamRunManager.getInstance();

    const runtimeDependencies =
      options.runtimeDependencies ?? getTeamRunHistoryRuntimeDependencies();
    const localNodeId = normalizeOptionalString(runtimeDependencies?.hostNodeId) ?? resolveLocalNodeId();
    const dispatcher =
      runtimeDependencies === null
        ? null
        : new TeamHistoryCleanupDispatcher({
            nodeDirectoryService: runtimeDependencies.nodeDirectoryService,
            internalEnvelopeAuth: runtimeDependencies.internalEnvelopeAuth,
            securityMode: runtimeDependencies.transportSecurityMode,
          });

    const runtimeStateProbeService =
      options.runtimeStateProbeService ??
      new TeamHistoryRuntimeStateProbeService({
        teamRunManager,
        runBindingRegistry: runtimeDependencies?.runScopedTeamBindingRegistry ?? {
          listBindingsByTeamId: () => [],
        },
        dispatcher,
        localNodeId,
      });

    const deleteCoordinator =
      options.deleteCoordinator ??
      new TeamRunHistoryDeleteCoordinatorService({
        memberLayoutStore,
        localNodeId,
        dispatcher,
      });

    this.queryService = new TeamRunHistoryQueryService({
      manifestStore,
      indexStore,
      teamRunManager,
    });
    this.commandService = new TeamRunHistoryCommandService({
      manifestStore,
      indexStore,
      memberLayoutStore,
      memberRunManifestStore,
      teamRunManager,
      deleteCoordinator,
      runtimeStateProbeService,
      localNodeId,
    });
  }

  async listTeamRunHistory(): Promise<TeamRunHistoryItem[]> {
    return this.queryService.listTeamRunHistory();
  }

  async upsertTeamRunHistoryRow(options: {
    teamRunId: string;
    manifest: TeamRunManifest;
    summary: string;
    lastKnownStatus?: TeamRunKnownStatus;
    lastActivityAt?: string;
  }): Promise<void> {
    await this.commandService.upsertTeamRunHistoryRow(options);
  }

  async onTeamEvent(teamRunId: string, options: { status?: TeamRunKnownStatus; summary?: string } = {}): Promise<void> {
    await this.commandService.onTeamEvent(teamRunId, options);
  }

  async onTeamTerminated(teamRunId: string): Promise<void> {
    await this.commandService.onTeamTerminated(teamRunId);
  }

  async getTeamRunResumeConfig(teamRunId: string): Promise<TeamRunResumeConfig> {
    return this.queryService.getTeamRunResumeConfig(teamRunId);
  }

  async deleteTeamRunHistory(teamRunId: string): Promise<TeamRunDeleteHistoryResult> {
    return this.commandService.deleteTeamRunHistory(teamRunId);
  }

  async rebuildIndexFromDisk() {
    return this.queryService.rebuildIndexFromDisk();
  }
}

let cachedTeamRunHistoryService: TeamRunHistoryService | null = null;

export const getTeamRunHistoryService = (): TeamRunHistoryService => {
  if (!cachedTeamRunHistoryService) {
    cachedTeamRunHistoryService = new TeamRunHistoryService(appConfigProvider.config.getMemoryDir());
  }
  return cachedTeamRunHistoryService;
};

export const resetTeamRunHistoryServiceCache = (): void => {
  cachedTeamRunHistoryService = null;
};
