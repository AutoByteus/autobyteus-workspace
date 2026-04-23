import { TeamRun } from "../domain/team-run.js";
import {
  TeamRunConfig,
  type TeamMemberRunConfig,
} from "../domain/team-run-config.js";
import { AgentTeamRunManager } from "./agent-team-run-manager.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  RuntimeKind,
  runtimeKindFromString,
} from "../../runtime-management/runtime-kind-enum.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { TeamMemberMemoryLayout } from "../../agent-memory/store/team-member-memory-layout.js";
import {
  TeamRunMetadataService,
  getTeamRunMetadataService,
} from "../../run-history/services/team-run-metadata-service.js";
import {
  TeamRunHistoryIndexService,
  getTeamRunHistoryIndexService,
} from "../../run-history/services/team-run-history-index-service.js";
import type { TeamRunKnownStatus } from "../../run-history/domain/team-run-history-index-types.js";
import {
  SkillAccessMode,
} from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { ObservedRunLifecycleEvent } from "../../runtime-management/domain/observed-run-lifecycle-event.js";
import { TeamRunEventSourceType } from "../domain/team-run-event.js";
import { TeamDefinitionTraversalService } from "./team-definition-traversal-service.js";
import { TeamRunMetadataMapper } from "./team-run-metadata-mapper.js";
import { resolveTeamBackendKindFromMemberRuntimeKinds } from "./team-run-runtime-context-support.js";

export interface TeamRunPresetInput {
  workspaceRootPath: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode;
  runtimeKind: RuntimeKind;
  llmConfig?: Record<string, unknown> | null;
}

type TeamRunMemberConfigInput = Omit<TeamMemberRunConfig, "runtimeKind"> & {
  runtimeKind?: RuntimeKind | string | null;
};

export interface CreateTeamRunInput {
  teamDefinitionId: string;
  memberConfigs: TeamRunMemberConfigInput[];
}

export class TeamRunService {
  private readonly teamDefinitionService: AgentTeamDefinitionService;
  private readonly agentTeamRunManager: AgentTeamRunManager;
  private readonly teamRunMetadataService: TeamRunMetadataService;
  private readonly teamRunHistoryIndexService: TeamRunHistoryIndexService;
  private readonly workspaceManager: WorkspaceManager;
  private readonly memberLayout: TeamMemberMemoryLayout;

  constructor(options: {
    agentTeamRunManager?: AgentTeamRunManager;
    teamDefinitionService?: AgentTeamDefinitionService;
    teamRunMetadataService?: TeamRunMetadataService;
    teamRunHistoryIndexService?: TeamRunHistoryIndexService;
    workspaceManager?: WorkspaceManager;
    memoryDir?: string;
  } = {}) {
    this.agentTeamRunManager =
      options.agentTeamRunManager ?? AgentTeamRunManager.getInstance();
    this.teamDefinitionService =
      options.teamDefinitionService ?? AgentTeamDefinitionService.getInstance();
    this.teamRunMetadataService =
      options.teamRunMetadataService ?? getTeamRunMetadataService();
    this.teamRunHistoryIndexService =
      options.teamRunHistoryIndexService ?? getTeamRunHistoryIndexService();
    this.workspaceManager = options.workspaceManager ?? getWorkspaceManager();
    this.memberLayout = new TeamMemberMemoryLayout(
      options.memoryDir ?? appConfigProvider.config.getMemoryDir(),
    );
  }

