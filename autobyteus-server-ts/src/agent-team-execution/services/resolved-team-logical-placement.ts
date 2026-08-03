export type ResolvedLogicalAgentCoordinate = Readonly<{
  absoluteAddress: string;
  memberRouteKey: string;
}>;

export type ResolvedLogicalTeamCoordinate = Readonly<{
  absoluteAddress: string;
}>;

export type ResolvedPlacementOwnerCoordinate = Readonly<{
  teamPath: readonly string[];
  localMemberPath: readonly [string];
  localMemberRouteKey: string;
}>;

export type ResolvedAgentPlacement = Readonly<{
  kind: "agent";
  subject: ResolvedLogicalAgentCoordinate;
  owner: ResolvedPlacementOwnerCoordinate;
}>;

export type ResolvedAgentTeamPlacement = Readonly<{
  kind: "team";
  subject: ResolvedLogicalTeamCoordinate;
  owner: ResolvedPlacementOwnerCoordinate | null;
  ingress: ResolvedLogicalAgentCoordinate;
}>;

export type ResolvedTeamLogicalPlacement =
  | ResolvedAgentPlacement
  | ResolvedAgentTeamPlacement;

const agentCoordinate = (
  input: ResolvedLogicalAgentCoordinate,
): ResolvedLogicalAgentCoordinate => Object.freeze({
  absoluteAddress: input.absoluteAddress,
  memberRouteKey: input.memberRouteKey,
});

const ownerCoordinate = (
  input: ResolvedPlacementOwnerCoordinate,
): ResolvedPlacementOwnerCoordinate => Object.freeze({
  teamPath: Object.freeze([...input.teamPath]),
  localMemberPath: Object.freeze([input.localMemberPath[0]]) as readonly [string],
  localMemberRouteKey: input.localMemberRouteKey,
});

export const createResolvedAgentPlacement = (input: {
  subject: ResolvedLogicalAgentCoordinate;
  owner: ResolvedPlacementOwnerCoordinate;
}): ResolvedAgentPlacement => Object.freeze({
  kind: "agent",
  subject: agentCoordinate(input.subject),
  owner: ownerCoordinate(input.owner),
});

export const createResolvedAgentTeamPlacement = (input: {
  subject: ResolvedLogicalTeamCoordinate;
  owner: ResolvedPlacementOwnerCoordinate | null;
  ingress: ResolvedLogicalAgentCoordinate;
}): ResolvedAgentTeamPlacement => Object.freeze({
  kind: "team",
  subject: Object.freeze({ absoluteAddress: input.subject.absoluteAddress }),
  owner: input.owner ? ownerCoordinate(input.owner) : null,
  ingress: agentCoordinate(input.ingress),
});

export const cloneResolvedTeamLogicalPlacement = (
  placement: ResolvedTeamLogicalPlacement,
): ResolvedTeamLogicalPlacement => placement.kind === "agent"
  ? createResolvedAgentPlacement(placement)
  : createResolvedAgentTeamPlacement(placement);
