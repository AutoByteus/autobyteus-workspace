import { AgentMemoryLayout } from "../../../agent-memory/store/agent-memory-layout.js";
import { AgentOrgExecutionIndex } from "../../../agent-org-execution/services/agent-org-execution-index.js";
import { getAgentOrgRunExecutionTreePath } from "../../../run-history/store/agent-org-run-execution-tree-path.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../run-history/store/agent-org-run-execution-tree-schema.js";
import { assertMigrationRootId, migrationPathExists, readMigrationJson, type HistoryCandidatePlan } from "./agent-org-history-candidate-plan.js";
import {
  AgentOrgTokenAttributionDataRejection,
  AgentOrgTokenAttributionRepository,
  type OrgTokenAttributionRepository,
} from "./agent-org-token-attribution-repository.js";

/** Independent token-source discovery; never enumerates or reads histories. */
export class AgentOrgTokenAttributionTransition {
  private readonly layout: AgentMemoryLayout;
  constructor(memoryDir: string, private readonly repository: OrgTokenAttributionRepository = new AgentOrgTokenAttributionRepository()) {
    this.layout = new AgentMemoryLayout(memoryDir);
  }
  async execute(plans: readonly HistoryCandidatePlan[], blocked: ReadonlyMap<string, string>) {
    const warnings = new Map<string, string>();
    const failures = new Map<string, string>();
    const changed = new Map<string, number>();
    const indexes = new Map(plans.map((plan) => [plan.id, plan.index]));
    const roots = new Set(indexes.keys());
    try { for await (const id of this.repository.listClaimedRoots()) roots.add(id); }
    catch (error) { throw new Error(`Token source discovery failed: ${String(error)}`); }
    for (const id of roots) {
      if (blocked.has(id)) continue;
      try {
        assertMigrationRootId(id);
        let index = indexes.get(id);
        if (!index) {
          const dir = this.layout.getOrgDirPath(id);
          if (!await migrationPathExists(dir)) continue; // Native Team or unrelated claim.
          if (await migrationPathExists(this.layout.getTeamDirPath({ rootTeamRunId: id, ancestorTeamRunIds: [] }))) {
            throw new Error("Token root exists in both Team and Org families.");
          }
          const tree = validateAgentOrgRunExecutionTreePayload(await readMigrationJson(getAgentOrgRunExecutionTreePath(dir)), id);
          if (!tree.rootOrg.members.some((member) => "teamRunId" in member)) continue;
          index = new AgentOrgExecutionIndex(tree);
        }
        changed.set(id, await this.repository.convertRoot(id, index.listAgents().map((agent) => agent.agentRunId)));
      } catch (error) {
        (error instanceof AgentOrgTokenAttributionDataRejection ? warnings : failures).set(id, String(error));
      }
    }
    return { warnings, failures, changed };
  }
}
