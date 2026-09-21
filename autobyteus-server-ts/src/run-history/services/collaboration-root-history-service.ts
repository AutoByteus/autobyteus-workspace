import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { AgentOrgRunManager } from "../../agent-org-execution/services/agent-org-run-manager.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../../agent-org-execution/domain/agent-org-run-execution-tree.js";
import type { TeamRunHistoryItem } from "../domain/team-run-history-index-types.js";
import { AgentOrgRunExecutionTreeStore } from "../store/agent-org-run-execution-tree-store.js";
import type { AgentOrgRunHistoryCatalogService } from "./agent-org-run-history-catalog-service.js";
import type { TeamRunHistoryService } from "./team-run-history-service.js";

export type CollaborationRootHistoryItem =
  | Readonly<{ root_subject_kind: "agent_team"; root_run_id: string; created_at: string; archived_at: string | null; is_active: boolean; summary: string; team: TeamRunHistoryItem }>
  | Readonly<{ root_subject_kind: "agent_org"; root_run_id: string; created_at: string; archived_at: string | null; is_active: boolean; summary: string; org: AgentOrgRunExecutionTreeSnapshot }>;

/** Read-only mixed facade. Family selection remains explicit and subject readers stay authoritative. */
export class CollaborationRootHistoryService {
  private readonly layout: AgentMemoryLayout;
  private readonly orgTrees: AgentOrgRunExecutionTreeStore;
  constructor(private readonly dependencies: Readonly<{
    memoryDir: string;
    teams: Pick<TeamRunHistoryService, "listTeamRunHistory">;
    orgs: Pick<AgentOrgRunHistoryCatalogService, "listRows">;
    orgRuns: Pick<AgentOrgRunManager, "getActive">;
    orgTrees?: AgentOrgRunExecutionTreeStore;
  }>) {
    this.layout = new AgentMemoryLayout(dependencies.memoryDir);
    this.orgTrees = dependencies.orgTrees ?? new AgentOrgRunExecutionTreeStore();
  }
  async list(): Promise<readonly CollaborationRootHistoryItem[]> {
    const [teams, orgRows] = await Promise.all([
      this.dependencies.teams.listTeamRunHistory(),
      this.dependencies.orgs.listRows(),
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
      const active = this.dependencies.orgRuns.getActive(row.orgRunId);
      const tree = active?.getExecutionTreeSnapshot()
        ?? await this.orgTrees.read(this.layout.getOrgDirPath(row.orgRunId), row.orgRunId);
      if (!tree || (row.archivedAt && !active)) continue;
      items.push(Object.freeze({
        root_subject_kind: "agent_org",
        root_run_id: row.orgRunId,
        created_at: row.createdAt,
        archived_at: row.archivedAt,
        is_active: Boolean(active),
        summary: row.summary,
        org: tree,
      }));
    }
    return Object.freeze(items.sort((left, right) => right.created_at.localeCompare(left.created_at)));
  }
}
