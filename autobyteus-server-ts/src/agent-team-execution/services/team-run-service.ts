import { TeamRun } from "../domain/team-run.js";
import type { TeamAgentLaunchSettings } from "../domain/team-run-config.js";
import { AgentTeamRunManager } from "./agent-team-run-manager.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  RuntimeKind,
  runtimeKindFromString,
} from "../../runtime-management/runtime-kind-enum.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
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
import {
  TeamRunEventSourceType,
  type TeamRunAgentEventPayload,
} from "../domain/team-run-event.js";
import { TeamRunMetadataMapper } from "./team-run-metadata-mapper.js";
import { TeamDefinitionTopologyPlanner } from "./team-definition-topology-planner.js";
import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import { generateTeamRunIdForDefinitionName } from "../domain/team-run-id.js";
import { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import { AgentRunCanonicalFailureObserver } from "../../agent-execution/events/agent-run-canonical-failure-observer.js";

export interface TeamRunPresetInput {
  workspaceRootPath: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode;
  runtimeKind: RuntimeKind;
  llmConfig?: Record<string, unknown> | null;
}

export type TeamRunMemberConfigInput = {
  memberAddress: string;
  agentDefinitionId?: string | null;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode;
  workspaceRootPath?: string | null;
  llmConfig?: Record<string, unknown> | null;
  runtimeKind?: RuntimeKind | string | null;
  applicationExecutionContext?: ApplicationExecutionContext | null;
};

export interface CreateTeamRunInput {
  teamDefinitionId: string;
  memberConfigs: TeamRunMemberConfigInput[];
  /** Preallocated by an internal caller that must embed the canonical identity in launch context. */
  teamRunId?: string | null;
}

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
  }): Promise<TeamRunMemberConfigInput[]> {
    const teamDefinitionId = normalizeRequiredString(input.teamDefinitionId, "teamDefinitionId");
    const launchPreset = normalizeLaunchPreset(input.launchPreset);
    return this.teamDefinitionTopologyPlanner.buildPresetAgentLaunchSettings({
      teamDefinitionId,
      launchPreset: {
        llmModelIdentifier: launchPreset.llmModelIdentifier,
        autoExecuteTools: launchPreset.autoExecuteTools,
        skillAccessMode: launchPreset.skillAccessMode,
        workspaceRootPath: launchPreset.workspaceRootPath,
        llmConfig: launchPreset.llmConfig ?? null,
        runtimeKind: launchPreset.runtimeKind,
        applicationExecutionContext: null,
      },
    });
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
      runId: run.teamRunId,
      phase: "ATTACHED",
      occurredAt: new Date().toISOString(),
    });

    let terminalPhase: ObservedRunLifecycleEvent["phase"] | null = null;
    const agentFailureObserver = new AgentRunCanonicalFailureObserver();
    const observeLifecycle = (isActive: boolean): void => {
      if (terminalPhase || isActive) {
        return;
      }
      terminalPhase = "TERMINATED";
      listener({
        runtimeSubject: "TEAM_RUN",
        runId: run.teamRunId,
        phase: "TERMINATED",
        occurredAt: new Date().toISOString(),
      });
    };
    const unsubscribeLifecycle = this.agentTeamRunManager.subscribeToLifecycle(
      run.teamRunId,
      (snapshot) => observeLifecycle(snapshot.isActive),
    );
    const unsubscribeEvents = run.subscribeToEvents((event) => {
      if (terminalPhase) {
        return;
      }

      if (event.eventSourceType === TeamRunEventSourceType.AGENT) {
        const agentEvent = (event.data as TeamRunAgentEventPayload).agentEvent;
        const failure = agentFailureObserver.observe(agentEvent);
        if (!failure) return;
        terminalPhase = "FAILED";
        listener({
          runtimeSubject: "TEAM_RUN",
          runId: run.teamRunId,
          phase: "FAILED",
          occurredAt: new Date().toISOString(),
          errorMessage: failure.message,
        });
      }
    });
    observeLifecycle(
      this.agentTeamRunManager.getLifecycleSnapshot(run.teamRunId).isActive,
    );

    return () => {
      unsubscribeEvents();
      unsubscribeLifecycle();
    };
  }

  async createTeamRun(input: CreateTeamRunInput): Promise<TeamRun> {
    const workspaceActivationsByCanonicalRoot = new Map<
      string,
      Promise<string>
    >();

    const ensureWorkspaceOnceByRootPath = (
      rawRootPath: string,
    ): Promise<string> => {
      const canonicalRootPath = canonicalizeWorkspaceRootPath(rawRootPath);
      const existingActivation = workspaceActivationsByCanonicalRoot.get(canonicalRootPath);
      if (existingActivation) {
        return existingActivation;
      }
      const activation = this.workspaceManager.ensureWorkspaceByRootPath(canonicalRootPath)
        .then((workspace) => workspace.getBasePath?.() ?? canonicalRootPath);
      workspaceActivationsByCanonicalRoot.set(canonicalRootPath, activation);
      return activation;
    };

    const memberConfigs = await Promise.all(
      input.memberConfigs.map(async (memberConfig) => {
        let workspaceRootPath = memberConfig.workspaceRootPath?.trim() || null;

        if (workspaceRootPath) {
          workspaceRootPath = await ensureWorkspaceOnceByRootPath(workspaceRootPath);
        }

        return {
          ...memberConfig,
          runtimeKind: resolveRuntimeKind(memberConfig.runtimeKind),
          workspaceRootPath,
          llmConfig: memberConfig.llmConfig ?? null,
          applicationExecutionContext: memberConfig.applicationExecutionContext ?? null,
        };
      }),
    );
    const teamRunId = input.teamRunId == null
      ? await this.allocateTeamRunId(input.teamDefinitionId)
      : normalizeRequiredString(input.teamRunId, "teamRunId");
    const plan = await this.teamDefinitionTopologyPlanner.buildPlan({
      teamDefinitionId: input.teamDefinitionId,
      teamRunId,
      memberConfigs: memberConfigs as Array<TeamAgentLaunchSettings & { memberAddress: string }>,
    });
    const run = await this.agentTeamRunManager.createTeamRun(plan.config, teamRunId);
    const metadata = await this.teamRunMetadataMapper.buildMetadata(run, {
      teamDefinitionName: plan.teamDefinitionName,
    });

    await this.teamRunHistoryCatalogService.recordTeamRunCreated({
      teamRunId: run.teamRunId,
      metadata,
      summary: "",
    });

    return run;
  }


  async allocateTeamRunId(teamDefinitionId: string): Promise<string> {
    const definition = await this.teamDefinitionService.getDefinitionById(teamDefinitionId);
    if (!definition) {
      throw new Error(
        `AgentTeamDefinition '${teamDefinitionId}' cannot be loaded for team run identity allocation.`,
      );
    }
    return generateTeamRunIdForDefinitionName(definition.name);
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
      teamRunId: run.teamRunId,
      summary: input.summary ?? "",
    });
  }

  async refreshRunMetadata(run: TeamRun): Promise<void> {
    const previousMetadata = await this.teamRunMetadataService.readMetadata(run.teamRunId);
    const metadata = await this.teamRunMetadataMapper.buildMetadata(run, {
      previousMetadata,
    });
    await this.teamRunHistoryCatalogService.refreshTeamRunMetadata({
      teamRunId: run.teamRunId,
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
    return new TeamDefinitionTopologyPlanner(
      this.teamDefinitionService,
      this.agentRunIdentityAllocator,
    );
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
