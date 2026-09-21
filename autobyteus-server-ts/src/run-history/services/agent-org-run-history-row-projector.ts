import type { AgentOrgRunExecutionTreeSnapshot } from "../../agent-org-execution/domain/agent-org-run-execution-tree.js";
import type { AgentOrgRunIndexRowRecord } from "../store/agent-org-run-history-index-record-types.js";

export const projectAgentOrgRunHistoryRow = (
  tree: AgentOrgRunExecutionTreeSnapshot,
  existing?: AgentOrgRunIndexRowRecord | null,
): AgentOrgRunIndexRowRecord => Object.freeze({
  orgRunId: tree.rootOrg.orgRunId,
  orgDefinitionId: tree.rootOrg.orgDefinitionId,
  orgDefinitionName: tree.rootOrg.orgDefinitionName,
  workspaceRootPath: tree.rootOrg.defaultLaunchConfiguration.workspaceRootPath,
  summary: existing?.summary ?? "",
  createdAt: tree.createdAt,
  archivedAt: tree.archivedAt,
  terminatedAt: existing?.terminatedAt ?? null,
});
