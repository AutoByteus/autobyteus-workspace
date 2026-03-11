import { AgentTeamRunManager } from "./agent-team-run-manager.js";
import { getTeamMemberRuntimeOrchestrator } from "./team-member-runtime-orchestrator.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import {
  TeamMemberRuntimeReference,
  TeamRunManifest,
  TeamRunMemberBinding,
} from "../../run-history/domain/team-models.js";
import { getTeamRunHistoryService } from "../../run-history/services/team-run-history-service.js";
import { TeamMemberMemoryLayoutStore } from "../../run-history/store/team-member-memory-layout-store.js";
import {
  buildTeamMemberRunId,
  normalizeMemberRouteKey,
} from "../../run-history/utils/team-member-run-id.js";
import { generateTeamRunId } from "../../run-history/utils/team-run-id.js";
import {
  DEFAULT_RUNTIME_KIND,
  isRuntimeKind,
  type RuntimeKind,
} from "../../runtime-management/runtime-kind.js";
import {
  getRuntimeAdapterRegistry,
  type RuntimeAdapterRegistry,
} from "../../runtime-execution/runtime-adapter-registry.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { resolveTeamRuntimeMode } from "../../api/graphql/services/team-runtime-mode-policy.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

export interface TeamRunLaunchMemberConfigInput {
  memberName: string;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  workspaceId?: string | null;
  workspaceRootPath?: string | null;
  llmConfig?: Record<string, unknown> | null;
  memberRouteKey?: string | null;
  memberRunId?: string | null;
  runtimeKind?: string | null;
}

export interface TeamRunLaunchPresetInput {
  workspaceRootPath: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  runtimeKind: RuntimeKind;
  llmConfig?: Record<string, unknown> | null;
}

export type TeamRuntimeMemberConfig = {
  memberName: string;
  runtimeKind: RuntimeKind;
  runtimeReference?: TeamMemberRuntimeReference | null;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  workspaceId?: string | null;
  memoryDir?: string | null;
  workspaceRootPath?: string | null;
  llmConfig?: Record<string, unknown> | null;
  memberRouteKey: string;
  memberRunId: string;
};

export type EnsureTeamRunInput = {
  teamDefinitionId: string;
  memberConfigs: TeamRunLaunchMemberConfigInput[];
  preferredTeamRunId?: string | null;
  initialSummary?: string | null;
};

export type EnsureTeamRunResult = {
  teamRunId: string;
  runtimeMode: "native_team" | "member_runtime";
};

export class TeamRunLaunchService {
  private readonly teamRunHistoryService = getTeamRunHistoryService();
  private readonly teamMemberRuntimeOrchestrator = getTeamMemberRuntimeOrchestrator();
  private readonly teamDefinitionService = AgentTeamDefinitionService.getInstance();
  private readonly workspaceManager = getWorkspaceManager();
  private readonly runtimeAdapterRegistry: RuntimeAdapterRegistry = getRuntimeAdapterRegistry();
  private readonly teamMemberMemoryLayoutStore = new TeamMemberMemoryLayoutStore(
    appConfigProvider.config.getMemoryDir(),
  );

  private get agentTeamRunManager(): AgentTeamRunManager {
    return AgentTeamRunManager.getInstance();
  }

  async buildMemberConfigsFromLaunchPreset(input: {
    teamDefinitionId: string;
    launchPreset: TeamRunLaunchPresetInput;
  }): Promise<TeamRunLaunchMemberConfigInput[]> {
    const teamDefinitionId = normalizeRequiredString(input.teamDefinitionId, "teamDefinitionId");
    const launchPreset = normalizeLaunchPreset(input.launchPreset);
    const leafMembers = await this.collectLeafAgentMembers(teamDefinitionId, new Set());

    return leafMembers.map((member) => ({
      memberName: member.memberName,
      memberRouteKey: member.memberRouteKey,
      agentDefinitionId: member.agentDefinitionId,
      llmModelIdentifier: launchPreset.llmModelIdentifier,
      autoExecuteTools: launchPreset.autoExecuteTools,
      workspaceRootPath: launchPreset.workspaceRootPath,
      llmConfig: launchPreset.llmConfig ?? null,
      runtimeKind: launchPreset.runtimeKind,
    }));
  }

