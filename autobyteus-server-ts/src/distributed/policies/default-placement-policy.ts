import type { TeamMember } from "../../agent-team-definition/domain/models.js";

export type PlacementCandidateNode = {
  nodeId: string;
  isHealthy?: boolean;
  supportsAgentExecution?: boolean;
};

const hashMemberName = (memberName: string): number => {
  let hash = 0;
  for (let i = 0; i < memberName.length; i += 1) {
    hash = (hash * 31 + memberName.charCodeAt(i)) >>> 0;
  }
  return hash;
};

export class NoPlacementCandidateError extends Error {
  constructor(memberName: string) {
    super(`No eligible placement node is available for team member '${memberName}'.`);
    this.name = "NoPlacementCandidateError";
  }
}

export class DefaultPlacementPolicy {
  assignByCapabilityAndHealth(
    member: TeamMember,
    candidateNodes: PlacementCandidateNode[],
    defaultNodeId?: string | null
  ): string {
    const eligibleNodes = candidateNodes.filter(
      (node) => node.supportsAgentExecution !== false && node.isHealthy !== false
    );

    if (eligibleNodes.length === 0) {
      throw new NoPlacementCandidateError(member.memberName);
    }

    if (defaultNodeId) {
      const preferredDefault = eligibleNodes.find((node) => node.nodeId === defaultNodeId);
      if (preferredDefault) {
        return preferredDefault.nodeId;
      }
    }

    const index = hashMemberName(member.memberName) % eligibleNodes.length;
    return eligibleNodes[index]!.nodeId;
  }
}