  async buildMemberConfigsFromLaunchPreset(input: {
    teamDefinitionId: string;
    launchPreset: TeamRunPresetInput;
  }): Promise<TeamMemberRunConfig[]> {
    const teamDefinitionId = normalizeRequiredString(input.teamDefinitionId, "teamDefinitionId");
    const launchPreset = normalizeLaunchPreset(input.launchPreset);
    const leafMembers = await this.teamDefinitionTraversalService.collectLeafAgentMembers(
      teamDefinitionId,
    );

    return leafMembers.map((member) => ({
      memberName: member.memberName,
      memberRouteKey: member.memberRouteKey,
      agentDefinitionId: member.agentDefinitionId,
      llmModelIdentifier: launchPreset.llmModelIdentifier,
      autoExecuteTools: launchPreset.autoExecuteTools,
      skillAccessMode: launchPreset.skillAccessMode,
      workspaceRootPath: launchPreset.workspaceRootPath,
      llmConfig: launchPreset.llmConfig ?? null,
      runtimeKind: launchPreset.runtimeKind,
    }));
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
        const newStatus = typeof payload.new_status === "string" ? payload.new_status.trim().toUpperCase() : "";
        if (newStatus === "ERROR" || newStatus === "FAILED") {
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
    const memberConfigs = await Promise.all(
      input.memberConfigs.map(async (memberConfig) => {
        let workspaceId = memberConfig.workspaceId ?? null;
        const workspaceRootPath = memberConfig.workspaceRootPath?.trim() || null;

        if (workspaceRootPath && !workspaceId) {
          const workspace = await this.workspaceManager.ensureWorkspaceByRootPath(workspaceRootPath);
          workspaceId = workspace.workspaceId;
        }

        return {
          ...memberConfig,
          runtimeKind: resolveRuntimeKind(memberConfig.runtimeKind),
          workspaceId,
          workspaceRootPath,
        };
      }),
    );
    const coordinatorMemberName = await this.teamDefinitionTraversalService.resolveCoordinatorMemberName(
      input.teamDefinitionId,
      memberConfigs,
    );
    const teamBackendKind = resolveTeamBackendKindFromMemberRuntimeKinds(
      memberConfigs.map((memberConfig) => memberConfig.runtimeKind),
    );
    const config = new TeamRunConfig({
      teamDefinitionId: input.teamDefinitionId,
      teamBackendKind,
      coordinatorMemberName,
      memberConfigs,
    });
    const run = await this.agentTeamRunManager.createTeamRun(config);
    const metadata = await this.teamRunMetadataMapper.buildMetadata(run);

    await this.teamRunMetadataService.writeMetadata(run.runId, metadata);
    await this.teamRunHistoryIndexService.recordRunCreated({
      teamRunId: run.runId,
      metadata,
      summary: "",
      lastKnownStatus: "IDLE",
      lastActivityAt: new Date().toISOString(),
    });

    return run;
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

      const refreshedMetadata = await this.teamRunMetadataMapper.buildMetadata(teamRun);
      await this.teamRunMetadataService.writeMetadata(normalizedTeamRunId, refreshedMetadata);
      await this.teamRunHistoryIndexService.recordRunRestored({
        teamRunId: normalizedTeamRunId,
        metadata: refreshedMetadata,
        lastKnownStatus: "ACTIVE",
        lastActivityAt: new Date().toISOString(),
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
      lastKnownStatus?: TeamRunKnownStatus;
      lastActivityAt?: string;
    } = {},
  ): Promise<void> {
    const metadata = await this.teamRunMetadataMapper.buildMetadata(run);
    await this.teamRunMetadataService.writeMetadata(run.runId, metadata);
    await this.teamRunHistoryIndexService.recordRunActivity({
      teamRunId: run.runId,
      metadata,
      summary: input.summary ?? "",
      lastKnownStatus: input.lastKnownStatus ?? "ACTIVE",
      lastActivityAt: input.lastActivityAt ?? new Date().toISOString(),
    });
  }

  async refreshRunMetadata(run: TeamRun): Promise<void> {
    const metadata = await this.teamRunMetadataMapper.buildMetadata(run);
    await this.teamRunMetadataService.writeMetadata(run.runId, metadata);
  }

  async terminateTeamRun(teamRunId: string): Promise<boolean> {
    const success = await this.agentTeamRunManager.terminateTeamRun(teamRunId);

    if (success) {
      await this.teamRunHistoryIndexService.recordRunTerminated(teamRunId);
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

  private get teamDefinitionTraversalService(): TeamDefinitionTraversalService {
    return new TeamDefinitionTraversalService(this.teamDefinitionService);
  }

  private get teamRunMetadataMapper(): TeamRunMetadataMapper {
    return new TeamRunMetadataMapper({
      teamDefinitionService: this.teamDefinitionService,
      workspaceManager: this.workspaceManager,
      memberLayout: this.memberLayout,
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
