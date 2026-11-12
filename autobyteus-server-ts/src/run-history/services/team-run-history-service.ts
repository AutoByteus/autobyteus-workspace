import type { DelegatedWorkGuard } from "./delegated-work-guard.js";
import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import { getAgentTeamAddressBasename } from "../../agent-collaboration/domain/agent-team-address.js";
import type { ConfiguredAgentExecutionNode, ConfiguredExecutionNode, TeamRunExecutionTreeSnapshot } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type { AgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { TeamRunHistoryItem, TeamRunIndexRow } from "../domain/team-run-history-index-types.js";
import { TeamRunExecutionTreeStore } from "../store/team-run-execution-tree-store.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { TeamRunHistoryCatalogService, getTeamRunHistoryCatalogService } from "./team-run-history-catalog-service.js";
import { TeamRunLiveProjectionService, type TeamRunMemberStatusProjection } from "./team-run-live-projection-service.js";
import { projectExecutionTree } from "../../services/agent-streaming/team-execution-view-projector.js";
import { runModelConfigEditability, type RunModelConfigEditability } from "../domain/run-model-config.js";
import { createRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { getProjectTaskService, type ProjectTaskService } from "../../projects/services/project-task-service.js";
import { RunLastActivityReader } from "./run-last-activity-reader.js";

export interface DeleteStoredTeamRunResult { success: boolean; message: string }
export interface ArchiveStoredTeamRunResult { success: boolean; message: string }
export interface TeamRunResumeConfig {
  teamRunId: string;
  isActive: boolean;
  executionTree: TeamRunExecutionTreeSnapshot;
  modelConfigEditability: RunModelConfigEditability;
  /**
   * The live sequence and change sequence of the running Team, as its stream snapshot reports them (read together);
   * null and 0 when the Team is not running (autobyteus-358, SR-006).
   */
  liveSequenceId: string | null;
  baseChangeSequence: number;
  /** The sequence of the running Team's latest message through `baseChangeSequence`; null when not running (SR-007). */
  lastMessageChangeSequence: number | null;
}

export class TeamRunHistoryService {
  private readonly treeStore: TeamRunExecutionTreeStore;
  private readonly catalog: TeamRunHistoryCatalogService;
  private readonly manager: AgentTeamRunManager;
  private readonly live: TeamRunLiveProjectionService;
  private readonly layout: AgentMemoryLayout;
  private readonly adHocTasks?: Pick<ProjectTaskService, "deleteAdHocTasksDelegatedFrom">;
  private readonly lastActivity: Pick<RunLastActivityReader, "forTeamRun">;
  private readonly workGuard: Pick<DelegatedWorkGuard, "refusal">;

  constructor(memoryDir: string, options: {
    /** The relationships between runs, from the Task entries (SR-047). */
    tree: Pick<DelegationIndex, "subtreeOf">;
    /** Archive and delete wait for the runs it delegated to (REQ-007). */
    workGuard: Pick<DelegatedWorkGuard, "refusal">;
    executionTreeStore?: TeamRunExecutionTreeStore;
    catalogService?: TeamRunHistoryCatalogService;
    teamRunManager?: AgentTeamRunManager;
    liveProjectionService?: TeamRunLiveProjectionService;
    /** Removes the ad-hoc Tasks of a permanently deleted run; defaults to the process Task service. */
    adHocTasks?: Pick<ProjectTaskService, "deleteAdHocTasksDelegatedFrom">;
    /** A run's last activity over its agents. */
    lastActivity?: Pick<RunLastActivityReader, "forTeamRun">;
  }) {
    this.workGuard = options.workGuard;
    this.lastActivity = options.lastActivity ?? new RunLastActivityReader({ memoryDir, tree: options.tree });
    this.adHocTasks = options.adHocTasks;
    this.treeStore = options.executionTreeStore ?? new TeamRunExecutionTreeStore();
    this.catalog = options.catalogService ?? getTeamRunHistoryCatalogService();
    this.manager = options.teamRunManager ?? AgentTeamRunManager.getInstance();
    this.live = options.liveProjectionService ?? new TeamRunLiveProjectionService(this.manager);
    this.layout = new AgentMemoryLayout(memoryDir);
  }

  /** The Team runs the user browses, newest first; `include` selects rows before their trees are read (a Project's runs). */
  async listTeamRunHistory(include: (row: TeamRunIndexRow) => boolean = () => true): Promise<TeamRunHistoryItem[]> {
    const items: TeamRunHistoryItem[] = [];
    for (const row of await this.catalog.listCatalogRows()) {
      if (!include(row)) continue;
      const projection = this.live.getCatalogListLiveProjection(row.teamRunId);
      if (row.archivedAt && !projection.isActive) continue;
      const tree = await this.readTree(row.teamRunId);
      if (!tree) continue;
      const lastActivityAt = await this.lastActivity.forTeamRun({ teamRunId: row.teamRunId, createdAt: row.createdAt });
      items.push(this.toHistoryItem(row, tree, projection, lastActivityAt));
    }
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getTeamRunResumeConfig(teamRunId: string): Promise<TeamRunResumeConfig> {
    const tree = await this.readTree(teamRunId);
    if (!tree) throw new Error(`Team run execution tree not found for '${teamRunId}'.`);
    const row = await this.catalog.getCatalogRow(teamRunId);
    const managed = this.manager.getManagedTeamRun(teamRunId);
    const isActive = managed !== null;
    const live = managed?.getLivePosition() ?? null;
    return {
      teamRunId,
      isActive,
      liveSequenceId: live?.liveSequenceId ?? null,
      baseChangeSequence: live?.changeSequence ?? 0,
      lastMessageChangeSequence: live?.lastMessageChangeSequence ?? null,
      executionTree: tree,
      modelConfigEditability: runModelConfigEditability({
        isActive,
        available: Boolean(row),
        archived: Boolean(tree.archivedAt),
      }),
    };
  }

  async archiveStoredTeamRun(teamRunId: string): Promise<ArchiveStoredTeamRunResult> {
    const refused = this.workGuard.refusal({ rootSubjectKind: "agent_team", rootRunId: teamRunId.trim() }, "archived");
    if (refused) return { success: false, message: refused };
    return this.catalog.archiveTeamRun(teamRunId);
  }

  async deleteStoredTeamRun(teamRunId: string): Promise<DeleteStoredTeamRunResult> {
    const refused = this.workGuard.refusal({ rootSubjectKind: "agent_team", rootRunId: teamRunId.trim() }, "deleted");
    if (refused) return { success: false, message: refused };
    const result = await this.catalog.deleteTeamRun(teamRunId);
    // After the committed delete, the run's ad-hoc Tasks go too (best effort; never throws).
    if (result.success) await (this.adHocTasks ?? getProjectTaskService())
      .deleteAdHocTasksDelegatedFrom(createRootExecutionIdentity({ rootSubjectKind: "agent_team", rootRunId: teamRunId.trim() }));
    return result;
  }

  private readTree(rootTeamRunId: string): Promise<TeamRunExecutionTreeSnapshot | null> {
    return this.treeStore.read(
      this.layout.getTeamDirPath({ rootTeamRunId, ancestorTeamRunIds: [] }),
      rootTeamRunId,
    );
  }

  private toHistoryItem(
    row: TeamRunIndexRow,
    tree: TeamRunExecutionTreeSnapshot,
    projection: { isActive: boolean; memberStatusSnapshots: TeamRunMemberStatusProjection[] },
    lastActivityAt: string,
  ): TeamRunHistoryItem {
    const members = collectConfiguredAgents(tree.rootTeam.members);
    return {
      teamRunId: row.teamRunId,
      teamDefinitionId: row.teamDefinitionId,
      teamDefinitionName: row.teamDefinitionName,
      coordinatorAddress: tree.rootTeam.coordinatorAddress,
      workspaceRootPath: row.workspaceRootPath ?? members.find((member) => member.launchConfiguration.workspaceRootPath)?.launchConfiguration.workspaceRootPath ?? null,
      summary: row.summary,
      createdAt: row.createdAt,
      lastActivityAt,
      archivedAt: row.archivedAt ?? null,
      terminatedAt: row.terminatedAt ?? null,
      isActive: projection.isActive,
      members: members.map((member) => ({
        memberAddress: member.address,
        displayName: getAgentTeamAddressBasename(member.address) ?? member.address,
        agentRunId: member.agentRunId,
        status: statusFor(member.agentRunId, projection.memberStatusSnapshots),
        runtimeKind: member.launchConfiguration.runtimeKind as RuntimeKind,
        platformAgentRunId: member.platformAgentRunId,
        agentDefinitionId: member.agentDefinitionId,
        llmModelIdentifier: member.launchConfiguration.llmModelIdentifier,
        autoExecuteTools: member.launchConfiguration.autoExecuteTools,
        llmConfig: member.launchConfiguration.llmConfig as Record<string, unknown> | null,
        workspaceRootPath: member.launchConfiguration.workspaceRootPath,
      })),
      rootTeam: projectExecutionTree(tree).root_team,
    };
  }
}

const collectConfiguredAgents = (members: readonly ConfiguredExecutionNode[]): ConfiguredAgentExecutionNode[] => {
  return [...members];
};

const statusFor = (agentRunId: string, snapshots: TeamRunMemberStatusProjection[]): AgentApiStatus =>
  snapshots.find((snapshot) => snapshot.agentRunId === agentRunId)?.status ?? "offline";

let processService: TeamRunHistoryService | null = null;
/** The composition root sets the process service it created (SR-047 step 8); the returned function releases it. */
export const setProcessTeamRunHistoryService = (service: TeamRunHistoryService): (() => void) => {
  processService = service;
  return () => { if (processService === service) processService = null; };
};
/** The process service; its callers are older lookups (FU-011). */
export const getTeamRunHistoryService = (): TeamRunHistoryService => {
  if (!processService) throw new Error("TeamRunHistoryService is created by the composition root.");
  return processService;
};
