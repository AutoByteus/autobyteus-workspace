import type { PeerRunOf } from "../../agent-collaboration/execution/remote/peer-runs.js";
import type { LaunchConfigurationSource } from "../../agent-collaboration/domain/launch-configuration-source.js";
import type { AgentMemoryLocationService } from "../../agent-memory/services/agent-memory-location-service.js";
import type { RemoteInboundQuery, StoredRemoteLinkCheck } from "../../agent-collaboration/execution/remote/remote-run-links.js";
import type { DelegatedFrom } from "../../run-history/store/agent-run-metadata-types.js";
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
  FlatTeamTopologyPlanner,
  type TeamAgentLaunchInput,
  type TeamScopeLaunchInput,
} from "./flat-team-topology-planner.js";
import { TokenUsageCapability } from "../../token-usage/providers/token-usage-capability.js";
import { rootRestoreRefusal, unrestorableRoot, type RootRestoreRefusal } from "../../agent-collaboration/execution/services/root-restore-admission.js";
import type { TeamRunSelectionPatch } from "./team-run-selection-mutator.js";
import type { RunModelConfigUpdateResult } from "../../run-history/domain/run-model-config.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import { DefinitionAdmissionService } from "../../collaboration-definition-admission/services/definition-admission-service.js";
import type { RunAgentAccess } from "../../agent-collaboration/execution/remote/run-agent-access.js";
import { TeamRunAgentAccess } from "./team-run-agent-access.js";
import { projectNewRunLlmConfig } from "../../llm-management/services/new-run-llm-config-projection.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";

export interface TeamRunPresetInput {
  workspaceRootPath: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  runtimeKind: RuntimeKind;
  llmConfig?: Record<string, unknown> | null;
}
export type TeamRunMemberConfigInput = {
  memberAddress: string;
  /** A delegated team member's resolved launch source (autobyteus-461). */
  launchSource?: LaunchConfigurationSource;
  agentDefinitionId?: string | null;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  workspaceRootPath?: string | null;
  llmConfig?: Record<string, unknown> | null;
  runtimeKind: RuntimeKind | string;
};
export type TeamRunTeamConfigInput = {
  teamAddress: string;
  /** A delegated team's resolved default launch source (DS-10 step 4). */
  launchSource?: LaunchConfigurationSource;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  workspaceRootPath?: string | null;
  llmConfig?: Record<string, unknown> | null;
  runtimeKind: RuntimeKind | string;
};
export interface CreateTeamRunInput {
  teamDefinitionId: string;
  teamConfigs: TeamRunTeamConfigInput[];
  memberConfigs: TeamRunMemberConfigInput[];
  applicationBinding?: { applicationId: string; bindingId: string } | null;
  /** A delegated Team run (local or a peer's, autobyteus-247): the back-link to its delegator, kept on the tree. */
  delegatedFrom?: DelegatedFrom;
  /**
   * A delegated Team run's handoff rules as its members have them in the delegating run, in the team's own space (a
   * `to` outside the team as written; CR-461-009). Only with `delegatedFrom`; without them the definition's are used.
   */
  handoffs?: readonly CollaborationHandoff[];
  /** The Project the Team run is started under (REQ-004); refused with `PROJECT_NOT_FOUND` when it does not exist. */
  projectId?: string | null;
}

export interface CreateTeamRunFromRootConfigInput {
  teamDefinitionId: string;
  rootConfig: TeamRunPresetInput;
  memberConfigs?: TeamRunMemberConfigInput[] | null;
  applicationBinding?: { applicationId: string; bindingId: string } | null;
}

/** Application-facing root TeamRun lifecycle service. */
export class TeamRunService {
  private readonly definitions: AgentTeamDefinitionService;
  private readonly manager: AgentTeamRunManager;
  /** autobyteus-278: a Team run a peer started, as this node serves that peer's owner (behind `RemoteRootDirectory`). */
  readonly runAgents: RunAgentAccess = new TeamRunAgentAccess({
    getManagedTeamRun: (teamRunId) => this.getManagedTeamRun(teamRunId),
    resolveManagedTeamRun: (teamRunId) => this.resolveManagedTeamRun(teamRunId),
    subscribeToLifecycle: (teamRunId, listener) => this.manager.subscribeToLifecycle(teamRunId, listener),
    terminateTeamRun: (teamRunId) => this.terminateTeamRun(teamRunId),
  });
  private readonly catalog: TeamRunHistoryCatalogService;
  private readonly workspaces: WorkspaceManager;
  private readonly agentIdentityAllocator: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
  private readonly teamIdentityAllocator: Pick<TeamRunIdentityAllocator, "allocateForTeamDefinitionName">;
  private readonly tokenUsageReadiness: Pick<TokenUsageCapability,
    "assertCurrentSchemaReady" | "assertExistingRunRestoreReady">;
  private readonly admission: Pick<DefinitionAdmissionService, "requireAvailable">;
  private readonly peerRunOf: PeerRunOf | null;

