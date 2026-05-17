import type {
  TeamRunAgentMemberMetadata,
  TeamRunMemberMetadata,
  TeamRunMetadata,
  TeamRunSubTeamMemberMetadata,
} from "../store/team-run-metadata-types.js";

export type TeamRunTopLevelMemberSummary =
  | TeamRunAgentMemberMetadata
  | TeamRunSubTeamMemberMetadata;

export const flattenTeamRunAgentMemberMetadata = (
  memberTree: readonly TeamRunMemberMetadata[],
): TeamRunAgentMemberMetadata[] => {
  const agents: TeamRunAgentMemberMetadata[] = [];
  const visit = (members: readonly TeamRunMemberMetadata[]): void => {
    for (const member of members) {
      if (member.memberKind === "agent") {
        agents.push({ ...member, memberPath: [...member.memberPath] });
      } else {
        visit(member.memberTree);
      }
    }
  };
  visit(memberTree);
  return agents;
};

export const getTeamRunLeafAgentMetadata = (
  metadata: TeamRunMetadata,
): TeamRunAgentMemberMetadata[] => flattenTeamRunAgentMemberMetadata(metadata.memberTree);

export const getTeamRunTopLevelMemberSummaries = (
  metadata: TeamRunMetadata,
): TeamRunTopLevelMemberSummary[] => metadata.memberTree.map((member) => ({
  ...member,
  memberPath: [...member.memberPath],
  ...(member.memberKind === "agent_team" ? { memberTree: member.memberTree.map((child) => ({ ...child })) } : {}),
} as TeamRunTopLevelMemberSummary));

export const resolveTeamRunMemberByRouteKey = (
  metadata: TeamRunMetadata,
  memberRouteKey: string,
): TeamRunMemberMetadata | null => {
  const stack = [...metadata.memberTree];
  while (stack.length > 0) {
    const member = stack.shift()!;
    if (member.memberRouteKey === memberRouteKey) {
      return member;
    }
    if (member.memberKind === "agent_team") {
      stack.push(...member.memberTree);
    }
  }
  return null;
};

export const resolveTeamRunLeafAgentByRouteKey = (
  metadata: TeamRunMetadata,
  memberRouteKey: string,
): TeamRunAgentMemberMetadata | null => {
  const member = resolveTeamRunMemberByRouteKey(metadata, memberRouteKey);
  return member?.memberKind === "agent" ? member : null;
};

export const resolveTeamWorkspaceRootPath = (
  metadata: TeamRunMetadata,
): string | null =>
  getTeamRunLeafAgentMetadata(metadata).find((member) => member.workspaceRootPath)?.workspaceRootPath ?? null;