  async ensureTeamRun(input: EnsureTeamRunInput): Promise<EnsureTeamRunResult> {
    const teamDefinitionId = normalizeRequiredString(input.teamDefinitionId, "teamDefinitionId");
    const metadata = await this.resolveTeamDefinitionMetadata(teamDefinitionId);
    const preferredTeamRunId =
      typeof input.preferredTeamRunId === "string" && input.preferredTeamRunId.trim().length > 0
        ? input.preferredTeamRunId.trim()
        : null;
    const teamRunId =
      preferredTeamRunId ??
      generateTeamRunId(metadata.teamDefinitionName || teamDefinitionId);
    const memberConfigs = await Promise.all(
      input.memberConfigs.map(async (config) => ({
        ...config,
        workspaceId: await this.resolveWorkspaceId(config),
        llmConfig: config.llmConfig ?? null,
      })),
    );
    const resolvedMemberConfigs = this.resolveRuntimeMemberConfigs(teamRunId, memberConfigs);
    const runtimeMode = resolveTeamRuntimeMode(resolvedMemberConfigs, this.runtimeAdapterRegistry);
    let memberBindingsOverride: TeamRunMemberBinding[] | null = null;

    if (runtimeMode === "member_runtime") {
      memberBindingsOverride = await this.teamMemberRuntimeOrchestrator.createMemberRuntimeSessions(
        teamRunId,
        teamDefinitionId,
        resolvedMemberConfigs,
      );
    } else {
      this.teamMemberRuntimeOrchestrator.removeTeam(teamRunId);
      await this.agentTeamRunManager.createTeamRunWithId(
        teamRunId,
        teamDefinitionId,
        resolvedMemberConfigs,
      );
    }

    const manifest = this.buildTeamRunManifest({
      teamRunId,
      teamDefinitionId,
      teamDefinitionName: metadata.teamDefinitionName,
      coordinatorMemberName: metadata.coordinatorMemberName,
      memberConfigs: resolvedMemberConfigs,
      memberBindingsOverride,
    });
    await this.teamRunHistoryService.upsertTeamRunHistoryRow({
      teamRunId,
      manifest,
      summary: input.initialSummary ?? "",
      lastKnownStatus: "IDLE",
    });

    logger.info(
      `Team run '${teamRunId}' ensured for team definition '${teamDefinitionId}' in mode '${runtimeMode}'.`,
    );
    return { teamRunId, runtimeMode };
  }

  private async collectLeafAgentMembers(
    teamDefinitionId: string,
    visited: Set<string>,
  ): Promise<Array<{ memberName: string; memberRouteKey: string; agentDefinitionId: string }>> {
    const normalizedTeamDefinitionId = normalizeRequiredString(teamDefinitionId, "teamDefinitionId");
    if (visited.has(normalizedTeamDefinitionId)) {
      throw new Error(
        `Circular dependency detected in team definitions involving ID: ${normalizedTeamDefinitionId}`,
      );
    }
    visited.add(normalizedTeamDefinitionId);

    const teamDefinition =
      await this.teamDefinitionService.getDefinitionById(normalizedTeamDefinitionId);
    if (!teamDefinition) {
      throw new Error(`AgentTeamDefinition with ID ${normalizedTeamDefinitionId} not found.`);
    }

    const members: Array<{
      memberName: string;
      memberRouteKey: string;
      agentDefinitionId: string;
    }> = [];

    for (const node of teamDefinition.nodes) {
      if (node.refType === "agent") {
        members.push({
          memberName: node.memberName.trim(),
          memberRouteKey: normalizeMemberRouteKey(node.memberName),
          agentDefinitionId: normalizeRequiredString(node.ref, "agentDefinitionId"),
        });
        continue;
      }

      members.push(...(await this.collectLeafAgentMembers(node.ref, new Set(visited))));
    }

    return members;
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

    const definition = await this.teamDefinitionService.getDefinitionById(normalizedId);
    return {
      teamDefinitionName:
        typeof definition?.name === "string" && definition.name.trim().length > 0
          ? definition.name.trim()
          : normalizedId,
      coordinatorMemberName:
        typeof definition?.coordinatorMemberName === "string" &&
        definition.coordinatorMemberName.trim().length > 0
          ? definition.coordinatorMemberName.trim()
          : null,
    };
  }

