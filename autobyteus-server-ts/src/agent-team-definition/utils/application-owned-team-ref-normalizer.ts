import { TeamMember } from "../domain/models.js";

export type ApplicationOwnedTeamConfigMember = {
  memberName: string;
  ref: string;
  refType: "agent" | "agent_team";
  refScope?: "team_local" | null;
};

export const canonicalizeApplicationOwnedTeamMembers = (
  nodes: ApplicationOwnedTeamConfigMember[],
  options: {
    canonicalizeTeamRef: (localTeamId: string) => string;
  },
): TeamMember[] =>
  nodes.map(
    (node) =>
      new TeamMember({
        memberName: node.memberName,
        refType: node.refType,
        ref: node.refType === "agent"
          ? node.ref
          : options.canonicalizeTeamRef(node.ref),
        refScope: node.refType === "agent" ? "team_local" : null,
      }),
  );

export const localizeApplicationOwnedTeamMembers = (
  nodes: TeamMember[],
  options: {
    localizeTeamRef: (canonicalTeamId: string) => string;
  },
): ApplicationOwnedTeamConfigMember[] =>
  nodes.map((node) => ({
    memberName: node.memberName,
    refType: node.refType,
    ref: node.refType === "agent"
      ? node.ref
      : options.localizeTeamRef(node.ref),
    refScope: node.refType === "agent" ? "team_local" : null,
  }));
