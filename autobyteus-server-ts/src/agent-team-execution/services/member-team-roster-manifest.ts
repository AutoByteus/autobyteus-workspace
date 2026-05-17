import type {
  MemberTeamContext,
  MemberTeamRecipientDescriptor,
} from "../domain/member-team-context.js";

export type TeamMembershipRosterMember = {
  memberName: string;
  displayName: string | null;
  isSelf: boolean;
  canMessage: boolean;
  recipientName: string | null;
  representsTeamName: string | null;
  badges: string[];
};

export type TeamMembershipRosterTeam = {
  teamName: string;
  teamRouteKey: string | null;
  currentMemberRole: string;
  members: TeamMembershipRosterMember[];
};

export type TeamMembershipRosterManifest = {
  currentMemberName: string;
  teams: TeamMembershipRosterTeam[];
  allowedRecipientNames: string[];
};

const compact = <T>(values: Array<T | null | undefined>): T[] =>
  values.filter((value): value is T => value !== null && value !== undefined);

const nonEmpty = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
};

const formatMemberRow = (member: TeamMembershipRosterMember): string => {
  const labels = [...member.badges];
  if (member.representsTeamName && !labels.some((label) => label.includes(member.representsTeamName!))) {
    labels.push(`${member.representsTeamName} representative`);
  }
  const suffix = labels.length > 0 ? ` (${labels.join(", ")})` : "";
  return `   - ${member.memberName}${suffix}`;
};

const buildSelfRow = (input: {
  context: MemberTeamContext;
  badges: string[];
  representsTeamName?: string | null;
}): TeamMembershipRosterMember => ({
  memberName: input.context.memberName,
  displayName: null,
  isSelf: true,
  canMessage: false,
  recipientName: null,
  representsTeamName: nonEmpty(input.representsTeamName),
  badges: ["you", ...input.badges],
});

const buildRecipientRow = (
  recipient: MemberTeamRecipientDescriptor,
): TeamMembershipRosterMember => ({
  memberName: recipient.participant.memberName,
  displayName: null,
  isSelf: false,
  canMessage: true,
  recipientName: recipient.recipientName,
  representsTeamName: nonEmpty(recipient.participant.representedSubTeam?.memberName ?? null),
  badges: recipient.participant.representedSubTeam
    ? [`${recipient.participant.representedSubTeam.memberName} representative`]
    : [],
});

const currentMemberIsCoordinator = (context: MemberTeamContext): boolean =>
  Boolean(context.coordinatorMemberRouteKey) &&
  context.coordinatorMemberRouteKey === context.memberRouteKey;

const buildLocalTeam = (
  context: MemberTeamContext,
  recipients: MemberTeamRecipientDescriptor[],
): TeamMembershipRosterTeam | null => {
  const localRecipients = recipients.filter((recipient) =>
    recipient.scope === "local_agent" || recipient.scope === "subteam_representative",
  );
  if (localRecipients.length === 0) {
    return null;
  }
  const isCoordinator = currentMemberIsCoordinator(context);
  const currentMemberRole = isCoordinator ? "coordinator" : "member";
  return {
    teamName: context.teamName,
    teamRouteKey: null,
    currentMemberRole,
    members: [
      buildSelfRow({
        context,
        badges: isCoordinator ? ["coordinator"] : [],
      }),
      ...localRecipients.map((recipient) => buildRecipientRow(recipient)),
    ],
  };
};

const buildParentBoundaryTeam = (
  context: MemberTeamContext,
  recipients: MemberTeamRecipientDescriptor[],
): TeamMembershipRosterTeam | null => {
  const parentRecipients = recipients.filter((recipient) => recipient.scope === "parent_boundary_agent");
  const representedTeamName = nonEmpty(context.parentBoundary?.representedSubTeam.memberName ?? null);
  if (!context.parentBoundary || parentRecipients.length === 0 || !representedTeamName) {
    return null;
  }
  return {
    teamName: nonEmpty(context.parentBoundary.parentTeamName) ?? "Parent team",
    teamRouteKey: null,
    currentMemberRole: `${representedTeamName} representative`,
    members: [
      ...parentRecipients.map((recipient) => buildRecipientRow(recipient)),
      buildSelfRow({
        context,
        representsTeamName: representedTeamName,
        badges: [`representing ${representedTeamName}`],
      }),
    ],
  };
};

export const buildTeamMembershipRosterManifest = (
  context: MemberTeamContext,
): TeamMembershipRosterManifest => {
  const recipients = context.communicationRecipients;
  return {
    currentMemberName: context.memberName,
    allowedRecipientNames: [...context.allowedRecipientNames],
    teams: compact([
      buildLocalTeam(context, recipients),
      buildParentBoundaryTeam(context, recipients),
    ]),
  };
};

export const renderTeamMembershipRosterManifest = (
  manifest: TeamMembershipRosterManifest,
): string | null => {
  if (manifest.teams.length === 0 || manifest.allowedRecipientNames.length === 0) {
    return null;
  }

  const lines: string[] = [
    "Team membership roster",
    "",
    `You are: ${manifest.currentMemberName}`,
    "",
    "You are a member of these teams:",
  ];

  manifest.teams.forEach((team, index) => {
    if (index > 0) {
      lines.push("");
    }
    lines.push(`${index + 1}. ${team.teamName}`);
    lines.push(`   Your role: ${team.currentMemberRole}`);
    lines.push("   Team members:");
    lines.push(...team.members.map((member) => formatMemberRow(member)));
    const messageableRows = team.members.filter((member) => member.canMessage && member.recipientName);
    if (messageableRows.length > 0) {
      lines.push("");
      lines.push("   You can message:");
      lines.push(...messageableRows.map((member) => `   - ${member.recipientName}`));
    }
  });

  lines.push("");
  lines.push("When using send_message_to, recipient_name must exactly match one of:");
  lines.push(...manifest.allowedRecipientNames.map((recipientName) => `- ${recipientName}`));

  return lines.join("\n");
};
