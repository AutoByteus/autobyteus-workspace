import { randomUUID } from "node:crypto";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { MemberPlacementResolver } from "../../distributed/member-placement/member-placement-resolver.js";
import { TeamRunManifest } from "../../run-history/domain/team-models.js";
import { TeamMemberMemoryLayoutStore } from "../../run-history/store/team-member-memory-layout-store.js";
import {
  buildTeamMemberAgentId,
  normalizeMemberRouteKey,
} from "../../run-history/utils/team-member-agent-id.js";
import { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { TeamMemberConfigInput } from "./agent-team-run-manager.js";
import {
  TeamMemberPlacementPlanningService,
  type PlacementCandidateSnapshotProvider,
} from "./team-member-placement-planning-service.js";
import { TeamRunManifestAssemblyService } from "./team-run-manifest-assembly-service.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const TEAM_ID_SLUG_MAX_LENGTH = 48;

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const buildTeamIdSlug = (teamDefinitionName: string | null | undefined): string => {
  const normalizedName = normalizeOptionalString(teamDefinitionName) ?? "team";
  const slug = normalizedName
    .toLowerCase()
    .replace(/[\/\\]+/g, "_")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!slug) {
    return "team";
  }
  return slug.slice(0, TEAM_ID_SLUG_MAX_LENGTH);
};

export interface PreparedTeamRuntimeBootstrap {
  teamId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  coordinatorMemberName: string | null;
  resolvedMemberConfigs: TeamMemberConfigInput[];
  manifest: TeamRunManifest;
}

export class TeamRuntimeBootstrapApplicationService {
  private static instance: TeamRuntimeBootstrapApplicationService | null = null;

  private readonly teamDefinitionService: AgentTeamDefinitionService;
  private readonly memberLayoutStore: TeamMemberMemoryLayoutStore;
  private readonly placementPlanningService: TeamMemberPlacementPlanningService;
  private readonly manifestAssemblyService: TeamRunManifestAssemblyService;

  static getInstance(): TeamRuntimeBootstrapApplicationService {
    if (!TeamRuntimeBootstrapApplicationService.instance) {
      TeamRuntimeBootstrapApplicationService.instance = new TeamRuntimeBootstrapApplicationService();
    }
    return TeamRuntimeBootstrapApplicationService.instance;
  }

  constructor(
    options: {
      teamDefinitionService?: AgentTeamDefinitionService;
      workspaceManager?: WorkspaceManager;
      placementResolver?: MemberPlacementResolver;
      nodeSnapshotProvider?: PlacementCandidateSnapshotProvider;
      memberLayoutStore?: TeamMemberMemoryLayoutStore;
      placementPlanningService?: TeamMemberPlacementPlanningService;
      manifestAssemblyService?: TeamRunManifestAssemblyService;
    } = {},
  ) {
    this.teamDefinitionService =
      options.teamDefinitionService ?? AgentTeamDefinitionService.getInstance();
    this.memberLayoutStore =
      options.memberLayoutStore ??
      new TeamMemberMemoryLayoutStore(appConfigProvider.config.getMemoryDir());
    this.placementPlanningService =
      options.placementPlanningService ??
      new TeamMemberPlacementPlanningService({
        teamDefinitionService: this.teamDefinitionService,
        placementResolver: options.placementResolver ?? new MemberPlacementResolver(),
        nodeSnapshotProvider: options.nodeSnapshotProvider,
      });
    this.manifestAssemblyService =
      options.manifestAssemblyService ??
      new TeamRunManifestAssemblyService({
        workspaceManager: options.workspaceManager,
      });
  }

