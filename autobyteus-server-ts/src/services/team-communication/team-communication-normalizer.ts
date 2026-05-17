import {
  EMPTY_TEAM_COMMUNICATION_PROJECTION,
  type TeamCommunicationMessage,
  type TeamCommunicationProjection,
  type TeamCommunicationRepresentedSubTeam,
  type TeamCommunicationReferenceFile,
  type TeamCommunicationReferenceFileType,
} from "./team-communication-types.js";
import type { TeamMemberAddress } from "../../agent-team-execution/domain/inter-agent-message-delivery.js";
import {
  buildTeamCommunicationMessageId,
  buildTeamCommunicationReferenceId,
  normalizeTeamCommunicationReferencePath,
} from "./team-communication-identity.js";
import { normalizeExplicitTeamCommunicationReferenceFiles } from "./team-communication-reference-files.js";

const REFERENCE_FILE_TYPES: TeamCommunicationReferenceFileType[] = [
  "file",
  "image",
  "audio",
  "video",
  "pdf",
  "csv",
  "excel",
  "other",
];

const normalizeRequiredString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeOptionalString = (value: unknown): string | null =>
  normalizeRequiredString(value);

const normalizeTimestamp = (value: unknown, fallback: string): string =>
  normalizeRequiredString(value) ?? fallback;

const normalizeMemberKind = (value: unknown): "agent" | "agent_team" | null =>
  value === "agent" || value === "agent_team" ? value : null;

const normalizeMemberPath = (value: unknown): string[] | null => {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    return null;
  }
  const path = value.map((entry) => entry.trim()).filter(Boolean);
  return path.length > 0 ? path : null;
};

const normalizeTeamMemberAddress = (value: unknown): TeamMemberAddress | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const teamRunId = normalizeRequiredString(record.teamRunId ?? record.team_run_id);
  const memberPath = normalizeMemberPath(record.memberPath ?? record.member_path);
  const memberRouteKey = normalizeRequiredString(record.memberRouteKey ?? record.member_route_key);
  if (!teamRunId || !memberPath || !memberRouteKey) {
    return null;
  }
  return { teamRunId, memberPath, memberRouteKey };
};

const normalizeRepresentedSubTeam = (value: unknown): TeamCommunicationRepresentedSubTeam | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const memberName = normalizeRequiredString(record.memberName ?? record.member_name);
  const memberPath = normalizeMemberPath(record.memberPath ?? record.member_path);
  const memberRouteKey = normalizeRequiredString(record.memberRouteKey ?? record.member_route_key);
  const memberRunId = normalizeRequiredString(record.memberRunId ?? record.member_run_id);
  const teamDefinitionId = normalizeRequiredString(record.teamDefinitionId ?? record.team_definition_id);
  const childTeamRunId = normalizeOptionalString(record.childTeamRunId ?? record.child_team_run_id);
  const address = normalizeTeamMemberAddress(record.address);
  if (!memberName || !memberPath || !memberRouteKey || !memberRunId || !teamDefinitionId || !address) {
    return null;
  }
  return {
    memberKind: "agent_team",
    memberName,
    memberPath,
    memberRouteKey,
    memberRunId,
    teamDefinitionId,
    childTeamRunId,
    address,
  };
};

export const inferTeamCommunicationReferenceFileType = (
  filePath: string,
): TeamCommunicationReferenceFileType => {
  const lower = filePath.toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(lower)) {
    return "image";
  }
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/.test(lower)) {
    return "audio";
  }
  if (/\.(mp4|mov|avi|mkv|webm)$/.test(lower)) {
    return "video";
  }
  if (lower.endsWith(".pdf")) {
    return "pdf";
  }
  if (lower.endsWith(".csv")) {
    return "csv";
  }
  if (/\.(xlsx|xls)$/.test(lower)) {
    return "excel";
  }
  return "file";
};

const normalizeReferenceFileType = (value: unknown): TeamCommunicationReferenceFileType | null =>
  REFERENCE_FILE_TYPES.includes(value as TeamCommunicationReferenceFileType)
    ? (value as TeamCommunicationReferenceFileType)
    : null;

