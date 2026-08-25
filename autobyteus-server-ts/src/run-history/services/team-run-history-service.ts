import { getAgentTeamAddressBasename } from "../../agent-collaboration/domain/agent-team-address.js";
import type { ConfiguredAgentExecutionNode, ConfiguredExecutionNode, TeamRunExecutionTreeSnapshot } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type { AgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { TeamRunHistoryItem, TeamRunIndexRow } from "../domain/team-run-history-index-types.js";
import { TeamRunExecutionTreeStore } from "../store/team-run-execution-tree-store.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { TeamRunHistoryCatalogService, getTeamRunHistoryCatalogService } from "./team-run-history-catalog-service.js";
import { TeamRunLiveProjectionService, type TeamRunMemberStatusProjection } from "./team-run-live-projection-service.js";
import { projectExecutionTree } from "../../services/agent-streaming/team-execution-view-projector.js";
import { computeTeamRunModelConfigRevision } from "../domain/run-model-config-revision.js";
import { runModelConfigEditability, type RunModelConfigEditability } from "../domain/run-model-config.js";

export interface DeleteStoredTeamRunResult { success: boolean; message: string }
export interface ArchiveStoredTeamRunResult { success: boolean; message: string }
export interface TeamRunResumeConfig {
  teamRunId: string;
  isActive: boolean;
  executionTree: TeamRunExecutionTreeSnapshot;
  modelConfigEditability: RunModelConfigEditability;
}

export class TeamRunHistoryService {
  private readonly treeStore: TeamRunExecutionTreeStore;
  private readonly catalog: TeamRunHistoryCatalogService;
  private readonly manager: AgentTeamRunManager;
  private readonly live: TeamRunLiveProjectionService;
  private readonly layout: AgentMemoryLayout;

  constructor(memoryDir: string, options: {
    executionTreeStore?: TeamRunExecutionTreeStore;
    catalogService?: TeamRunHistoryCatalogService;
    teamRunManager?: AgentTeamRunManager;
    liveProjectionService?: TeamRunLiveProjectionService;
  } = {}) {
    this.treeStore = options.executionTreeStore ?? new TeamRunExecutionTreeStore();
    this.catalog = options.catalogService ?? getTeamRunHistoryCatalogService();
    this.manager = options.teamRunManager ?? AgentTeamRunManager.getInstance();
    this.live = options.liveProjectionService ?? new TeamRunLiveProjectionService(this.manager);
    this.layout = new AgentMemoryLayout(memoryDir);
  }

  async listTeamRunHistory(): Promise<TeamRunHistoryItem[]> {
    const items: TeamRunHistoryItem[] = [];
    for (const row of await this.catalog.listCatalogRows()) {
      const projection = this.live.getCatalogListLiveProjection(row.teamRunId);
      if (row.archivedAt && !projection.isActive) continue;
      const tree = await this.readTree(row.teamRunId);
      if (!tree) continue;
      items.push(this.toHistoryItem(row, tree, projection));
    }
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getTeamRunResumeConfig(teamRunId: string): Promise<TeamRunResumeConfig> {
    const tree = await this.readTree(teamRunId);
    if (!tree) throw new Error(`Team run execution tree not found for '${teamRunId}'.`);
    const isActive = this.manager.hasManagedTeamRun(teamRunId);
    const row = await this.catalog.getCatalogRow(teamRunId);
    return {
      teamRunId,
      isActive,
      executionTree: tree,
      modelConfigEditability: runModelConfigEditability({
        isActive,
        available: Boolean(row),
        archived: Boolean(tree.archivedAt),
        configurationRevision: computeTeamRunModelConfigRevision(tree),
      }),
    };
  }

  archiveStoredTeamRun(teamRunId: string): Promise<ArchiveStoredTeamRunResult> {
    return this.catalog.archiveTeamRun(teamRunId);
  }

  deleteStoredTeamRun(teamRunId: string): Promise<DeleteStoredTeamRunResult> {
    return this.catalog.deleteTeamRun(teamRunId);
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
  const output: ConfiguredAgentExecutionNode[] = [];
  for (const member of members) {
    if ("agentRunId" in member) output.push(member);
    else output.push(...collectConfiguredAgents(member.members));
  }
  return output;
};

const statusFor = (agentRunId: string, snapshots: TeamRunMemberStatusProjection[]): AgentApiStatus =>
  snapshots.find((snapshot) => snapshot.agentRunId === agentRunId)?.status ?? "offline";

let cachedTeamRunHistoryService: TeamRunHistoryService | null = null;
export const getTeamRunHistoryService = (): TeamRunHistoryService => cachedTeamRunHistoryService ??=
  new TeamRunHistoryService(appConfigProvider.config.getMemoryDir());
