import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentMemoryLocationService, getAgentMemoryLocationService } from "../../agent-memory/services/agent-memory-location-service.js";
import { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type { ObservedRunLifecycleEvent } from "../../runtime-management/domain/observed-run-lifecycle-event.js";
import { RuntimeKind, runtimeKindFromString } from "../../runtime-management/runtime-kind-enum.js";
import { getTeamRunHistoryCatalogService, type TeamRunHistoryCatalogService } from "../../run-history/services/team-run-history-catalog-service.js";
import { canonicalizeWorkspaceRootPath } from "../../workspaces/workspace-path-utils.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
import type { RootTeamRun } from "../domain/root-team-run.js";
import type { TeamAgentLaunchSettings } from "../domain/team-run-config.js";
import { TeamRunEventSourceType } from "../domain/team-run-event.js";
import { generateTeamRunIdForDefinitionName } from "../domain/team-run-id.js";
import { AgentTeamRunManager } from "./agent-team-run-manager.js";
import { TeamDefinitionTopologyPlanner } from "./team-definition-topology-planner.js";
import { TokenUsageMigrationReadiness } from "../../token-usage/providers/token-usage-migration-readiness.js";

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
};
export interface CreateTeamRunInput {
  teamDefinitionId: string;
  memberConfigs: TeamRunMemberConfigInput[];
  teamRunId?: string | null;
  applicationBinding?: { applicationId: string; bindingId: string } | null;
}

/** Application-facing root TeamRun lifecycle service. */
export class TeamRunService {
  private readonly definitions: AgentTeamDefinitionService;
  private readonly manager: AgentTeamRunManager;
  private readonly catalog: TeamRunHistoryCatalogService;
  private readonly workspaces: WorkspaceManager;
  private readonly identityAllocator: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
  private readonly tokenUsageReadiness: Pick<TokenUsageMigrationReadiness,
    "assertCurrentSchemaReady" | "assertExistingRunRestoreReady">;

  constructor(options: {
    agentTeamRunManager?: AgentTeamRunManager;
    teamDefinitionService?: AgentTeamDefinitionService;
    teamRunHistoryCatalogService?: TeamRunHistoryCatalogService;
    workspaceManager?: WorkspaceManager;
    memoryDir?: string;
    memoryLocationService?: AgentMemoryLocationService;
    agentRunIdentityAllocator?: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
    tokenUsageReadiness?: Pick<TokenUsageMigrationReadiness,
      "assertCurrentSchemaReady" | "assertExistingRunRestoreReady">;
  } = {}) {
    this.manager = options.agentTeamRunManager ?? AgentTeamRunManager.getInstance();
    this.definitions = options.teamDefinitionService ?? AgentTeamDefinitionService.getInstance();
    this.catalog = options.teamRunHistoryCatalogService ?? getTeamRunHistoryCatalogService();
    this.workspaces = options.workspaceManager ?? getWorkspaceManager();
    void (options.memoryLocationService ?? (options.memoryDir ? new AgentMemoryLocationService({ memoryDir: options.memoryDir }) : getAgentMemoryLocationService()));
    this.identityAllocator = options.agentRunIdentityAllocator ?? new AgentRunIdentityAllocator({
      memoryDir: options.memoryDir ?? appConfigProvider.config.getMemoryDir(),
    });
    this.tokenUsageReadiness = options.tokenUsageReadiness ?? new TokenUsageMigrationReadiness();
  }

  async buildMemberConfigsFromLaunchPreset(input: {
    teamDefinitionId: string;
    launchPreset: TeamRunPresetInput;
  }): Promise<TeamRunMemberConfigInput[]> {
    const preset = normalizePreset(input.launchPreset);
    return this.planner.buildPresetAgentLaunchSettings({
      teamDefinitionId: required(input.teamDefinitionId, "teamDefinitionId"),
      launchPreset: {
        runtimeKind: preset.runtimeKind,
        llmModelIdentifier: preset.llmModelIdentifier,
        llmConfig: preset.llmConfig ?? null,
        autoExecuteTools: preset.autoExecuteTools,
        skillAccessMode: preset.skillAccessMode,
        workspaceRootPath: preset.workspaceRootPath,
      },
    });
  }

  async createTeamRun(input: CreateTeamRunInput): Promise<RootTeamRun> {
    this.tokenUsageReadiness.assertCurrentSchemaReady();
    const workspaces = new Map<string, Promise<string>>();
    const memberConfigs = await Promise.all(input.memberConfigs.map(async (member) => {
      const requested = member.workspaceRootPath?.trim() || null;
      let workspaceRootPath: string | null = null;
      if (requested) {
        const canonical = canonicalizeWorkspaceRootPath(requested);
        let activation = workspaces.get(canonical);
        if (!activation) {
          activation = this.workspaces.ensureWorkspaceByRootPath(canonical)
            .then((workspace) => workspace.getBasePath?.() ?? canonical);
          workspaces.set(canonical, activation);
        }
        workspaceRootPath = await activation;
      }
      return {
        ...member,
        runtimeKind: resolveRuntimeKind(member.runtimeKind),
        workspaceRootPath,
        llmConfig: member.llmConfig ?? null,
      };
    }));
    const teamRunId = input.teamRunId
      ? required(input.teamRunId, "teamRunId")
      : await this.allocateTeamRunId(input.teamDefinitionId);
    const plan = await this.planner.buildPlan({
      teamDefinitionId: input.teamDefinitionId,
      teamRunId,
      memberConfigs: memberConfigs as Array<TeamAgentLaunchSettings & { memberAddress: string }>,
      applicationBinding: input.applicationBinding ?? null,
    });
    const root = await this.manager.createTeamRun({ config: plan.config, teamDefinitionName: plan.teamDefinitionName });
    try {
      await this.catalog.recordTeamRunCreated({ tree: root.getExecutionTreeSnapshot(), summary: "" });
      return root;
    } catch (error) {
      await this.safeTerminate(root.teamRunId);
      throw error;
    }
  }

