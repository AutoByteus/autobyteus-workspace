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
import type { AgentLaunchConfiguration } from "../domain/team-run-config.js";
import { TeamRunEventSourceType } from "../domain/team-run-event.js";
import { AgentTeamRunManager } from "./agent-team-run-manager.js";
import { TeamRunIdentityAllocator } from "./team-run-identity-allocator.js";
import {
  TeamDefinitionTopologyPlanner,
  type TeamAgentLaunchInput,
  type TeamScopeLaunchInput,
} from "./team-definition-topology-planner.js";
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
  runtimeKind: RuntimeKind | string;
};
export type TeamRunTeamConfigInput = {
  teamAddress: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode;
  workspaceRootPath?: string | null;
  llmConfig?: Record<string, unknown> | null;
  runtimeKind: RuntimeKind | string;
};
export interface CreateTeamRunInput {
  teamDefinitionId: string;
  teamConfigs: TeamRunTeamConfigInput[];
  memberConfigs: TeamRunMemberConfigInput[];
  applicationBinding?: { applicationId: string; bindingId: string } | null;
}

/** Application-facing root TeamRun lifecycle service. */
export class TeamRunService {
  private readonly definitions: AgentTeamDefinitionService;
  private readonly manager: AgentTeamRunManager;
  private readonly catalog: TeamRunHistoryCatalogService;
  private readonly workspaces: WorkspaceManager;
  private readonly agentIdentityAllocator: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
  private readonly teamIdentityAllocator: Pick<TeamRunIdentityAllocator, "allocateForTeamDefinitionName">;
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
    teamRunIdentityAllocator?: Pick<TeamRunIdentityAllocator, "allocateForTeamDefinitionName">;
    tokenUsageReadiness?: Pick<TokenUsageMigrationReadiness,
      "assertCurrentSchemaReady" | "assertExistingRunRestoreReady">;
  } = {}) {
    this.manager = options.agentTeamRunManager ?? AgentTeamRunManager.getInstance();
    this.definitions = options.teamDefinitionService ?? AgentTeamDefinitionService.getInstance();
    this.catalog = options.teamRunHistoryCatalogService ?? getTeamRunHistoryCatalogService();
    this.workspaces = options.workspaceManager ?? getWorkspaceManager();
    void (options.memoryLocationService ?? (options.memoryDir ? new AgentMemoryLocationService({ memoryDir: options.memoryDir }) : getAgentMemoryLocationService()));
    this.agentIdentityAllocator = options.agentRunIdentityAllocator ?? new AgentRunIdentityAllocator({
      memoryDir: options.memoryDir ?? appConfigProvider.config.getMemoryDir(),
    });
    this.teamIdentityAllocator = options.teamRunIdentityAllocator ?? new TeamRunIdentityAllocator();
    this.tokenUsageReadiness = options.tokenUsageReadiness ?? new TokenUsageMigrationReadiness();
  }

  async createTeamRun(input: CreateTeamRunInput): Promise<RootTeamRun> {
    this.tokenUsageReadiness.assertCurrentSchemaReady();
    const workspaces = new Map<string, Promise<string>>();
    const activateWorkspace = async (requestedPath: string | null | undefined): Promise<string | null> => {
      const requested = requestedPath?.trim() || null;
      if (!requested) return null;
      const canonical = canonicalizeWorkspaceRootPath(requested);
      let activation = workspaces.get(canonical);
      if (!activation) {
        activation = this.workspaces.ensureWorkspaceByRootPath(canonical)
          .then((workspace) => workspace.getBasePath?.() ?? canonical);
        workspaces.set(canonical, activation);
      }
      return activation;
    };
    const normalizedTeamConfigs = input.teamConfigs.map((team, index) => ({
      ...team,
      runtimeKind: resolveRequiredRuntimeKind(team.runtimeKind, `teamConfigs[${index}].runtimeKind`),
      llmConfig: team.llmConfig ?? null,
    }));
    const normalizedMemberConfigs = input.memberConfigs.map((member, index) => ({
      ...member,
      runtimeKind: resolveRequiredRuntimeKind(member.runtimeKind, `memberConfigs[${index}].runtimeKind`),
      llmConfig: member.llmConfig ?? null,
    }));
    const teamConfigs: TeamScopeLaunchInput[] = await Promise.all(normalizedTeamConfigs.map(async (team) => ({
      ...team,
      workspaceRootPath: await activateWorkspace(team.workspaceRootPath),
    })));
    const memberConfigs: TeamAgentLaunchInput[] = await Promise.all(normalizedMemberConfigs.map(async (member) => ({
      ...member,
      workspaceRootPath: await activateWorkspace(member.workspaceRootPath),
    })));
    const plan = await this.planner.buildPlan({
      teamDefinitionId: input.teamDefinitionId,
      teamConfigs,
      memberConfigs,
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

  async createTeamRunFromRootConfig(input: {
    teamDefinitionId: string;
    rootConfig: TeamRunPresetInput;
    memberConfigs?: TeamRunMemberConfigInput[] | null;
    applicationBinding?: { applicationId: string; bindingId: string } | null;
  }): Promise<RootTeamRun> {
    const rootConfig = normalizePreset(input.rootConfig);
    const expanded = await this.planner.buildRootLaunchInputs({
      teamDefinitionId: required(input.teamDefinitionId, "teamDefinitionId"),
      rootConfig,
      memberConfigs: input.memberConfigs?.map((member) => ({
        ...member,
        runtimeKind: resolveRequiredRuntimeKind(member.runtimeKind, "memberConfigs.runtimeKind"),
        workspaceRootPath: member.workspaceRootPath?.trim() || null,
        llmConfig: member.llmConfig ?? null,
      })),
    });
    return this.createTeamRun({
      teamDefinitionId: input.teamDefinitionId,
      applicationBinding: input.applicationBinding,
      teamConfigs: [...expanded.teamConfigs],
      memberConfigs: [...expanded.memberConfigs],
    });
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
    return new TeamDefinitionTopologyPlanner(
      this.definitions,
      this.teamIdentityAllocator,
      this.agentIdentityAllocator,
    );
  }
}

let cached: TeamRunService | null = null;
export const getTeamRunService = (): TeamRunService => cached ??= new TeamRunService();
const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};
const resolveRequiredRuntimeKind = (value: unknown, field: string): RuntimeKind => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required.`);
  const resolved = runtimeKindFromString(value, null);
  if (!resolved) throw new Error(`[INVALID_RUNTIME_KIND] Unsupported ${field} '${value}'.`);
  return resolved;
};
const normalizePreset = (value: TeamRunPresetInput): AgentLaunchConfiguration => ({
  workspaceRootPath: required(value.workspaceRootPath, "teamLaunchPreset.workspaceRootPath"),
  llmModelIdentifier: required(value.llmModelIdentifier, "teamLaunchPreset.llmModelIdentifier"),
  runtimeKind: resolveRequiredRuntimeKind(value.runtimeKind, "teamLaunchPreset.runtimeKind"),
  autoExecuteTools: Boolean(value.autoExecuteTools),
  skillAccessMode: value.skillAccessMode,
  llmConfig: value.llmConfig ?? null,
});
