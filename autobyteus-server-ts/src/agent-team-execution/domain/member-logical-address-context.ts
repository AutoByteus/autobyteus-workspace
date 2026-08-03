import { formatAbsoluteCollaborationAddress } from "../../agent-collaboration/domain/collaboration-logical-address.js";

export type MemberLogicalAddressContext = Readonly<{
  rootTeamRunId: string;
  memberAddress: string;
  memberPath: readonly string[];
  immediateTeamAddress: string;
  immediateTeamPath: readonly string[];
}>;

const required = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

export const createMemberLogicalAddressContext = (input: {
  rootTeamRunId: string;
  memberPath: readonly string[];
  immediateTeamPath: readonly string[];
}): MemberLogicalAddressContext => {
  const memberPath = Object.freeze([...input.memberPath]);
  const immediateTeamPath = Object.freeze([...input.immediateTeamPath]);
  if (memberPath.length !== immediateTeamPath.length + 1) {
    throw new Error("Member logical address must be a direct child of its immediate Team path.");
  }
  return Object.freeze({
    rootTeamRunId: required(input.rootTeamRunId, "rootTeamRunId"),
    memberAddress: formatAbsoluteCollaborationAddress(memberPath),
    memberPath,
    immediateTeamAddress: formatAbsoluteCollaborationAddress(immediateTeamPath),
    immediateTeamPath,
  });
};

export const cloneMemberLogicalAddressContext = (
  context: MemberLogicalAddressContext,
): MemberLogicalAddressContext => createMemberLogicalAddressContext({
  rootTeamRunId: context.rootTeamRunId,
  memberPath: context.memberPath,
  immediateTeamPath: context.immediateTeamPath,
});
