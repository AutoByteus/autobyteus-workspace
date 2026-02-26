import type { AgentTeamDefinition } from "../../agent-team-definition/domain/models.js";
import type { PlacementByMember } from "../member-placement/member-placement-resolver.js";

export type EnsureMemberDependencyReadyInput = {
  teamDefinitionId: string;
  memberName: string;
  nodeId: string;
  referenceType: string;
  referenceId: string;
};

export type EnsureMemberDependencyReady = (
  input: EnsureMemberDependencyReadyInput,
) => void;

export class DependencyHydrationService {
  private readonly ensureMemberDependencyReady: EnsureMemberDependencyReady;

  constructor(options: { ensureMemberDependencyReady?: EnsureMemberDependencyReady } = {}) {
    this.ensureMemberDependencyReady =
      options.ensureMemberDependencyReady ?? (() => undefined);
  }

  ensureMemberDependenciesAvailable(input: {
    teamDefinition: AgentTeamDefinition;
    placementByMember: PlacementByMember;
  }): void {
    const teamDefinitionId = input.teamDefinition.id?.trim();
    if (!teamDefinitionId) {
      throw new Error("teamDefinition.id is required for dependency hydration.");
    }

    for (const member of input.teamDefinition.nodes) {
      const placement = input.placementByMember[member.memberName];
      if (!placement) {
        throw new Error(
          `Dependency hydration missing placement for member '${member.memberName}'.`,
        );
      }
      this.ensureMemberDependencyReady({
        teamDefinitionId,
        memberName: member.memberName,
        nodeId: placement.nodeId,
        referenceType: member.referenceType,
        referenceId: member.referenceId,
      });
    }
  }
}
