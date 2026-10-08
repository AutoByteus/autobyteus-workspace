import type { AgentOrgRunIndexRowRecord } from "../store/agent-org-run-history-index-record-types.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { AgentOrgRunManager } from "../../agent-org-execution/services/agent-org-run-manager.js";
import type { AgentOrgExecutionTreeDto, TaskExecutionReferenceDto } from "@autobyteus/collaboration-stream-contracts";
import { projectAgentOrgExecutionTree } from "../../services/agent-streaming/collaboration-execution-tree-dto-projection.js";
import type { TeamRunHistoryItem } from "../domain/team-run-history-index-types.js";
import { AgentOrgRunExecutionTreeStore } from "../store/agent-org-run-execution-tree-store.js";
import type { AgentOrgRunHistoryCatalogService } from "./agent-org-run-history-catalog-service.js";
import type { TeamRunHistoryService } from "./team-run-history-service.js";

export type CollaborationRootHistoryItem =
  | Readonly<{ root_subject_kind: "agent_team"; root_run_id: string; created_at: string; archived_at: string | null; is_active: boolean; summary: string; team: TeamRunHistoryItem }>
  | Readonly<{ root_subject_kind: "agent_org"; root_run_id: string; created_at: string; archived_at: string | null; is_active: boolean; summary: string; org: AgentOrgExecutionTreeDto;
    /** Task executions of `org` whose Task is DONE or CLOSED; the Workspaces rows leave them out before the Org context hydrates. */
    closed_task_executions: readonly TaskExecutionReferenceDto[] }>;

/** Read-only mixed facade. Family selection remains explicit and subject readers stay authoritative. */
export class CollaborationRootHistoryService {
  private readonly layout: AgentMemoryLayout;
  private readonly orgTrees: AgentOrgRunExecutionTreeStore;
  constructor(private readonly dependencies: Readonly<{
    memoryDir: string;
    teams: Pick<TeamRunHistoryService, "listTeamRunHistory">;
    orgs: Pick<AgentOrgRunHistoryCatalogService, "listCatalogRows" | "getCatalogRow">;
    orgRuns: Pick<AgentOrgRunManager, "getActive" | "closedTaskExecutionsFor">;
    orgTrees?: AgentOrgRunExecutionTreeStore;
  }>) {
    this.layout = new AgentMemoryLayout(dependencies.memoryDir);
    this.orgTrees = dependencies.orgTrees ?? new AgentOrgRunExecutionTreeStore();
  }
  async list(): Promise<readonly CollaborationRootHistoryItem[]> {
    const [teams, orgRows] = await Promise.all([
      this.dependencies.teams.listTeamRunHistory(),
      this.dependencies.orgs.listCatalogRows(),
    ]);
    const items: CollaborationRootHistoryItem[] = teams.map((team) => Object.freeze({
      root_subject_kind: "agent_team" as const,
      root_run_id: team.teamRunId,
      created_at: team.createdAt,
      archived_at: team.archivedAt,
      is_active: team.isActive,
      summary: team.summary,
      team,
    }));
    for (const row of orgRows) {
      const item = await this.projectAgentOrg(row);
      if (item) items.push(item);
    }
    return Object.freeze(items.sort((left, right) => right.created_at.localeCompare(left.created_at)));
  }

  async getAgentOrg(orgRunId: string): Promise<Extract<CollaborationRootHistoryItem, { root_subject_kind: "agent_org" }> | null> {
    const id = orgRunId.trim();
    if (!id) throw new Error("orgRunId is required.");
    const row = await this.dependencies.orgs.getCatalogRow(id);
    return row ? this.projectAgentOrg(row) : null;
  }

  private async projectAgentOrg(row: AgentOrgRunIndexRowRecord): Promise<Extract<CollaborationRootHistoryItem, { root_subject_kind: "agent_org" }> | null> {
    const active = this.dependencies.orgRuns.getActive(row.orgRunId);
    const tree = active?.getExecutionTreeSnapshot()
      ?? await this.orgTrees.read(this.layout.getOrgDirPath(row.orgRunId), row.orgRunId);
    if (!tree || (row.archivedAt && !active)) return null;
    if (tree.rootOrg.orgRunId !== row.orgRunId) throw new Error(`AgentOrg history root mismatch for '${row.orgRunId}'.`);
    return Object.freeze({
      root_subject_kind: "agent_org",
      root_run_id: row.orgRunId,
      created_at: row.createdAt,
      archived_at: row.archivedAt,
      is_active: Boolean(active),
      summary: row.summary,
      org: projectAgentOrgExecutionTree(tree),
      closed_task_executions: this.dependencies.orgRuns.closedTaskExecutionsFor(row.orgRunId, tree),
    });
  }
}