  constructor(options: {
    agentTeamRunManager?: AgentTeamRunManager;
    teamDefinitionService?: AgentTeamDefinitionService;
    teamRunHistoryCatalogService?: TeamRunHistoryCatalogService;
    workspaceManager?: WorkspaceManager;
    memoryDir?: string;
    memoryLocationService?: AgentMemoryLocationService;
    agentRunIdentityAllocator?: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
    teamRunIdentityAllocator?: Pick<TeamRunIdentityAllocator, "allocateForTeamDefinitionName">;
    tokenUsageReadiness?: Pick<TokenUsageCapability,
      "assertCurrentSchemaReady" | "assertExistingRunRestoreReady">;
    definitionAdmissionService?: Pick<DefinitionAdmissionService, "requireAvailable">;
    /** A run on a peer node by its own ID (SR-066): its Stop goes to its node. */
    peerRunOf?: PeerRunOf;
  } = {}) {
    this.manager = options.agentTeamRunManager ?? AgentTeamRunManager.getInstance();
    this.definitions = options.teamDefinitionService ?? AgentTeamDefinitionService.getInstance();
    this.catalog = options.teamRunHistoryCatalogService ?? getTeamRunHistoryCatalogService();
    this.workspaces = options.workspaceManager ?? getWorkspaceManager();
    this.agentIdentityAllocator = options.agentRunIdentityAllocator ?? new AgentRunIdentityAllocator();
    this.teamIdentityAllocator = options.teamRunIdentityAllocator ?? new TeamRunIdentityAllocator();
    this.tokenUsageReadiness = options.tokenUsageReadiness ?? new TokenUsageCapability();
    this.admission = options.definitionAdmissionService ?? DefinitionAdmissionService.getInstance();
    this.peerRunOf = options.peerRunOf ?? null;
  }

