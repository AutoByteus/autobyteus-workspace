import type { CompactionLineageScope } from "autobyteus-ts/memory/lineage/compaction-lineage-scope.js";

type MemberTeamIdentity = {
  teamRunId: string;
  memberRunId: string;
};

const requireText = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${fieldName} is required for compaction lineage.`);
  return normalized;
};

export const resolveCompactionLineageScope = (
  runId: string,
  memberTeamContext: MemberTeamIdentity | null | undefined,
): CompactionLineageScope => memberTeamContext
  ? {
      targetKind: "team_member",
      runId: requireText(memberTeamContext.teamRunId, "teamRunId"),
      memberId: requireText(memberTeamContext.memberRunId, "memberRunId"),
    }
  : {
      targetKind: "agent_run",
      runId: requireText(runId, "runId"),
      memberId: null,
    };
