import {
  EMPTY_TEAM_COMMUNICATION_PROJECTION,
  type TeamCommunicationMessage,
  type TeamCommunicationProjection,
  type TeamCommunicationReferenceFile,
  type TeamCommunicationReferenceFileType,
} from "./team-communication-types.js";
import {
  normalizeConversationTargetAddress,
  type ConversationTargetAddress,
  type ConversationTargetSegment,
} from "../../agent-team-execution/domain/conversation-target-address.js";
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

const normalizeTimestamp = (value: unknown, fallback: string): string =>
  normalizeRequiredString(value) ?? fallback;

const normalizeMemberPath = (value: unknown): string[] | null => {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    return null;
  }
  const path = value.map((entry) => entry.trim()).filter(Boolean);
  return path.length > 0 ? path : null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
);

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

const readAddressRecord = (
  rawEntry: Record<string, unknown>,
  camelKey: "senderAddress" | "receiverAddress",
  snakeKey: "sender_address" | "receiver_address",
): Record<string, unknown> | null =>
  asRecord(rawEntry[camelKey]) ?? asRecord(rawEntry[snakeKey]);

const parseSegment = (value: unknown): ConversationTargetSegment | null => {
  const record = asRecord(value);
  if (!record) return null;
  const kind = normalizeRequiredString(record.kind);
  if (kind === "member") {
    const memberRouteKey =
      normalizeRequiredString(record.memberRouteKey)
      ?? normalizeRequiredString(record.member_route_key);
    const memberPath = normalizeMemberPath(record.memberPath) ?? normalizeMemberPath(record.member_path);
    return {
      kind: "member",
      ...(memberRouteKey ? { memberRouteKey } : {}),
      ...(memberPath ? { memberPath } : {}),
    };
  }
  if (kind === "task_team") {
    const taskTeamRunId =
      normalizeRequiredString(record.taskTeamRunId)
      ?? normalizeRequiredString(record.task_team_run_id);
    return taskTeamRunId ? { kind: "task_team", taskTeamRunId } : null;
  }
  if (kind === "task_agent") {
    const taskAgentRunId =
      normalizeRequiredString(record.taskAgentRunId)
      ?? normalizeRequiredString(record.task_agent_run_id);
    return taskAgentRunId ? { kind: "task_agent", taskAgentRunId } : null;
  }
  return null;
};

const normalizeProjectionAddress = (address: ConversationTargetAddress): ConversationTargetAddress => ({
  segments: normalizeConversationTargetAddress(address).segments,
});

const normalizeAddress = (value: Record<string, unknown> | null): ConversationTargetAddress | null => {
  const rawSegments = value?.segments;
  if (!Array.isArray(rawSegments) || rawSegments.length === 0) return null;
  const segments = rawSegments.map(parseSegment);
  if (segments.some((segment) => !segment)) return null;
  try {
    return normalizeProjectionAddress({ segments: segments as ConversationTargetSegment[] });
  } catch {
    return null;
  }
};

const normalizeMessageAddress = (
  rawEntry: Record<string, unknown>,
  prefix: "sender" | "receiver",
): ConversationTargetAddress | null => normalizeAddress(readAddressRecord(
  rawEntry,
  prefix === "sender" ? "senderAddress" : "receiverAddress",
  prefix === "sender" ? "sender_address" : "receiver_address",
));

export const normalizeTeamCommunicationMessage = (
  rawEntry: Record<string, unknown>,
  options: {
    teamRunId?: string | null;
    timestampFallback?: string;
  } = {},
): TeamCommunicationMessage | null => {
  const timestampFallback = options.timestampFallback ?? new Date().toISOString();
  const teamRunId =
    normalizeRequiredString(rawEntry.teamRunId)
    ?? normalizeRequiredString(rawEntry.team_run_id)
    ?? normalizeRequiredString(options.teamRunId);
  const senderAddress = normalizeMessageAddress(rawEntry, "sender");
  const receiverAddress = normalizeMessageAddress(rawEntry, "receiver");
  const content = typeof rawEntry.content === "string" ? rawEntry.content : null;
  const messageType =
    normalizeRequiredString(rawEntry.messageType)
    ?? normalizeRequiredString(rawEntry.message_type)
    ?? "agent_message";

  if (!teamRunId || !senderAddress || !receiverAddress || content === null) {
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
      senderAddress,
      receiverAddress,
      messageType,
      content,
      createdAt,
    });

  return {
    messageId,
    senderAddress,
    receiverAddress,
    content,
    messageType,
    createdAt,
    referenceFiles: normalizeReferenceFiles(rawEntry, {
      teamRunId,
      messageId,
      timestamp: createdAt,
    }),
  };
};

export const normalizeTeamCommunicationProjection = (
  projection: { teamRunId?: unknown; messages?: unknown } | null | undefined,
  options: {
    teamRunId?: string | null;
  } = {},
): TeamCommunicationProjection => {
  const teamRunId =
    normalizeRequiredString(projection?.teamRunId)
    ?? normalizeRequiredString(options.teamRunId)
    ?? EMPTY_TEAM_COMMUNICATION_PROJECTION.teamRunId;
  const messagesById = new Map<string, TeamCommunicationMessage>();
  const rawMessages = Array.isArray(projection?.messages)
    ? (projection.messages as Record<string, unknown>[])
    : [];

  for (const rawMessage of rawMessages) {
    if (!rawMessage || typeof rawMessage !== "object" || Array.isArray(rawMessage)) {
      continue;
    }

    const message = normalizeTeamCommunicationMessage(rawMessage, { teamRunId });
    if (!message) {
      continue;
    }

    const existing = messagesById.get(message.messageId);
    if (!existing || message.createdAt.localeCompare(existing.createdAt) >= 0) {
      messagesById.set(message.messageId, message);
    }
  }

  return {
    teamRunId,
    messages: Array.from(messagesById.values()),
  };
};

export const cloneTeamCommunicationProjection = (
  projection: TeamCommunicationProjection,
): TeamCommunicationProjection => ({
  teamRunId: projection.teamRunId,
  messages: projection.messages.map((message) => ({
    ...message,
    senderAddress: {
      segments: message.senderAddress.segments.map((segment) => (
        segment.kind === "member"
          ? {
              kind: "member" as const,
              ...(segment.memberRouteKey ? { memberRouteKey: segment.memberRouteKey } : {}),
              ...(segment.memberPath ? { memberPath: [...segment.memberPath] } : {}),
            }
          : segment.kind === "task_team"
            ? { kind: "task_team" as const, taskTeamRunId: segment.taskTeamRunId }
            : { kind: "task_agent" as const, taskAgentRunId: segment.taskAgentRunId }
      )),
    },
    receiverAddress: {
      segments: message.receiverAddress.segments.map((segment) => (
        segment.kind === "member"
          ? {
              kind: "member" as const,
              ...(segment.memberRouteKey ? { memberRouteKey: segment.memberRouteKey } : {}),
              ...(segment.memberPath ? { memberPath: [...segment.memberPath] } : {}),
            }
          : segment.kind === "task_team"
            ? { kind: "task_team" as const, taskTeamRunId: segment.taskTeamRunId }
            : { kind: "task_agent" as const, taskAgentRunId: segment.taskAgentRunId }
      )),
    },
    referenceFiles: message.referenceFiles.map((reference) => ({ ...reference })),
  })),
});
