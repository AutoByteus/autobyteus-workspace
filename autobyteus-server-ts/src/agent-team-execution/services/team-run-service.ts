import { TeamRun } from "../domain/team-run.js";
import {
  type TeamMemberRunConfig,
  TeamRunConfig,
  type TeamRunMemberConfig,
  type TeamRunMemberConfigInput as DomainTeamRunMemberConfigInput,
} from "../domain/team-run-config.js";
import { AgentTeamRunManager } from "./agent-team-run-manager.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  RuntimeKind,
  runtimeKindFromString,
} from "../../runtime-management/runtime-kind-enum.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { FILESYSTEM_WORKSPACE_ID_PREFIX } from "../../workspaces/workspace-registry-store.js";
import { canonicalizeWorkspaceRootPath } from "../../workspaces/workspace-path-utils.js";
import {
  AgentMemoryLocationService,
  getAgentMemoryLocationService,
} from "../../agent-memory/services/agent-memory-location-service.js";
import {
  TeamRunMetadataService,
  getTeamRunMetadataService,
} from "../../run-history/services/team-run-metadata-service.js";
import {
  TeamRunHistoryCatalogService,
  getTeamRunHistoryCatalogService,
} from "../../run-history/services/team-run-history-catalog-service.js";
import {
  SkillAccessMode,
} from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { ObservedRunLifecycleEvent } from "../../runtime-management/domain/observed-run-lifecycle-event.js";
import { TeamRunEventSourceType } from "../domain/team-run-event.js";
import { TeamRunMetadataMapper } from "./team-run-metadata-mapper.js";
import { TeamDefinitionTopologyPlanner } from "./team-definition-topology-planner.js";
import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import { TeamBackendKind } from "../domain/team-backend-kind.js";
import { generateTeamRunIdForDefinitionName } from "../domain/team-run-id.js";
import { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import { TeamRunLaunchIdentityAssignment } from "./team-run-launch-identity-assignment.js";

export interface TeamRunPresetInput {
  workspaceRootPath: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode;
  runtimeKind: RuntimeKind;
  llmConfig?: Record<string, unknown> | null;
}

type TeamRunMemberConfigInput = {
  memberKind?: "agent" | null;
  memberName: string;
  memberPath?: string[] | null;
  memberRouteKey?: string | null;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode;
  workspaceId?: string | null;
  workspaceRootPath?: string | null;
  memoryDir?: string | null;
  llmConfig?: Record<string, unknown> | null;
  runtimeKind?: RuntimeKind | string | null;
  applicationExecutionContext?: ApplicationExecutionContext | null;
};

export interface CreateTeamRunInput {
  teamDefinitionId: string;
  memberConfigs: TeamRunMemberConfigInput[];
}

const hasNonBlankString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const assertPublicLaunchInputHasNoManualRunIds = (
  memberConfigs: readonly unknown[],
): void => {
  for (const rawMemberConfig of memberConfigs) {
    const memberConfig = rawMemberConfig as Record<string, unknown>;
    const memberLabel = String(
      memberConfig.memberRouteKey ?? memberConfig.memberName ?? "unknown",
    );
    if (hasNonBlankString(memberConfig.memberRunId)) {
      throw new Error(`Public team launch cannot supply memberRunId for member '${memberLabel}'.`);
    }
    if (hasNonBlankString(memberConfig.childTeamRunId)) {
      throw new Error(`Public team launch cannot supply childTeamRunId for member '${memberLabel}'.`);
    }
    if (Array.isArray(memberConfig.memberConfigs)) {
      assertPublicLaunchInputHasNoManualRunIds(memberConfig.memberConfigs);
    }
  }
};

export class TeamRunService {
  private readonly teamDefinitionService: AgentTeamDefinitionService;
  private readonly agentTeamRunManager: AgentTeamRunManager;
  private readonly teamRunMetadataService: TeamRunMetadataService;
  private readonly teamRunHistoryCatalogService: TeamRunHistoryCatalogService;
  private readonly workspaceManager: WorkspaceManager;
  private readonly memoryLocationService: AgentMemoryLocationService;
  private readonly agentRunIdentityAllocator: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;

  constructor(options: {
    agentTeamRunManager?: AgentTeamRunManager;
    teamDefinitionService?: AgentTeamDefinitionService;
    teamRunMetadataService?: TeamRunMetadataService;
    teamRunHistoryCatalogService?: TeamRunHistoryCatalogService;
    workspaceManager?: WorkspaceManager;
    memoryDir?: string;
    memoryLocationService?: AgentMemoryLocationService;
    agentRunIdentityAllocator?: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
  } = {}) {
    this.agentTeamRunManager =
      options.agentTeamRunManager ?? AgentTeamRunManager.getInstance();
    this.teamDefinitionService =
      options.teamDefinitionService ?? AgentTeamDefinitionService.getInstance();
    this.teamRunMetadataService =
      options.teamRunMetadataService ?? getTeamRunMetadataService();
    this.teamRunHistoryCatalogService =
      options.teamRunHistoryCatalogService ?? getTeamRunHistoryCatalogService();
    this.workspaceManager = options.workspaceManager ?? getWorkspaceManager();
    this.memoryLocationService =
      options.memoryLocationService ??
      (options.memoryDir
        ? new AgentMemoryLocationService({ memoryDir: options.memoryDir })
        : getAgentMemoryLocationService());
    this.agentRunIdentityAllocator =
      options.agentRunIdentityAllocator ?? new AgentRunIdentityAllocator({
        memoryDir: options.memoryDir ?? appConfigProvider.config.getMemoryDir(),
      });
  }

  async buildMemberConfigsFromLaunchPreset(input: {
    teamDefinitionId: string;
    launchPreset: TeamRunPresetInput;
  }): Promise<TeamMemberRunConfig[]> {
    const teamDefinitionId = normalizeRequiredString(input.teamDefinitionId, "teamDefinitionId");
    const launchPreset = normalizeLaunchPreset(input.launchPreset);
    const leafMemberInputs = await this.teamDefinitionTopologyPlanner.buildPresetLeafMemberConfigs({
      teamDefinitionId,
      launchPreset: {
        llmModelIdentifier: launchPreset.llmModelIdentifier,
        autoExecuteTools: launchPreset.autoExecuteTools,
        skillAccessMode: launchPreset.skillAccessMode,
        workspaceRootPath: launchPreset.workspaceRootPath,
        llmConfig: launchPreset.llmConfig ?? null,
        runtimeKind: launchPreset.runtimeKind,
      },
    });

    return new TeamRunConfig({
      teamDefinitionId,
      teamBackendKind: TeamBackendKind.MIXED,
      memberConfigs: leafMemberInputs,
    }).memberConfigs;
  }

  async observeTeamRunLifecycle(
    teamRunId: string,
    listener: (event: ObservedRunLifecycleEvent) => void,
  ): Promise<(() => void) | null> {
    const run = await this.resolveTeamRun(teamRunId);
    if (!run) {
      return null;
    }

    listener({
      runtimeSubject: "TEAM_RUN",
      runId: run.runId,
      phase: "ATTACHED",
      occurredAt: new Date().toISOString(),
    });

    let terminalPhase: ObservedRunLifecycleEvent["phase"] | null = null;
    const unsubscribe = run.subscribeToEvents((event) => {
      if (terminalPhase) {
        return;
      }

      if (event.eventSourceType === TeamRunEventSourceType.TEAM) {
        const payload = event.data as Record<string, unknown>;
        const status = typeof payload.status === "string" ? payload.status.trim().toLowerCase() : "";
        if (status === "error") {
          terminalPhase = "FAILED";
          listener({
            runtimeSubject: "TEAM_RUN",
            runId: run.runId,
            phase: "FAILED",
            occurredAt: new Date().toISOString(),
            errorMessage: typeof payload.error_message === "string" ? payload.error_message : null,
          });
        }
        return;
      }

      if (event.eventSourceType === TeamRunEventSourceType.AGENT) {
        const payload = event.data as { agentEvent?: { statusHint?: string | null; payload?: Record<string, unknown> } };
        if (payload.agentEvent?.statusHint === "ERROR") {
          terminalPhase = "FAILED";
          listener({
            runtimeSubject: "TEAM_RUN",
            runId: run.runId,
            phase: "FAILED",
            occurredAt: new Date().toISOString(),
            errorMessage:
              typeof payload.agentEvent.payload?.message === "string"
                ? payload.agentEvent.payload.message
                : typeof payload.agentEvent.payload?.error === "string"
                  ? payload.agentEvent.payload.error
                  : null,
          });
        }
      }
    });

    const inactivePollHandle = setInterval(() => {
      if (terminalPhase || run.isActive()) {
        return;
      }
      terminalPhase = "TERMINATED";
      listener({
        runtimeSubject: "TEAM_RUN",
        runId: run.runId,
        phase: "TERMINATED",
        occurredAt: new Date().toISOString(),
      });
    }, 1_000);
    inactivePollHandle.unref?.();

    return () => {
      clearInterval(inactivePollHandle);
      unsubscribe();
    };
  }

  async createTeamRun(input: CreateTeamRunInput): Promise<TeamRun> {
    assertPublicLaunchInputHasNoManualRunIds(input.memberConfigs);
    const workspaceActivationsByCanonicalRoot = new Map<
      string,
      Promise<{ workspaceId: string; workspaceRootPath: string }>
    >();

    const ensureWorkspaceOnceByRootPath = (
      rawRootPath: string,
    ): Promise<{ workspaceId: string; workspaceRootPath: string }> => {
      const canonicalRootPath = canonicalizeWorkspaceRootPath(rawRootPath);
      const existingActivation = workspaceActivationsByCanonicalRoot.get(canonicalRootPath);
      if (existingActivation) {
        return existingActivation;
      }
      const activation = this.workspaceManager.ensureWorkspaceByRootPath(canonicalRootPath)
        .then((workspace) => ({
          workspaceId: workspace.workspaceId,
          workspaceRootPath: workspace.getBasePath?.() ?? canonicalRootPath,
        }));
      workspaceActivationsByCanonicalRoot.set(canonicalRootPath, activation);
      return activation;
    };

    const memberConfigs = await Promise.all(
      input.memberConfigs.map(async (memberConfig) => {
        let workspaceId = memberConfig.workspaceId?.trim() || null;
        let workspaceRootPath = memberConfig.workspaceRootPath?.trim() || null;

        if (workspaceRootPath) {
          const workspace = await ensureWorkspaceOnceByRootPath(workspaceRootPath);
          workspaceId = workspace.workspaceId;
          workspaceRootPath = workspace.workspaceRootPath;
        } else if (workspaceId?.startsWith(FILESYSTEM_WORKSPACE_ID_PREFIX)) {
          throw new Error(
            "workspaceRootPath is required when launching a team with filesystem workspace metadata.",
          );
        }

        return {
          ...memberConfig,
          runtimeKind: resolveRuntimeKind(memberConfig.runtimeKind),
          workspaceId,
          workspaceRootPath,
        };
      }),
    );
    const plan = await this.teamDefinitionTopologyPlanner.buildPlan({
      teamDefinitionId: input.teamDefinitionId,
      memberConfigs: memberConfigs as DomainTeamRunMemberConfigInput[],
    });
    const config = plan.config;
    const identityAssignment = this.teamRunLaunchIdentityAssignment;
    identityAssignment.assertNoManualRunIdsForLaunch(config);
    const teamRunId = await this.allocateTeamRunId(config.teamDefinitionId);
    const assignedConfig = await identityAssignment.assignRunIdsForLaunch(config, teamRunId);
    const run = await this.agentTeamRunManager.createTeamRun(assignedConfig, teamRunId);
    const metadata = await this.teamRunMetadataMapper.buildMetadata(run);

    await this.teamRunHistoryCatalogService.recordTeamRunCreated({
      teamRunId: run.runId,
      metadata,
      summary: "",
    });

    return run;
  }


  private async allocateTeamRunId(teamDefinitionId: string): Promise<string> {
    const definition = await this.teamDefinitionService.getDefinitionById(teamDefinitionId);
    if (!definition) {
      throw new Error(
        `AgentTeamDefinition '${teamDefinitionId}' cannot be loaded for team run identity allocation.`,
      );
    }
    return generateTeamRunIdForDefinitionName(definition.name);
  }

  private get teamRunLaunchIdentityAssignment(): TeamRunLaunchIdentityAssignment {
    return new TeamRunLaunchIdentityAssignment({
      teamDefinitionService: this.teamDefinitionService,
      agentRunIdentityAllocator: this.agentRunIdentityAllocator,
    });
  }

  async restoreTeamRun(teamRunId: string): Promise<TeamRun> {
    const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");
    if (this.agentTeamRunManager.getTeamRun(normalizedTeamRunId)) {
      throw new Error(
        `Team run '${normalizedTeamRunId}' is already active and does not need restore.`,
      );
    }

    const metadata = await this.teamRunMetadataService.readMetadata(normalizedTeamRunId);
    if (!metadata) {
      throw new Error(
        `Team run '${normalizedTeamRunId}' cannot be restored because metadata is missing.`,
      );
    }

    let restored = false;
    try {
      await this.agentTeamRunManager.restoreTeamRun(
        await this.teamRunMetadataMapper.buildRestoreContext(metadata),
      );
      restored = true;
      const teamRun = this.agentTeamRunManager.getTeamRun(normalizedTeamRunId);
      if (!teamRun) {
        throw new Error(`Team run '${normalizedTeamRunId}' restore failed.`);
      }

      const refreshedMetadata = await this.teamRunMetadataMapper.buildMetadata(teamRun, {
        previousMetadata: metadata,
      });
      await this.teamRunHistoryCatalogService.recordTeamRunRestored({
        teamRunId: normalizedTeamRunId,
        metadata: refreshedMetadata,
      });

      return teamRun;
    } catch (error) {
      if (restored) {
        await this.safeTerminate(normalizedTeamRunId);
      }
      throw error;
    }
  }

  getTeamRun(teamRunId: string): TeamRun | null {
    const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");
    return this.agentTeamRunManager.getTeamRun(normalizedTeamRunId);
  }

  async resolveTeamRun(teamRunId: string): Promise<TeamRun | null> {
    const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");
    const activeRun = this.getTeamRun(normalizedTeamRunId);
    if (activeRun) {
      return activeRun;
    }
    try {
      return await this.restoreTeamRun(normalizedTeamRunId);
    } catch {
      return null;
    }
  }

  async recordRunActivity(
    run: TeamRun,
    input: {
      summary?: string | null;
    } = {},
  ): Promise<void> {
    await this.teamRunHistoryCatalogService.recordTeamRunSummary({
      teamRunId: run.runId,
      summary: input.summary ?? "",
    });
  }

  async refreshRunMetadata(run: TeamRun): Promise<void> {
    const previousMetadata = await this.teamRunMetadataService.readMetadata(run.runId);
    const metadata = await this.teamRunMetadataMapper.buildMetadata(run, {
      previousMetadata,
    });
    await this.teamRunHistoryCatalogService.refreshTeamRunMetadata({
      teamRunId: run.runId,
      metadata,
    });
  }

  async terminateTeamRun(teamRunId: string): Promise<boolean> {
    const success = await this.agentTeamRunManager.terminateTeamRun(teamRunId);

    if (success) {
      await this.teamRunHistoryCatalogService.recordTeamRunTerminated({ teamRunId });
    }

    return success;
  }

  private async safeTerminate(teamRunId: string): Promise<void> {
    try {
      await this.agentTeamRunManager.terminateTeamRun(teamRunId);
    } catch (error) {
      console.warn(`Rollback failed while terminating restored team '${teamRunId}': ${String(error)}`);
    }
  }

  private get teamDefinitionTopologyPlanner(): TeamDefinitionTopologyPlanner {
    return new TeamDefinitionTopologyPlanner(this.teamDefinitionService);
  }

  private get teamRunMetadataMapper(): TeamRunMetadataMapper {
    return new TeamRunMetadataMapper({
      teamDefinitionService: this.teamDefinitionService,
      workspaceManager: this.workspaceManager,
      memoryLocationService: this.memoryLocationService,
    });
  }
}

let cachedTeamRunService: TeamRunService | null = null;

export const getTeamRunService = (): TeamRunService => {
  if (!cachedTeamRunService) {
    cachedTeamRunService = new TeamRunService();
  }
  return cachedTeamRunService;
};

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const normalizeLaunchPreset = (
  value: TeamRunPresetInput,
): TeamRunPresetInput => ({
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
  skillAccessMode: value.skillAccessMode,
  llmConfig: value.llmConfig ?? null,
});

const resolveRuntimeKind = (
  value: RuntimeKind | string | null | undefined,
): RuntimeKind => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return RuntimeKind.AUTOBYTEUS;
  }
  const runtimeKind = runtimeKindFromString(value, null);
  if (!runtimeKind) {
    throw new Error(`[INVALID_RUNTIME_KIND] Unsupported team member runtime kind '${value}'.`);
  }
  return runtimeKind;
};