  async createTeamRun(input: CreateTeamRunInput): Promise<RootTeamRun> {
    this.tokenUsageReadiness.assertCurrentSchemaReady();
    if (input.handoffs && !input.delegatedFrom) throw new Error("Handoff rules are given only for a delegated Team run.");
    const admission = await this.admission.requireAvailable("agent_team", required(input.teamDefinitionId, "teamDefinitionId"));
    if (!("nodes" in admission.definition)) throw new Error(`Admitted definition '${input.teamDefinitionId}' is not an AgentTeam.`);
    const projectId = input.projectId?.trim() || undefined;
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
    // A new run stores and launches only declared settings (undeclared keys are dropped silently).
    const normalizedTeamConfigs = await Promise.all(input.teamConfigs.map(async (team, index) => {
      const runtimeKind = resolveRequiredRuntimeKind(team.runtimeKind, `teamConfigs[${index}].runtimeKind`);
      return { ...team, runtimeKind, llmConfig: await projectNewRunLlmConfig({
        runtimeKind, llmModelIdentifier: team.llmModelIdentifier, llmConfig: team.llmConfig }) };
    }));
    const normalizedMemberConfigs = await Promise.all(input.memberConfigs.map(async (member, index) => {
      const runtimeKind = resolveRequiredRuntimeKind(member.runtimeKind, `memberConfigs[${index}].runtimeKind`);
      return { ...member, runtimeKind, llmConfig: await projectNewRunLlmConfig({
        runtimeKind, llmModelIdentifier: member.llmModelIdentifier, llmConfig: member.llmConfig }) };
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
      rootDefinition: admission.definition,
      teamConfigs,
      memberConfigs,
      applicationBinding: input.applicationBinding ?? null,
      // A delegated team keeps a handoff `to` outside the team; a team the user starts keeps today's check (CR-461-009).
      ...(input.delegatedFrom ? { handoffs: { kind: "delegated_team" as const, ...(input.handoffs ? { handoffs: input.handoffs } : {}) } } : {}),
    });
    const root = await this.manager.createTeamRun({ config: plan.config, teamDefinitionName: plan.teamDefinitionName,
      ...(input.delegatedFrom ? { delegatedFrom: input.delegatedFrom } : {}), ...(projectId ? { projectId } : {}) });
    try {
      await this.catalog.recordTeamRunCreated({ tree: root.getExecutionTreeSnapshot(), summary: "" });
      return root;
    } catch (error) {
      await this.safeTerminate(root.teamRunId);
      throw error;
    }
  }

  async createTeamRunFromRootConfig(
    input: CreateTeamRunFromRootConfigInput,
  ): Promise<RootTeamRun> {
    const rootConfig = normalizePreset(input.rootConfig);
    const admission = await this.admission.requireAvailable("agent_team", required(input.teamDefinitionId, "teamDefinitionId"));
    if (!("nodes" in admission.definition)) throw new Error(`Admitted definition '${input.teamDefinitionId}' is not an AgentTeam.`);
    const expanded = await this.planner.buildRootLaunchInputs({
      teamDefinitionId: required(input.teamDefinitionId, "teamDefinitionId"),
      rootDefinition: admission.definition,
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
    // The manager decides "already managed" versus completing a stopping root inside its transition.
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

  /** Base's restore admission (SR-078, CR-461-069), before the stored file is read: its reason, or `null` when it may restore. */
  restoreRefusal(teamRunId: string): Promise<RootRestoreRefusal | null> {
    const normalized = required(teamRunId, "teamRunId");
    return rootRestoreRefusal({ tokenUsage: this.tokenUsageReadiness, isCataloged: () => this.manager.isCatalogedPackage(normalized),
      notCataloged: { code: "TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED", message: `TeamRun '${normalized}' is not an admitted current package.` } });
  }

  /**
   * A stopped run restored for its first input (SR-046, SR-078): the managed run, else base's admission answers with its
   * own reason; a restore that fails after admission is answered as a run that cannot be restored (the detail logged).
   */
  async restoreForInput(teamRunId: string): Promise<RootTeamRun | RootRestoreRefusal> {
    const normalized = required(teamRunId, "teamRunId");
    const managed = this.getManagedTeamRun(normalized);
    if (managed) return managed;
    const refused = await this.restoreRefusal(normalized);
    if (refused) return refused;
    try {
      return await this.restoreTeamRun(normalized);
    } catch (error) {
      // A concurrent restore registered it first.
      return this.getManagedTeamRun(normalized) ?? unrestorableRoot({ kind: "Team run", code: "TEAM_RUN_NOT_RESTORABLE", runId: normalized, error });
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
  /** N-303 / N-304: the stored-link check before a peer's request restores a Team run. */
  storedRemoteLinkCheck(teamRunId: string, query: RemoteInboundQuery): Promise<StoredRemoteLinkCheck> {
    return this.manager.storedRemoteLinkCheck(required(teamRunId, "teamRunId"), query);
  }
  recordRunActivity(run: RootTeamRun, input: { summary?: string | null } = {}): Promise<void> {
    return this.recordRunTitle(run.teamRunId, input.summary ?? "");
  }
  /**
   * The Team run's title from a message it accepted (autobyteus-269): the catalog keeps the first non-empty one, so
   * only the run's first message sets it, whoever sends it (the owner in the window, or a peer's work packet).
   */
  recordRunTitle(teamRunId: string, content: string): Promise<void> {
    return this.catalog.recordTeamRunSummary({ teamRunId, summary: content });
  }
  /** The Team run's title as its history row shows it (autobyteus-278: a peer reads it for a run it started). */
  async readRunTitle(teamRunId: string): Promise<string | null> {
    return (await this.catalog.getCatalogRow(teamRunId))?.summary || null;
  }
  async terminateTeamRun(teamRunId: string): Promise<boolean> {
    // A delegated team run on a peer node is stopped as itself, by its node through its coordinator (SR-066, REQ-013).
    const peer = this.peerRunOf?.(teamRunId) ?? null;
    if (peer?.kind === "agent_team" && peer.runId === teamRunId) return (await peer.terminate()).accepted;
    const success = await this.manager.terminateTeamRun(teamRunId);
    if (success) await this.catalog.recordTeamRunTerminated({ teamRunId });
    return success;
  }
  /** DS-5 (contract T-1, `model.py` `stop`; CR-461-001): as `AgentRunService.stopForTaskClosure`, for a team run. */
  async stopForTaskClosure(teamRunId: string, stillClosed: () => boolean): Promise<"stopped" | "kept_open" | "not_stopped"> {
    const outcome = await this.manager.terminateTeamRunForTaskClosure(teamRunId, stillClosed);
    if (outcome !== "stopped") return outcome;
    if (!(await this.catalog.getCatalogRow(teamRunId))?.terminatedAt) await this.catalog.recordTeamRunTerminated({ teamRunId });
    return "stopped";
  }
  updateStoppedSelections(input: {
    teamRunId: string;
    selectionPatches: readonly TeamRunSelectionPatch[];
  }): Promise<RunModelConfigUpdateResult<TeamRunExecutionTreeSnapshot | null>> {
    return this.manager.updateStoppedSelections(input);
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
  private get planner(): FlatTeamTopologyPlanner {
    return new FlatTeamTopologyPlanner(
      this.definitions,
      this.teamIdentityAllocator,
      this.agentIdentityAllocator,
    );
  }
}

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
  llmConfig: value.llmConfig ?? null,
});
