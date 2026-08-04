import {
  assertCanonicalCollaborationAddress,
  getCollaborationAddressBasename,
  type CanonicalCollaborationAddress,
} from "../../agent-collaboration/domain/collaboration-logical-address.js";

export type ResolvedAgentPlacement = Readonly<{
  kind: "agent";
  address: CanonicalCollaborationAddress;
}>;

export type ResolvedAgentTeamPlacement = Readonly<{
  kind: "team";
  address: CanonicalCollaborationAddress;
  ingressAddress: CanonicalCollaborationAddress;
}>;

export type ResolvedTeamLogicalPlacement = ResolvedAgentPlacement | ResolvedAgentTeamPlacement;

export const createResolvedAgentPlacement = (input: {
  address: string;
}): ResolvedAgentPlacement => Object.freeze({
  kind: "agent",
  address: requiredAgentAddress(input.address, "address"),
});

export const createResolvedAgentTeamPlacement = (input: {
  address: string;
  ingressAddress: string;
}): ResolvedAgentTeamPlacement => Object.freeze({
  kind: "team",
  address: assertCanonicalCollaborationAddress(input.address),
  ingressAddress: requiredAgentAddress(input.ingressAddress, "ingressAddress"),
});

export const cloneResolvedTeamLogicalPlacement = (
  placement: ResolvedTeamLogicalPlacement,
): ResolvedTeamLogicalPlacement => placement.kind === "agent"
  ? createResolvedAgentPlacement(placement)
  : createResolvedAgentTeamPlacement(placement);

const requiredAgentAddress = (
  value: string,
  fieldName: string,
): CanonicalCollaborationAddress => {
  const address = assertCanonicalCollaborationAddress(value);
  if (!getCollaborationAddressBasename(address)) {
    throw new Error(`${fieldName} must identify an Agent placement, not the root Team.`);
  }
  return address;
};
