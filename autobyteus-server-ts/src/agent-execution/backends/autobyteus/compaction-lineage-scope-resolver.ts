import type { CompactionLineageScope } from "autobyteus-ts/memory/lineage/compaction-lineage-scope.js";
import type { MemberExecutionContext } from "../../../agent-collaboration/execution/domain/member-execution-context.js";

const requireText = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${fieldName} is required for compaction lineage.`);
  return normalized;
};

export const resolveCompactionLineageScope = (
  runId: string,
  memberExecutionContext: MemberExecutionContext | null | undefined,
): CompactionLineageScope => memberExecutionContext?.identity.root.rootSubjectKind === "agent_team"
  ? {
      targetKind: "team_member",
      runId: requireText(memberExecutionContext.identity.root.rootRunId, "rootRunId"),
      memberId: requireText(memberExecutionContext.identity.agentRunId, "agentRunId"),
    }
  : {
      targetKind: "agent_run",
      runId: requireText(runId, "runId"),
      memberId: null,
    };