const normalizeStoredReferenceFile = (
  rawReference: Record<string, unknown>,
  input: {
    teamRunId: string;
    messageId: string;
    timestampFallback: string;
  },
): TeamCommunicationReferenceFile | null => {
  const rawPath = normalizeRequiredString(rawReference.path);
  if (!rawPath) {
    return null;
  }

  const path = normalizeTeamCommunicationReferencePath(rawPath);
  const createdAt = normalizeTimestamp(rawReference.createdAt, input.timestampFallback);
  return {
    referenceId:
      normalizeRequiredString(rawReference.referenceId)
      ?? buildTeamCommunicationReferenceId({
        teamRunId: input.teamRunId,
        messageId: input.messageId,
        path,
      }),
    path,
    type: normalizeReferenceFileType(rawReference.type) ?? inferTeamCommunicationReferenceFileType(path),
    createdAt,
    updatedAt: normalizeTimestamp(rawReference.updatedAt, createdAt),
  };
};

const buildReferenceFilesFromPaths = (input: {
  teamRunId: string;
  messageId: string;
  paths: string[];
  timestamp: string;
}): TeamCommunicationReferenceFile[] =>
  input.paths.map((filePath) => ({
    referenceId: buildTeamCommunicationReferenceId({
      teamRunId: input.teamRunId,
      messageId: input.messageId,
      path: filePath,
    }),
    path: filePath,
    type: inferTeamCommunicationReferenceFileType(filePath),
    createdAt: input.timestamp,
    updatedAt: input.timestamp,
  }));

const normalizeReferenceFiles = (
  rawEntry: Record<string, unknown>,
  input: {
    teamRunId: string;
    messageId: string;
    timestamp: string;
  },
): TeamCommunicationReferenceFile[] => {
  const storedReferences = Array.isArray(rawEntry.referenceFileEntries)
    ? rawEntry.referenceFileEntries
    : Array.isArray(rawEntry.reference_file_entries)
      ? rawEntry.reference_file_entries
      : Array.isArray(rawEntry.referenceFiles)
        ? rawEntry.referenceFiles
        : Array.isArray(rawEntry.reference_files)
          ? rawEntry.reference_files
          : null;

  if (storedReferences && storedReferences.every((entry) => !!entry && typeof entry === "object" && !Array.isArray(entry))) {
    const byPath = new Map<string, TeamCommunicationReferenceFile>();
    for (const rawReference of storedReferences as Record<string, unknown>[]) {
      const reference = normalizeStoredReferenceFile(rawReference, {
        teamRunId: input.teamRunId,
        messageId: input.messageId,
        timestampFallback: input.timestamp,
      });
      if (!reference) {
        continue;
      }
      const existing = byPath.get(reference.path);
      if (!existing || reference.updatedAt.localeCompare(existing.updatedAt) >= 0) {
        byPath.set(reference.path, reference);
      }
    }
    return Array.from(byPath.values());
  }

  const referenceFilesResult = normalizeExplicitTeamCommunicationReferenceFiles(storedReferences ?? []);
  if (!referenceFilesResult.ok) {
    return [];
  }
  return buildReferenceFilesFromPaths({
    teamRunId: input.teamRunId,
    messageId: input.messageId,
    paths: referenceFilesResult.referenceFiles,
    timestamp: input.timestamp,
  });
};

