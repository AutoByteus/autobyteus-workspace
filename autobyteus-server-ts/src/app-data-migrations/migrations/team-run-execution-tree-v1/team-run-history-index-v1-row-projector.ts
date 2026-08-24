import path from "node:path";
import type { TeamRunExecutionTreeSnapshot } from "./team-run-execution-tree-v1-types.js";
import type { TeamRunIndexRowRecord } from "../../../run-history/store/team-run-history-index-record-types.js";
import { canonicalizeWorkspaceRootPath } from "../../../run-history/utils/workspace-path-normalizer.js";
import { compactSummary } from "../../../run-history/services/run-history-service-helpers.js";

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} cannot be empty.`);
  return normalized;
};

const optional = (value: string | null | undefined): string | null => value?.trim() || null;

const safeRunId = (value: string): string => {
  const runId = required(value, "teamRunId");
  if (path.isAbsolute(runId) || /[\\/]/.test(runId) || runId === "." || runId === "..") {
    throw new Error("teamRunId must be a safe team run identity.");
  }
  return runId;
};

const workspaceFromTree = (tree: TeamRunExecutionTreeSnapshot): string | null => {
  const visit = (members: TeamRunExecutionTreeSnapshot["rootTeam"]["members"]): string | null => {
    for (const member of members) {
      if ("agentRunId" in member) {
        const workspace = member.launchConfiguration.workspaceRootPath;
        if (workspace) return canonicalizeWorkspaceRootPath(workspace);
      } else {
        const nested = visit(member.members);
        if (nested) return nested;
      }
    }
    return null;
  };
  return visit(tree.rootTeam.members);
};

export type TeamRunHistoryIndexProjectionInput = Readonly<{
  tree: TeamRunExecutionTreeSnapshot;
  existingRow?: TeamRunIndexRowRecord | null;
  recoveredSummary?: string | null;
}>;

export const projectTeamRunHistoryIndexRow = (
  input: TeamRunHistoryIndexProjectionInput,
): TeamRunIndexRowRecord => ({
  teamRunId: safeRunId(input.tree.rootTeam.teamRunId),
  teamDefinitionId: required(input.tree.rootTeam.teamDefinitionId, "teamDefinitionId"),
  teamDefinitionName: optional(input.tree.rootTeam.teamDefinitionName)
    ?? required(input.tree.rootTeam.teamDefinitionId, "teamDefinitionId"),
  workspaceRootPath: workspaceFromTree(input.tree),
  summary: compactSummary(input.existingRow?.summary || input.recoveredSummary || ""),
  createdAt: required(input.tree.createdAt, "createdAt"),
  archivedAt: optional(input.tree.archivedAt),
  terminatedAt: optional(input.existingRow?.terminatedAt),
});
