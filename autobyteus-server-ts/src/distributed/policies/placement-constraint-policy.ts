import type { TeamMember } from "../../agent-team-definition/domain/models.js";

const normalizeNodeId = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export class UnknownHomeNodeError extends Error {
  readonly memberName: string;
  readonly homeNodeId: string;

  constructor(memberName: string, homeNodeId: string) {
    super(`Team member '${memberName}' references unknown homeNodeId '${homeNodeId}'.`);
    this.name = "UnknownHomeNodeError";
    this.memberName = memberName;
    this.homeNodeId = homeNodeId;
  }
}

export class HomeNodeUnavailableError extends Error {
  readonly memberName: string;
  readonly homeNodeId: string;

  constructor(memberName: string, homeNodeId: string) {
    super(`Team member '${memberName}' home node '${homeNodeId}' is unavailable.`);
    this.name = "HomeNodeUnavailableError";
    this.memberName = memberName;
    this.homeNodeId = homeNodeId;
  }
}

export class PlacementConstraintPolicy {
  validateHomeNodeOwnership(
    member: TeamMember,
    knownNodeIds: Set<string>,
    availableNodeIds: Set<string>
  ): void {
    const homeNodeId = normalizeNodeId(member.homeNodeId);

    if (homeNodeId && !knownNodeIds.has(homeNodeId)) {
      throw new UnknownHomeNodeError(member.memberName, homeNodeId);
    }

    if (homeNodeId && !availableNodeIds.has(homeNodeId)) {
      throw new HomeNodeUnavailableError(member.memberName, homeNodeId);
    }
  }
}
