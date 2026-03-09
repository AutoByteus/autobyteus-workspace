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
