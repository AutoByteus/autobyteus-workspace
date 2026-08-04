import {
  assertCanonicalCollaborationAddress,
  getCollaborationAddressBasename,
  type CanonicalCollaborationAddress,
} from "../../agent-collaboration/domain/collaboration-logical-address.js";

export type MemberLogicalAddressContext = Readonly<{
  rootTeamRunId: string;
  memberAddress: CanonicalCollaborationAddress;
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
  memberAddress: string;
}): MemberLogicalAddressContext => {
  const keys = Object.keys(input).sort();
  if (keys.length !== 2 || keys[0] !== "memberAddress" || keys[1] !== "rootTeamRunId") {
    throw new Error("Member logical address context accepts only rootTeamRunId and memberAddress.");
  }
  const memberAddress = assertCanonicalCollaborationAddress(input.memberAddress);
  if (!getCollaborationAddressBasename(memberAddress)) {
    throw new Error("memberAddress must identify an Agent placement, not the root Team.");
  }
  return Object.freeze({
    rootTeamRunId: required(input.rootTeamRunId, "rootTeamRunId"),
    memberAddress,
  });
};

export const cloneMemberLogicalAddressContext = (
  context: MemberLogicalAddressContext,
): MemberLogicalAddressContext => createMemberLogicalAddressContext({
  rootTeamRunId: context.rootTeamRunId,
  memberAddress: context.memberAddress,
});