  async restoreTeamRun(teamRunId: string): Promise<RootTeamRun> {
    const normalized = required(teamRunId, "teamRunId");
    if (this.manager.hasManagedTeamRun(normalized)) throw new Error(`Team run '${normalized}' is already managed and cannot be restored.`);
    this.tokenUsageReadiness.assertExistingRunRestoreReady();
    const root = await this.manager.restoreTeamRun(normalized);
    try {
      await this.catalog.recordTeamRunRestored({ tree: root.getExecutionTreeSnapshot() });
      return root;
    } catch (error) {
      await this.safeTerminate(normalized);
      throw error;
    }
  }

  getActiveTeamRun(teamRunId: string): RootTeamRun | null {
    return this.manager.getActiveTeamRun(required(teamRunId, "teamRunId"));
  }
  getManagedTeamRun(teamRunId: string): RootTeamRun | null {
    return this.manager.getManagedTeamRun(required(teamRunId, "teamRunId"));
  }
  async resolveActiveTeamRun(teamRunId: string): Promise<RootTeamRun | null> {
    const normalized = required(teamRunId, "teamRunId");
    const active = this.getActiveTeamRun(normalized);
    if (active || this.manager.hasManagedTeamRun(normalized)) return active;
    return this.restoreTeamRun(normalized).catch(() => null);
  }
  async resolveManagedTeamRun(teamRunId: string): Promise<RootTeamRun | null> {
    const normalized = required(teamRunId, "teamRunId");
    return this.getManagedTeamRun(normalized) ?? this.restoreTeamRun(normalized).catch(() => null);
  }
  async allocateTeamRunId(teamDefinitionId: string): Promise<string> {
    const definition = await this.definitions.getDefinitionById(required(teamDefinitionId, "teamDefinitionId"));
    if (!definition) throw new Error(`AgentTeamDefinition '${teamDefinitionId}' cannot be loaded for team run identity allocation.`);
    return generateTeamRunIdForDefinitionName(definition.name);
  }
  recordRunActivity(run: RootTeamRun, input: { summary?: string | null } = {}): Promise<void> {
    return this.catalog.recordTeamRunSummary({ teamRunId: run.teamRunId, summary: input.summary });
  }
  async terminateTeamRun(teamRunId: string): Promise<boolean> {
    const success = await this.manager.terminateTeamRun(teamRunId);
    if (success) await this.catalog.recordTeamRunTerminated({ teamRunId });
    return success;
  }
  async observeTeamRunLifecycle(teamRunId: string, listener: (event: ObservedRunLifecycleEvent) => void): Promise<(() => void) | null> {
    const root = await this.resolveActiveTeamRun(teamRunId);
    if (!root) return null;
    listener({ runtimeSubject: "TEAM_RUN", runId: root.teamRunId, phase: "ATTACHED", occurredAt: new Date().toISOString() });
    const offLifecycle = this.manager.subscribeToLifecycle(root.teamRunId, (snapshot) => {
      if (!snapshot.isActive) listener({ runtimeSubject: "TEAM_RUN", runId: root.teamRunId, phase: "TERMINATED", occurredAt: new Date().toISOString() });
    });
    const offEvents = root.subscribeToEvents(({ event }) => {
      if (event.eventSourceType === TeamRunEventSourceType.AGENT && event.payload.eventType === "ERROR") {
        listener({ runtimeSubject: "TEAM_RUN", runId: root.teamRunId, phase: "FAILED", occurredAt: new Date().toISOString(), errorMessage: event.payload.details.message });
      }
    });
    return () => { offEvents(); offLifecycle(); };
  }

  private safeTerminate(teamRunId: string): Promise<void> {
    return this.manager.terminateTeamRun(teamRunId).then(() => undefined).catch(() => undefined);
  }
  private get planner(): TeamDefinitionTopologyPlanner {
    return new TeamDefinitionTopologyPlanner(this.definitions, this.identityAllocator);
  }
}

let cached: TeamRunService | null = null;
export const getTeamRunService = (): TeamRunService => cached ??= new TeamRunService();
const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};
const resolveRuntimeKind = (value: RuntimeKind | string | null | undefined): RuntimeKind => {
  if (!value) return RuntimeKind.AUTOBYTEUS;
  const resolved = runtimeKindFromString(value, null);
  if (!resolved) throw new Error(`[INVALID_RUNTIME_KIND] Unsupported team member runtime kind '${value}'.`);
  return resolved;
};
const normalizePreset = (value: TeamRunPresetInput): TeamRunPresetInput => ({
  workspaceRootPath: required(value.workspaceRootPath, "teamLaunchPreset.workspaceRootPath"),
  llmModelIdentifier: required(value.llmModelIdentifier, "teamLaunchPreset.llmModelIdentifier"),
  runtimeKind: value.runtimeKind,
  autoExecuteTools: Boolean(value.autoExecuteTools),
  skillAccessMode: value.skillAccessMode,
  llmConfig: value.llmConfig ?? null,
});
