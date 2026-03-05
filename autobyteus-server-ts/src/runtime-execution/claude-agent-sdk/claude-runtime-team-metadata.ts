import {
  asArray,
  asObject,
  asString,
  toLowerTrimmed,
  type TeamManifestMetadataMember,
} from "./claude-runtime-shared.js";

export const resolveTeamRunIdFromMetadata = (
  metadata: Record<string, unknown> | null | undefined,
): string | null => asString(metadata?.teamRunId ?? metadata?.team_run_id);

export const resolveMemberNameFromMetadata = (
  metadata: Record<string, unknown> | null | undefined,
): string | null => asString(metadata?.memberName ?? metadata?.member_name);

export const resolveSendMessageToEnabledFromMetadata = (
  metadata: Record<string, unknown> | null | undefined,
): boolean => {
  const raw = metadata?.sendMessageToEnabled ?? metadata?.send_message_to_enabled;
  if (typeof raw === "boolean") {
    return raw;
  }
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }
  return false;
};

export const resolveTeamManifestMembersFromMetadata = (
  metadata: Record<string, unknown> | null | undefined,
): TeamManifestMetadataMember[] => {
  const source = metadata?.teamMemberManifest ?? metadata?.team_member_manifest;
  const rows = asArray(source);
  const members: TeamManifestMetadataMember[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const payload = asObject(row);
    if (!payload) {
      continue;
    }
    const memberName =
      asString(payload.memberName ?? payload.member_name ?? payload.name)?.trim() ?? null;
    if (!memberName) {
      continue;
    }
    const normalizedName = toLowerTrimmed(memberName);
    if (seen.has(normalizedName)) {
      continue;
    }
    seen.add(normalizedName);
    members.push({
      memberName,
      role: asString(payload.role)?.trim() ?? null,
      description: asString(payload.description ?? payload.summary)?.trim() ?? null,
    });
  }
  return members;
};

export const resolveAllowedRecipientNamesFromManifest = (options: {
  currentMemberName: string | null;
  members: TeamManifestMetadataMember[];
}): string[] => {
  const self = options.currentMemberName ? toLowerTrimmed(options.currentMemberName) : null;
  return options.members
    .map((member) => member.memberName)
    .filter((memberName) => memberName.trim().length > 0)
    .filter((memberName) => (self ? toLowerTrimmed(memberName) !== self : true));
};

const formatTeammateDescriptor = (member: TeamManifestMetadataMember): string => {
  const details = [member.role, member.description].filter((value) => Boolean(value));
  if (details.length === 0) {
    return `- ${member.memberName}`;
  }
  return `- ${member.memberName}: ${details.join(" | ")}`;
};

export const renderTeamManifestSystemPromptAppend = (options: {
  currentMemberName: string | null;
  members: TeamManifestMetadataMember[];
  sendMessageToEnabled: boolean;
}): string | null => {
  const recipients = resolveAllowedRecipientNamesFromManifest({
    currentMemberName: options.currentMemberName,
    members: options.members,
  });
  if (recipients.length === 0) {
    return null;
  }

  const teammates = options.members.filter(
    (member) => toLowerTrimmed(member.memberName) !== toLowerTrimmed(options.currentMemberName ?? ""),
  );
  const sendMessageGuidance = options.sendMessageToEnabled
    ? [
        "Use `send_message_to` with `recipient_name` exactly matching one teammate name.",
        "Use `send_message_to` when delegating to teammates; plain assistant text does not deliver a teammate message.",
        "Do not claim teammate delivery unless the tool call succeeds.",
        "If asked about team tools or delegation capabilities, explicitly mention `send_message_to` and list teammate names from this prompt.",
        "Never claim you have no teammates when teammate names are provided below.",
      ].join(" ")
    : "Do not attempt `send_message_to`; this run does not expose that tool.";

  return [
    "You are a member of an agent team.",
    sendMessageGuidance,
    "Teammates:",
    ...teammates.map((member) => formatTeammateDescriptor(member)),
  ].join("\n");
};
