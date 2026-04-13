import { TeamMember } from "../domain/models.js";

export type ApplicationOwnedTeamConfigMember = {
  memberName: string;
  ref: string;
  refType: "agent" | "agent_team";
  refScope?: "application_owned" | null;
};

export const canonicalizeApplicationOwnedTeamMembers = (
  nodes: ApplicationOwnedTeamConfigMember[],
  options: {
    canonicalizeAgentRef: (localAgentId: string) => string;
    canonicalizeTeamRef: (localTeamId: string) => string;
  },
): TeamMember[] =>
  nodes.map(
    (node) =>
      new TeamMember({
        memberName: node.memberName,
        refType: node.refType,
        ref: node.refType === "agent"
          ? options.canonicalizeAgentRef(node.ref)
          : options.canonicalizeTeamRef(node.ref),
        refScope: node.refType === "agent" ? "application_owned" : null,
      }),
  );

export const localizeApplicationOwnedTeamMembers = (
  nodes: TeamMember[],
  options: {
    localizeAgentRef: (canonicalAgentId: string) => string;
    localizeTeamRef: (canonicalTeamId: string) => string;
  },
): ApplicationOwnedTeamConfigMember[] =>
  nodes.map((node) => ({
    memberName: node.memberName,
    refType: node.refType,
    ref: node.refType === "agent"
      ? options.localizeAgentRef(node.ref)
      : options.localizeTeamRef(node.ref),
    refScope: node.refType === "agent" ? "application_owned" : null,
  }));