export const normalizeTeamCommunicationMessage = (
  rawEntry: Record<string, unknown>,
  options: {
    teamRunId?: string | null;
    receiverRunId?: string | null;
    timestampFallback?: string;
  } = {},
): TeamCommunicationMessage | null => {
  const timestampFallback = options.timestampFallback ?? new Date().toISOString();
  const teamRunId =
    normalizeRequiredString(rawEntry.teamRunId)
    ?? normalizeRequiredString(rawEntry.team_run_id)
    ?? normalizeRequiredString(options.teamRunId);
  const senderRunId =
    normalizeRequiredString(rawEntry.senderRunId)
    ?? normalizeRequiredString(rawEntry.sender_agent_id)
    ?? normalizeRequiredString(rawEntry.sender_run_id);
  const receiverRunId =
    normalizeRequiredString(rawEntry.receiverRunId)
    ?? normalizeRequiredString(rawEntry.receiver_run_id)
    ?? normalizeRequiredString(options.receiverRunId);
  const content = typeof rawEntry.content === "string" ? rawEntry.content : null;
  const messageType =
    normalizeRequiredString(rawEntry.messageType)
    ?? normalizeRequiredString(rawEntry.message_type)
    ?? "agent_message";

  if (!teamRunId || !senderRunId || !receiverRunId || content === null) {
    return null;
  }

  const createdAt = normalizeTimestamp(
    rawEntry.createdAt ?? rawEntry.created_at,
    timestampFallback,
  );
  const messageId =
    normalizeRequiredString(rawEntry.messageId)
    ?? normalizeRequiredString(rawEntry.message_id)
    ?? buildTeamCommunicationMessageId({
      teamRunId,
      senderRunId,
      receiverRunId,
      messageType,
      content,
      createdAt,
    });
  const updatedAt = normalizeTimestamp(rawEntry.updatedAt ?? rawEntry.updated_at, createdAt);

  return {
    messageId,
    teamRunId,
    senderRunId,
    senderMemberKind:
      normalizeMemberKind(rawEntry.senderMemberKind)
      ?? normalizeMemberKind(rawEntry.sender_member_kind),
    senderMemberName:
      normalizeOptionalString(rawEntry.senderMemberName)
      ?? normalizeOptionalString(rawEntry.sender_agent_name),
    senderMemberPath:
      normalizeMemberPath(rawEntry.senderMemberPath)
      ?? normalizeMemberPath(rawEntry.sender_member_path),
    senderMemberRouteKey:
      normalizeOptionalString(rawEntry.senderMemberRouteKey)
      ?? normalizeOptionalString(rawEntry.sender_member_route_key),
    senderRepresentedSubTeam:
      normalizeRepresentedSubTeam(rawEntry.senderRepresentedSubTeam)
      ?? normalizeRepresentedSubTeam(rawEntry.sender_represented_subteam),
    receiverRunId,
    receiverMemberKind:
      normalizeMemberKind(rawEntry.receiverMemberKind)
      ?? normalizeMemberKind(rawEntry.receiver_member_kind),
    receiverMemberName:
      normalizeOptionalString(rawEntry.receiverMemberName)
      ?? normalizeOptionalString(rawEntry.receiver_agent_name)
      ?? normalizeOptionalString(rawEntry.recipient_role_name),
    receiverMemberPath:
      normalizeMemberPath(rawEntry.receiverMemberPath)
      ?? normalizeMemberPath(rawEntry.receiver_member_path),
    receiverMemberRouteKey:
      normalizeOptionalString(rawEntry.receiverMemberRouteKey)
      ?? normalizeOptionalString(rawEntry.receiver_member_route_key),
    receiverRepresentedSubTeam:
      normalizeRepresentedSubTeam(rawEntry.receiverRepresentedSubTeam)
      ?? normalizeRepresentedSubTeam(rawEntry.receiver_represented_subteam),
    content,
    messageType,
    createdAt,
    updatedAt,
    referenceFiles: normalizeReferenceFiles(rawEntry, {
      teamRunId,
      messageId,
      timestamp: createdAt,
    }),
  };
};

export const normalizeTeamCommunicationProjection = (
  projection: { messages?: unknown } | null | undefined,
  options: {
    teamRunId?: string | null;
  } = {},
): TeamCommunicationProjection => {
  const messagesById = new Map<string, TeamCommunicationMessage>();
  const rawMessages = Array.isArray(projection?.messages)
    ? (projection.messages as Record<string, unknown>[])
    : [];

  for (const rawMessage of rawMessages) {
    if (!rawMessage || typeof rawMessage !== "object" || Array.isArray(rawMessage)) {
      continue;
    }

    const message = normalizeTeamCommunicationMessage(rawMessage, options);
    if (!message) {
      continue;
    }

    const existing = messagesById.get(message.messageId);
    if (!existing || message.updatedAt.localeCompare(existing.updatedAt) >= 0) {
      messagesById.set(message.messageId, message);
    }
  }

  return {
    ...EMPTY_TEAM_COMMUNICATION_PROJECTION,
    messages: Array.from(messagesById.values()),
  };
};

export const cloneTeamCommunicationProjection = (
  projection: TeamCommunicationProjection,
): TeamCommunicationProjection => ({
  version: 1,
  messages: projection.messages.map((message) => ({
    ...message,
    senderRepresentedSubTeam: message.senderRepresentedSubTeam ? {
      ...message.senderRepresentedSubTeam,
      memberPath: [...message.senderRepresentedSubTeam.memberPath],
      address: {
        ...message.senderRepresentedSubTeam.address,
        memberPath: [...message.senderRepresentedSubTeam.address.memberPath],
      },
    } : null,
    receiverRepresentedSubTeam: message.receiverRepresentedSubTeam ? {
      ...message.receiverRepresentedSubTeam,
      memberPath: [...message.receiverRepresentedSubTeam.memberPath],
      address: {
        ...message.receiverRepresentedSubTeam.address,
        memberPath: [...message.receiverRepresentedSubTeam.address.memberPath],
      },
    } : null,
    referenceFiles: message.referenceFiles.map((reference) => ({ ...reference })),
  })),
});
