export type E2eTeamMemberMetadata = {
  memberKind?: "agent" | "agent_team";
  memberName: string;
  memberRouteKey: string;
  memberRunId?: string;
  workspaceRootPath?: string | null;
  platformAgentRunId?: string | null;
  runtimeKind?: string | null;
  llmModelIdentifier?: string | null;
  memberTree?: E2eTeamMemberMetadata[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const isMetadataMember = (value: unknown): value is E2eTeamMemberMetadata =>
  isRecord(value) &&
  typeof value.memberName === "string" &&
  typeof value.memberRouteKey === "string";

export const flattenE2eTeamMemberMetadata = (
  metadata: Record<string, unknown>,
): E2eTeamMemberMetadata[] => {
  if (Array.isArray(metadata.memberMetadata)) {
    return metadata.memberMetadata.filter(isMetadataMember);
  }

  const flattened: E2eTeamMemberMetadata[] = [];
  const visit = (members: unknown[]): void => {
    for (const member of members) {
      if (!isMetadataMember(member)) {
        continue;
      }
      if (member.memberKind !== "agent_team") {
        flattened.push(member);
      }
      if (Array.isArray(member.memberTree)) {
        visit(member.memberTree);
      }
    }
  };

  visit(Array.isArray(metadata.memberTree) ? metadata.memberTree : []);
  return flattened;
};
