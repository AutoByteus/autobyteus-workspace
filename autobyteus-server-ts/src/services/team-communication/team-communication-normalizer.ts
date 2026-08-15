import {
  type TeamCommunicationMessage,
  type TeamCommunicationProjection,
  type TeamCommunicationReferenceFile,
  type TeamCommunicationReferenceFileType,
} from "./team-communication-types.js";
import {
  buildTeamCommunicationMessageId,
  buildTeamCommunicationReferenceId,
  normalizeTeamCommunicationReferencePath,
} from "./team-communication-identity.js";
import { normalizeExplicitTeamCommunicationReferenceFiles } from "./team-communication-reference-files.js";

const REFERENCE_FILE_TYPES = new Set<TeamCommunicationReferenceFileType>([
  "file", "image", "audio", "video", "pdf", "csv", "excel", "other",
]);
const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;
export const inferTeamCommunicationReferenceFileType = (filePath: string): TeamCommunicationReferenceFileType => {
  const lower = filePath.toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(lower)) return "image";
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/.test(lower)) return "audio";
  if (/\.(mp4|mov|avi|mkv|webm)$/.test(lower)) return "video";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".csv")) return "csv";
  if (/\.(xlsx|xls)$/.test(lower)) return "excel";
  return "file";
};

const normalizeReferenceFiles = (raw: unknown, input: {
  teamRunId: string; messageId: string; timestamp: string;
}): TeamCommunicationReferenceFile[] => {
  if (!Array.isArray(raw)) return [];
  if (raw.every((entry) => asRecord(entry))) {
    const output: TeamCommunicationReferenceFile[] = [];
    for (const value of raw) {
      const entry = asRecord(value)!;
      const rawPath = text(entry.path);
      if (!rawPath) continue;
      const path = normalizeTeamCommunicationReferencePath(rawPath);
      const createdAt = text(entry.createdAt) ?? input.timestamp;
      const type = REFERENCE_FILE_TYPES.has(entry.type as TeamCommunicationReferenceFileType)
        ? entry.type as TeamCommunicationReferenceFileType
        : inferTeamCommunicationReferenceFileType(path);
      output.push({
        referenceId: text(entry.referenceId) ?? buildTeamCommunicationReferenceId({
          teamRunId: input.teamRunId, messageId: input.messageId, path,
        }),
        path, type, createdAt, updatedAt: text(entry.updatedAt) ?? createdAt,
      });
    }
    return output;
  }
  const normalized = normalizeExplicitTeamCommunicationReferenceFiles(raw);
  if (!normalized.ok) return [];
  return normalized.referenceFiles.map((path) => ({
    referenceId: buildTeamCommunicationReferenceId({ teamRunId: input.teamRunId, messageId: input.messageId, path }),
    path, type: inferTeamCommunicationReferenceFileType(path), createdAt: input.timestamp, updatedAt: input.timestamp,
  }));
};

export const normalizeTeamCommunicationMessage = (
  raw: Record<string, unknown>,
  options: { teamRunId?: string | null; timestampFallback?: string } = {},
): TeamCommunicationMessage | null => {
  const teamRunId = text(raw.teamRunId) ?? text(options.teamRunId);
  const senderAgentRunId = text(raw.senderAgentRunId);
  const receiverAgentRunId = text(raw.receiverAgentRunId);
  if (!teamRunId || !senderAgentRunId || !receiverAgentRunId || typeof raw.content !== "string") return null;
  const createdAt = text(raw.createdAt) ?? options.timestampFallback ?? new Date().toISOString();
  const messageType = text(raw.messageType) ?? "agent_message";
  const messageId = text(raw.messageId) ?? buildTeamCommunicationMessageId({
    teamRunId, senderAgentRunId, receiverAgentRunId, messageType, content: raw.content, createdAt,
  });
  return {
    messageId, senderAgentRunId, receiverAgentRunId, content: raw.content, messageType, createdAt,
    referenceFiles: normalizeReferenceFiles(raw.referenceFileEntries ?? raw.referenceFiles ?? [], {
      teamRunId, messageId, timestamp: createdAt,
    }),
  };
};

export const normalizeTeamCommunicationProjection = (
  projection: { teamRunId?: unknown; messages?: unknown } | null | undefined,
  options: { teamRunId?: string | null } = {},
): TeamCommunicationProjection => {
  const expectedTeamRunId = text(options.teamRunId);
  const storedTeamRunId = text(projection?.teamRunId);
  if (expectedTeamRunId && storedTeamRunId && expectedTeamRunId !== storedTeamRunId) {
    throw new Error(`Team communication projection '${storedTeamRunId}' does not match '${expectedTeamRunId}'.`);
  }
  const teamRunId = expectedTeamRunId ?? storedTeamRunId;
  if (!teamRunId) throw new Error("Team communication projection requires a TeamRun ID.");
  const byId = new Map<string, TeamCommunicationMessage>();
  for (const value of Array.isArray(projection?.messages) ? projection.messages : []) {
    const record = asRecord(value);
    if (!record) continue;
    const message = normalizeTeamCommunicationMessage(record, { teamRunId });
    if (!message) continue;
    const existing = byId.get(message.messageId);
    if (!existing || message.createdAt >= existing.createdAt) byId.set(message.messageId, message);
  }
  return { teamRunId, messages: [...byId.values()] };
};

export const cloneTeamCommunicationProjection = (
  projection: TeamCommunicationProjection,
): TeamCommunicationProjection => structuredClone(projection);
