import type { CompactionLineageScope } from "autobyteus-ts/memory/lineage/compaction-lineage-scope.js";

type MemberTeamIdentity = {
  identity: {
    rootTeamRunId: string;
    agentRunId: string;
  };
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
      runId: requireText(memberTeamContext.identity.rootTeamRunId, "rootTeamRunId"),
      memberId: requireText(memberTeamContext.identity.agentRunId, "agentRunId"),
    }
  : {
      targetKind: "agent_run",
      runId: requireText(runId, "runId"),
      memberId: null,
    };
