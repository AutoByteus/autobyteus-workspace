import {
  formatAbsoluteCollaborationAddress,
  getCollaborationAddressSegments,
  getParentCollaborationAddress,
  resolveRuntimeCollaborationAddress,
  type CanonicalCollaborationAddress,
} from "../../agent-collaboration/domain/collaboration-logical-address.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import type { MemberLogicalAddressContext } from "../domain/member-logical-address-context.js";
import type {
  TeamMemberRunConfig,
  TeamRunConfig,
  TeamRunMemberConfig,
  TeamSubTeamMemberRunConfig,
} from "../domain/team-run-config.js";
import {
  createResolvedAgentPlacement,
  createResolvedAgentTeamPlacement,
  type ResolvedTeamLogicalPlacement,
} from "./resolved-team-logical-placement.js";

type TeamCursor = {
  address: CanonicalCollaborationAddress;
  coordinatorMemberRouteKey: string | null;
  members: readonly TeamRunMemberConfig[];
};

export class TeamLogicalPlacementResolver {
  resolve(
    rootConfig: TeamRunConfig,
    recipientName: string,
    callerAddressing: MemberLogicalAddressContext,
  ): ResolvedTeamLogicalPlacement {
    const immediateTeamAddress = getParentCollaborationAddress(callerAddressing.memberAddress);
    if (!immediateTeamAddress) {
      throw new CollaborationContractError(
        "COLLABORATION_CONTEXT_REQUIRED",
        "The caller collaboration address must identify an Agent inside a Team.",
      );
    }
    const targetAddress = resolveRuntimeCollaborationAddress(recipientName, immediateTeamAddress);
    const targetPath = getCollaborationAddressSegments(targetAddress);
    if (targetPath.length === 0) {
      return this.buildTeamPlacement({
        address: formatAbsoluteCollaborationAddress([]),
        coordinatorMemberRouteKey: rootConfig.coordinatorMemberRouteKey,
        members: rootConfig.memberTree,
      });
    }

    let team: TeamCursor = {
      address: formatAbsoluteCollaborationAddress([]),
      coordinatorMemberRouteKey: rootConfig.coordinatorMemberRouteKey,
      members: rootConfig.memberTree,
    };
    for (let index = 0; index < targetPath.length; index += 1) {
      const segment = targetPath[index]!;
      const member = team.members.find((candidate) => candidate.memberName === segment) ?? null;
      if (!member) {
        throw new CollaborationContractError(
          "COLLABORATION_TARGET_NOT_FOUND",
          `Collaboration target '${formatAbsoluteCollaborationAddress(targetPath)}' was not found.`,
        );
      }
      const memberAddress = formatAbsoluteCollaborationAddress([
        ...getCollaborationAddressSegments(team.address),
        segment,
      ]);
      const isFinal = index === targetPath.length - 1;
      if (isFinal) {
        return member.memberKind === "agent"
          ? createResolvedAgentPlacement({ address: memberAddress })
          : this.buildTeamPlacement(this.toTeamCursor(member, memberAddress));
      }
      if (member.memberKind !== "agent_team") {
        throw new CollaborationContractError(
          "COLLABORATION_TRAVERSAL_INVALID",
          `Collaboration address '${formatAbsoluteCollaborationAddress(targetPath)}' uses Agent '${segment}' as an intermediate segment.`,
        );
      }
      team = this.toTeamCursor(member, memberAddress);
    }
    throw new CollaborationContractError(
      "COLLABORATION_TARGET_NOT_FOUND",
      `Collaboration target '${recipientName}' was not found.`,
    );
  }

  private buildTeamPlacement(
    team: TeamCursor,
  ): ResolvedTeamLogicalPlacement {
    const coordinatorRouteKey = team.coordinatorMemberRouteKey?.trim() ?? "";
    const matches = team.members.filter(
      (member): member is TeamMemberRunConfig =>
        member.memberKind === "agent" && member.memberRouteKey === coordinatorRouteKey,
    );
    if (matches.length !== 1) {
      throw new CollaborationContractError(
        "COLLABORATION_TEAM_INGRESS_INVALID",
        `Team '${team.address}' has no exact direct Agent coordinator ingress.`,
      );
    }
    const ingress = matches[0]!;
    return createResolvedAgentTeamPlacement({
      address: team.address,
      ingressAddress: formatAbsoluteCollaborationAddress([
        ...getCollaborationAddressSegments(team.address),
        ingress.memberName,
      ]),
    });
  }

  private toTeamCursor(
    member: TeamSubTeamMemberRunConfig,
    address: CanonicalCollaborationAddress,
  ): TeamCursor {
    return {
      address,
      coordinatorMemberRouteKey: member.coordinatorMemberRouteKey,
      members: member.memberConfigs,
    };
  }
}