  private async resolveWorkspaceId(
    config: TeamRunLaunchMemberConfigInput,
  ): Promise<string | null> {
    const workspaceId =
      typeof config.workspaceId === "string" && config.workspaceId.trim().length > 0
        ? config.workspaceId.trim()
        : null;
    if (workspaceId) {
      return workspaceId;
    }

    const workspaceRootPath =
      typeof config.workspaceRootPath === "string" && config.workspaceRootPath.trim().length > 0
        ? config.workspaceRootPath.trim()
        : null;
    if (!workspaceRootPath) {
      return null;
    }

    const workspace = await this.workspaceManager.ensureWorkspaceByRootPath(workspaceRootPath);
    return workspace.workspaceId;
  }

  private resolveWorkspaceRootPath(config: TeamRuntimeMemberConfig): string | null {
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

  private resolveTeamWorkspaceRootPath(memberConfigs: TeamRuntimeMemberConfig[]): string | null {
    const workspaceRootPaths = memberConfigs
      .map((config) => this.resolveWorkspaceRootPath(config))
      .filter((value): value is string => Boolean(value));

    if (workspaceRootPaths.length === 0) {
      return null;
    }

    const uniqueRoots = Array.from(new Set(workspaceRootPaths));
    if (uniqueRoots.length > 1) {
      logger.warn(
        `Team run member workspace roots diverged (${uniqueRoots.join(", ")}); using first root for team grouping.`,
      );
    }

    return uniqueRoots[0] ?? null;
  }

  private resolveRuntimeKind(config: TeamRunLaunchMemberConfigInput): RuntimeKind {
    const raw =
      typeof config.runtimeKind === "string" && config.runtimeKind.trim().length > 0
        ? config.runtimeKind.trim()
        : null;
    if (!raw) {
      return DEFAULT_RUNTIME_KIND;
    }
    if (!isRuntimeKind(raw)) {
      throw new Error(
        `[INVALID_RUNTIME_KIND] Unsupported runtime kind '${raw}' for member '${config.memberName}'.`,
      );
    }
    return raw;
  }

  private resolveRuntimeMemberConfigs(
    teamRunId: string,
    memberConfigs: TeamRunLaunchMemberConfigInput[],
  ): TeamRuntimeMemberConfig[] {
    return memberConfigs.map((config) => {
      const memberName = normalizeRequiredString(config.memberName, "memberName");
      const memberRouteKey = normalizeMemberRouteKey(config.memberRouteKey ?? memberName);
      const memberRunId =
        typeof config.memberRunId === "string" && config.memberRunId.trim().length > 0
          ? config.memberRunId.trim()
          : buildTeamMemberRunId(teamRunId, memberRouteKey);

      const resolvedConfig: TeamRuntimeMemberConfig = {
        memberName,
        runtimeKind: this.resolveRuntimeKind(config),
        runtimeReference: null,
        agentDefinitionId: normalizeRequiredString(
          config.agentDefinitionId,
          "agentDefinitionId",
        ),
        llmModelIdentifier: normalizeRequiredString(
          config.llmModelIdentifier,
          "llmModelIdentifier",
        ),
        autoExecuteTools: Boolean(config.autoExecuteTools),
        workspaceId: config.workspaceId ?? null,
        memoryDir: this.teamMemberMemoryLayoutStore.getMemberDirPath(teamRunId, memberRunId),
        workspaceRootPath:
          typeof config.workspaceRootPath === "string" && config.workspaceRootPath.trim().length > 0
            ? config.workspaceRootPath.trim()
            : null,
        llmConfig: config.llmConfig ?? null,
        memberRouteKey,
        memberRunId,
      };

      return {
        ...resolvedConfig,
        workspaceRootPath: this.resolveWorkspaceRootPath(resolvedConfig),
      };
    });
  }

  private buildTeamRunManifest(options: {
    teamRunId: string;
    teamDefinitionId: string;
    teamDefinitionName: string;
    coordinatorMemberName?: string | null;
    memberConfigs: TeamRuntimeMemberConfig[];
    memberBindingsOverride?: TeamRunMemberBinding[] | null;
  }): TeamRunManifest {
    const now = new Date().toISOString();
    const memberBindings =
      options.memberBindingsOverride && options.memberBindingsOverride.length > 0
        ? options.memberBindingsOverride.map((binding) => {
            const normalizedRouteKey = normalizeMemberRouteKey(binding.memberRouteKey);
            const sourceConfig =
              options.memberConfigs.find(
                (config) =>
                  normalizeMemberRouteKey(config.memberRouteKey ?? config.memberName) ===
                  normalizedRouteKey,
              ) ?? null;
            const fallbackWorkspaceRootPath = sourceConfig
              ? this.resolveWorkspaceRootPath(sourceConfig)
              : null;

            return {
              ...binding,
              memberRouteKey: normalizedRouteKey,
              memberName: binding.memberName.trim(),
              memberRunId: binding.memberRunId.trim(),
              runtimeKind: binding.runtimeKind,
              runtimeReference: binding.runtimeReference ?? null,
              agentDefinitionId: binding.agentDefinitionId.trim(),
              llmModelIdentifier: binding.llmModelIdentifier.trim(),
              autoExecuteTools: Boolean(binding.autoExecuteTools),
              llmConfig: binding.llmConfig ?? null,
              workspaceRootPath: binding.workspaceRootPath ?? fallbackWorkspaceRootPath ?? null,
            };
          })
        : options.memberConfigs.map((config) => {
            const memberName = config.memberName.trim();
            const routeKey = normalizeMemberRouteKey(config.memberRouteKey ?? config.memberName);
            const memberRunId =
              typeof config.memberRunId === "string" && config.memberRunId.trim().length > 0
                ? config.memberRunId.trim()
                : buildTeamMemberRunId(options.teamRunId, routeKey);

            return {
              memberRouteKey: routeKey,
              memberName,
              memberRunId,
              runtimeKind: config.runtimeKind,
              runtimeReference: config.runtimeReference ?? null,
              agentDefinitionId: config.agentDefinitionId.trim(),
              llmModelIdentifier: config.llmModelIdentifier.trim(),
              autoExecuteTools: Boolean(config.autoExecuteTools),
              llmConfig: config.llmConfig ?? null,
              workspaceRootPath: this.resolveWorkspaceRootPath(config),
            };
          });

    const normalizedCoordinatorName =
      typeof options.coordinatorMemberName === "string" && options.coordinatorMemberName.trim().length > 0
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
      teamRunId: options.teamRunId,
      teamDefinitionId: options.teamDefinitionId.trim(),
      teamDefinitionName: options.teamDefinitionName.trim() || options.teamDefinitionId.trim(),
      workspaceRootPath:
        options.memberBindingsOverride && options.memberBindingsOverride.length > 0
          ? this.resolveTeamWorkspaceRootPath(
              options.memberBindingsOverride.map((binding) => ({
                memberName: binding.memberName,
                runtimeKind: binding.runtimeKind,
                runtimeReference: binding.runtimeReference ?? null,
                agentDefinitionId: binding.agentDefinitionId,
                llmModelIdentifier: binding.llmModelIdentifier,
                autoExecuteTools: binding.autoExecuteTools,
                workspaceId: null,
                workspaceRootPath: binding.workspaceRootPath ?? null,
                llmConfig: binding.llmConfig ?? null,
                memberRouteKey: binding.memberRouteKey,
                memberRunId: binding.memberRunId,
              })),
            )
          : this.resolveTeamWorkspaceRootPath(options.memberConfigs),
      coordinatorMemberRouteKey,
      runVersion: 1,
      createdAt: now,
      updatedAt: now,
      memberBindings,
    };
  }
}

let cachedTeamRunLaunchService: TeamRunLaunchService | null = null;

export const getTeamRunLaunchService = (): TeamRunLaunchService => {
  if (!cachedTeamRunLaunchService) {
    cachedTeamRunLaunchService = new TeamRunLaunchService();
  }
  return cachedTeamRunLaunchService;
};

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const normalizeLaunchPreset = (
  value: TeamRunLaunchPresetInput,
): TeamRunLaunchPresetInput => ({
  workspaceRootPath: normalizeRequiredString(
    value.workspaceRootPath,
    "teamLaunchPreset.workspaceRootPath",
  ),
  llmModelIdentifier: normalizeRequiredString(
    value.llmModelIdentifier,
    "teamLaunchPreset.llmModelIdentifier",
  ),
  runtimeKind: value.runtimeKind,
  autoExecuteTools: Boolean(value.autoExecuteTools),
  llmConfig: value.llmConfig ?? null,
});
