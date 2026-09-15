import { isDeepStrictEqual } from "node:util";
import { TeamRunHistoryIndexStore } from "../../../run-history/store/team-run-history-index-store.js";
import { AgentOrgRunHistoryIndexStore } from "../../../run-history/store/agent-org-run-history-index-store.js";
import type { HistoryCandidatePlan, HistoryCandidateSelection } from "./agent-org-history-candidate-plan.js";

const keyed = <T>(rows: readonly T[], key: (row: T) => string) => [...rows].sort((a, b) => key(a).localeCompare(key(b)));
/** Paired atomic indexes: publish Org first; retain Team source until strict reread. */
export class AgentOrgHistoryIndexTransition {
  constructor(
    private readonly selection: HistoryCandidateSelection,
    private readonly teamStore: TeamRunHistoryIndexStore,
    private readonly orgStore: AgentOrgRunHistoryIndexStore,
  ) {}
  async commit(plans: readonly HistoryCandidatePlan[]): Promise<number> {
    if (!plans.length) return 0;
    const { teamSnapshot, orgRows } = this.selection;
    const teams = new Map(teamSnapshot.rows.map((row) => [row.teamRunId, row]));
    const orgs = new Map(orgRows.map((row) => [row.orgRunId, row]));
    for (const plan of plans) {
      const tree = plan.index.tree;
      const preserved = orgs.get(plan.id) ?? teams.get(plan.id);
      orgs.set(plan.id, {
        orgRunId: plan.id, orgDefinitionId: tree.rootOrg.orgDefinitionId,
        orgDefinitionName: tree.rootOrg.orgDefinitionName,
        workspaceRootPath: tree.rootOrg.defaultLaunchConfiguration.workspaceRootPath,
        summary: preserved?.summary ?? "", createdAt: tree.createdAt, archivedAt: tree.archivedAt,
        terminatedAt: preserved?.terminatedAt ?? null,
      });
      teams.delete(plan.id);
    }
    const nextOrgs = [...orgs.values()], nextTeams = [...teams.values()];
    const sameOrgs = (rows: typeof nextOrgs) => isDeepStrictEqual(keyed(rows, (r) => r.orgRunId), keyed(nextOrgs, (r) => r.orgRunId));
    if (!sameOrgs(orgRows)) await this.orgStore.writeIndex(nextOrgs);
    if (!sameOrgs(await this.orgStore.readIndex())) throw new Error("Org index strict reread differs from selected update.");
    if (!isDeepStrictEqual(teamSnapshot.rows, nextTeams)) await this.teamStore.writeIndex(nextTeams);
    if (!isDeepStrictEqual((await this.teamStore.readIndexStrict()).rows, nextTeams)) throw new Error("Team index strict reread differs from selected update.");
    return teamSnapshot.rows.length - nextTeams.length;
  }
}
