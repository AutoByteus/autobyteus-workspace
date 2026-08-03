import {
  formatAbsoluteCollaborationAddress,
  resolveRuntimeCollaborationAddress,
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
  type ResolvedPlacementOwnerCoordinate,
  type ResolvedTeamLogicalPlacement,
} from "./resolved-team-logical-placement.js";

type TeamCursor = {
  path: readonly string[];
  coordinatorMemberRouteKey: string | null;
  members: readonly TeamRunMemberConfig[];
};

export class TeamLogicalPlacementResolver {
  resolve(
    rootConfig: TeamRunConfig,
    recipientName: string,
    callerAddressing: MemberLogicalAddressContext,
  ): ResolvedTeamLogicalPlacement {
    const targetPath = resolveRuntimeCollaborationAddress(
      recipientName,
      callerAddressing.immediateTeamPath,
    );
    if (targetPath.length === 0) {
      return this.buildTeamPlacement({
        path: [],
        coordinatorMemberRouteKey: rootConfig.coordinatorMemberRouteKey,
        members: rootConfig.memberTree,
      }, null);
    }

    let team: TeamCursor = {
      path: [],
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
      const owner = this.buildOwner(team.path, segment);
      const isFinal = index === targetPath.length - 1;
      if (isFinal) {
        return member.memberKind === "agent"
          ? this.buildAgentPlacement(member, owner)
          : this.buildTeamPlacement(this.toTeamCursor(member), owner);
      }
      if (member.memberKind !== "agent_team") {
        throw new CollaborationContractError(
          "COLLABORATION_TRAVERSAL_INVALID",
          `Collaboration address '${formatAbsoluteCollaborationAddress(targetPath)}' uses Agent '${segment}' as an intermediate segment.`,
        );
      }
      team = this.toTeamCursor(member);
    }
    throw new CollaborationContractError(
      "COLLABORATION_TARGET_NOT_FOUND",
      `Collaboration target '${recipientName}' was not found.`,
    );
  }

  private buildAgentPlacement(
    member: TeamMemberRunConfig,
    owner: ResolvedPlacementOwnerCoordinate,
  ): ResolvedTeamLogicalPlacement {
    return createResolvedAgentPlacement({
      subject: {
        absoluteAddress: formatAbsoluteCollaborationAddress(member.memberPath),
        memberRouteKey: member.memberRouteKey,
      },
      owner,
    });
  }

  private buildTeamPlacement(
    team: TeamCursor,
    owner: ResolvedPlacementOwnerCoordinate | null,
  ): ResolvedTeamLogicalPlacement {
    const coordinatorRouteKey = team.coordinatorMemberRouteKey?.trim() ?? "";
    const matches = team.members.filter(
      (member): member is TeamMemberRunConfig =>
        member.memberKind === "agent" && member.memberRouteKey === coordinatorRouteKey,
    );
    if (matches.length !== 1) {
      throw new CollaborationContractError(
        "COLLABORATION_TEAM_INGRESS_INVALID",
        `Team '${formatAbsoluteCollaborationAddress(team.path)}' has no exact direct Agent coordinator ingress.`,
      );
    }
    const ingress = matches[0]!;
    return createResolvedAgentTeamPlacement({
      subject: { absoluteAddress: formatAbsoluteCollaborationAddress(team.path) },
      owner,
      ingress: {
        absoluteAddress: formatAbsoluteCollaborationAddress(ingress.memberPath),
        memberRouteKey: ingress.memberRouteKey,
      },
    });
  }

  private buildOwner(
    teamPath: readonly string[],
    memberName: string,
  ): ResolvedPlacementOwnerCoordinate {
    return {
      teamPath: [...teamPath],
      localMemberPath: [memberName],
      localMemberRouteKey: memberName,
    };
  }

  private toTeamCursor(member: TeamSubTeamMemberRunConfig): TeamCursor {
    return {
      path: [...member.memberPath],
      coordinatorMemberRouteKey: member.coordinatorMemberRouteKey,
      members: member.memberConfigs,
    };
  }
}