  async prepareTeamRuntimeBootstrap(input: {
    teamDefinitionId: string;
    memberConfigs: TeamMemberConfigInput[];
    teamId?: string | null;
  }): Promise<PreparedTeamRuntimeBootstrap> {
    const normalizedTeamDefinitionId = input.teamDefinitionId.trim();
    const metadata = await this.resolveTeamDefinitionMetadata(normalizedTeamDefinitionId);
    const teamId = normalizeOptionalString(input.teamId) ?? this.generateTeamId(metadata.teamDefinitionName);
    const resolvedMemberConfigs = await this.resolveRuntimeMemberConfigs(
      teamId,
      normalizedTeamDefinitionId,
      input.memberConfigs,
    );
    const manifest = this.manifestAssemblyService.buildTeamRunManifest({
      teamId,
      teamDefinitionId: normalizedTeamDefinitionId,
      teamDefinitionName: metadata.teamDefinitionName,
      coordinatorMemberName: metadata.coordinatorMemberName,
      memberConfigs: resolvedMemberConfigs,
      localNodeId: this.placementPlanningService.resolveLocalNodeId(),
    });

    return {
      teamId,
      teamDefinitionId: normalizedTeamDefinitionId,
      teamDefinitionName: metadata.teamDefinitionName,
      coordinatorMemberName: metadata.coordinatorMemberName,
      resolvedMemberConfigs,
      manifest,
    };
  }

  private generateTeamId(teamDefinitionName: string | null | undefined): string {
    const slug = buildTeamIdSlug(teamDefinitionName);
    return `${slug}_${randomUUID().replace(/-/g, "").slice(0, 8)}`;
  }

  private async resolveRuntimeMemberConfigs(
    teamId: string,
    teamDefinitionId: string,
    memberConfigs: TeamMemberConfigInput[],
  ): Promise<TeamMemberConfigInput[]> {
    const localNodeId = this.placementPlanningService.resolveLocalNodeId();
    const hostNodeByRouteKey =
      await this.placementPlanningService.resolveHostNodeIdByMemberRouteKey(teamDefinitionId);
    return memberConfigs.map((config) => {
      const memberName = config.memberName.trim();
      const memberRouteKey = normalizeMemberRouteKey(config.memberRouteKey ?? memberName);
      const memberAgentId =
        typeof config.memberAgentId === "string" && config.memberAgentId.trim().length > 0
          ? config.memberAgentId.trim()
          : buildTeamMemberAgentId(teamId, memberRouteKey);
      const hostNodeId =
        normalizeOptionalString(config.hostNodeId) ?? hostNodeByRouteKey[memberRouteKey] ?? localNodeId;

      return {
        memberName,
        agentDefinitionId: config.agentDefinitionId.trim(),
        llmModelIdentifier: config.llmModelIdentifier.trim(),
        autoExecuteTools: Boolean(config.autoExecuteTools),
        workspaceId: config.workspaceId ?? null,
        workspaceRootPath:
          typeof config.workspaceRootPath === "string" && config.workspaceRootPath.trim().length > 0
            ? config.workspaceRootPath.trim()
            : null,
        llmConfig: config.llmConfig ?? null,
        memberRouteKey,
        memberAgentId,
        memoryDir: this.memberLayoutStore.getMemberDirPath(teamId, memberAgentId),
        hostNodeId,
      };
    });
  }

  private async resolveTeamDefinitionMetadata(teamDefinitionId: string): Promise<{
    teamDefinitionName: string;
    coordinatorMemberName: string | null;
  }> {
    const normalizedId = teamDefinitionId.trim();
    if (!normalizedId) {
      return {
        teamDefinitionName: "",
        coordinatorMemberName: null,
      };
    }

    try {
      const definition = await this.teamDefinitionService.getDefinitionById(normalizedId);
      return {
        teamDefinitionName:
          (typeof definition?.name === "string" && definition.name.trim().length > 0
            ? definition.name.trim()
            : normalizedId),
        coordinatorMemberName:
          typeof definition?.coordinatorMemberName === "string" &&
          definition.coordinatorMemberName.trim().length > 0
            ? definition.coordinatorMemberName.trim()
            : null,
      };
    } catch (error) {
      logger.warn(
        `Failed to resolve team definition metadata for '${normalizedId}', using fallback metadata: ${String(error)}`,
      );
      return {
        teamDefinitionName: normalizedId,
        coordinatorMemberName: null,
      };
    }
  }
}
