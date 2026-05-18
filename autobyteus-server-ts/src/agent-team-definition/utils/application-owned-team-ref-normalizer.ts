import { TeamMember } from "../domain/models.js";

export type ApplicationOwnedTeamConfigMember = {
  memberName: string;
  ref: string;
  refType: "agent" | "agent_team";
  refScope: "shared" | "team_local" | "application_owned";
};

export const canonicalizeApplicationOwnedTeamMembers = (
  nodes: ApplicationOwnedTeamConfigMember[],
  options: {
    canonicalizeTeamRef: (localTeamId: string) => string;
  },
): TeamMember[] =>
  nodes.map((node) => {
    const isApplicationOwnedTeamRef = node.refType === "agent_team" && node.refScope === "application_owned";
    return new TeamMember({
      memberName: node.memberName,
      refType: node.refType,
      ref: isApplicationOwnedTeamRef ? options.canonicalizeTeamRef(node.ref) : node.ref,
      refScope: node.refScope,
    });
  });

export const localizeApplicationOwnedTeamMembers = (
  nodes: TeamMember[],
  options: {
    localizeTeamRef: (canonicalTeamId: string) => string;
  },
): ApplicationOwnedTeamConfigMember[] =>
  nodes.map((node) => {
    if (!node.refScope) {
      throw new Error(
        `Application-owned team member '${node.memberName}' must include explicit refScope.`,
      );
    }
    const refScope = node.refScope;
    return {
      memberName: node.memberName,
      refType: node.refType,
      ref: node.refType === "agent_team" && refScope === "application_owned"
        ? options.localizeTeamRef(node.ref)
        : node.ref,
      refScope,
    };
  });
