import { TeamRunManifest } from "../../run-history/domain/team-models.js";
import {
  buildTeamMemberAgentId,
  normalizeMemberRouteKey,
} from "../../run-history/utils/team-member-agent-id.js";
import { getWorkspaceManager, WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { TeamMemberConfigInput } from "./agent-team-run-manager.js";

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export class TeamRunManifestAssemblyService {
  private readonly workspaceManager: WorkspaceManager;

  constructor(options: { workspaceManager?: WorkspaceManager } = {}) {
    this.workspaceManager = options.workspaceManager ?? getWorkspaceManager();
  }

  buildTeamRunManifest(options: {
    teamId: string;
    teamDefinitionId: string;
    teamDefinitionName: string;
    coordinatorMemberName?: string | null;
    memberConfigs: TeamMemberConfigInput[];
    localNodeId: string;
  }): TeamRunManifest {
    const now = new Date().toISOString();
    const memberBindings = options.memberConfigs.map((config) => {
      const memberName = config.memberName.trim();
      const routeKey = normalizeMemberRouteKey(config.memberRouteKey ?? memberName);
      const memberAgentId =
        typeof config.memberAgentId === "string" && config.memberAgentId.trim().length > 0
          ? config.memberAgentId.trim()
          : buildTeamMemberAgentId(options.teamId, routeKey);

      return {
        memberRouteKey: routeKey,
        memberName,
        memberAgentId,
        agentDefinitionId: config.agentDefinitionId.trim(),
        llmModelIdentifier: config.llmModelIdentifier.trim(),
        autoExecuteTools: Boolean(config.autoExecuteTools),
        llmConfig: config.llmConfig ?? null,
        workspaceRootPath: this.resolveWorkspaceRootPath(config),
        hostNodeId: normalizeOptionalString(config.hostNodeId) ?? options.localNodeId,
      };
    });

    const normalizedCoordinatorName =
      typeof options.coordinatorMemberName === "string" &&
      options.coordinatorMemberName.trim().length > 0
        ? options.coordinatorMemberName.trim()
        : null;
    const coordinatorMemberRouteKey =
      (normalizedCoordinatorName
        ? memberBindings.find((binding) => binding.memberName === normalizedCoordinatorName)
            ?.memberRouteKey ??
          memberBindings.find(
            (binding) => binding.memberRouteKey === normalizeMemberRouteKey(normalizedCoordinatorName),
          )?.memberRouteKey
        : null) ??
      memberBindings[0]?.memberRouteKey ??
      "coordinator";

    return {
      teamRunId: options.teamId,
      teamDefinitionId: options.teamDefinitionId.trim(),
      teamDefinitionName: options.teamDefinitionName.trim() || options.teamDefinitionId.trim(),
      coordinatorMemberRouteKey,
      runVersion: 1,
      createdAt: now,
      updatedAt: now,
      memberBindings,
    };
  }

  private resolveWorkspaceRootPath(config: TeamMemberConfigInput): string | null {
    if (typeof config.workspaceRootPath === "string" && config.workspaceRootPath.trim().length > 0) {
      return config.workspaceRootPath.trim();
    }
    if (typeof config.workspaceId !== "string" || config.workspaceId.trim().length === 0) {
      return null;
    }
    const workspace = this.workspaceManager.getWorkspaceById(config.workspaceId.trim());
    if (!workspace) {
      return null;
    }
    const rootPath =
      typeof (workspace as { rootPath?: unknown }).rootPath === "string"
        ? ((workspace as { rootPath: string }).rootPath ?? null)
        : typeof workspace.getBasePath === "function"
          ? workspace.getBasePath()
          : null;
    if (typeof rootPath !== "string") {
      return null;
    }
    const normalized = rootPath.trim();
    return normalized.length > 0 ? normalized : null;
  }
}
