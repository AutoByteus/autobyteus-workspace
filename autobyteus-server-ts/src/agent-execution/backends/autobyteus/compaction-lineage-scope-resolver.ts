import type { CompactionLineageScope } from "autobyteus-ts/memory/lineage/compaction-lineage-scope.js";
import type { MemberExecutionContext } from "../../../agent-collaboration/execution/domain/member-execution-context.js";

const requireText = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${fieldName} is required for compaction lineage.`);
  return normalized;
};

/**
 * Team members compact under their root TeamRun. AgentOrg members, the Agent-root host and
 * Agent-root children compact under their own AgentRun (the host keeps its standalone lineage).
 */
export const resolveCompactionLineageScope = (
  runId: string,
  memberExecutionContext: MemberExecutionContext | null | undefined,
): CompactionLineageScope => {
  switch (memberExecutionContext?.identity.root.rootSubjectKind) {
    case "agent_team":
      return {
        targetKind: "team_member",
        runId: requireText(memberExecutionContext.identity.root.rootRunId, "rootRunId"),
        memberId: requireText(memberExecutionContext.identity.agentRunId, "agentRunId"),
      };
    case "agent_org":
    case "agent":
    case undefined:
      return { targetKind: "agent_run", runId: requireText(runId, "runId"), memberId: null };
  }
};
