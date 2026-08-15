import path from "node:path";
import type {
  TeamCommunicationMessageV1,
  TeamCommunicationMessagesFileV1,
} from "./team-communication-v1-types.js";

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
};

const exactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void => {
  const actual = Object.keys(value).sort();
  const target = [...expected].sort();
  if (actual.length !== target.length || actual.some((key, index) => key !== target[index])) {
    throw new Error(`${label} has unsupported or missing field(s).`);
  }
};

const required = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) {
    throw new Error(`${label} must be a non-empty trimmed string.`);
  }
  return value;
};

const timestamp = (value: unknown, label: string): string => {
  const normalized = required(value, label);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(normalized) ||
      Number.isNaN(Date.parse(normalized))) {
    throw new Error(`${label} must be an ISO-8601 UTC timestamp.`);
  }
  return normalized;
};

const references = (value: unknown, label: string): readonly string[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value.map((entry, index) => {
    const filePath = required(entry, `${label}[${index}]`);
    if (!path.isAbsolute(filePath) || path.normalize(filePath) !== filePath) {
      throw new Error(`${label}[${index}] must be a normalized absolute local path.`);
    }
    return filePath;
  });
};

const validateMessage = (value: unknown, label: string): TeamCommunicationMessageV1 => {
  const message = record(value, label);
  exactKeys(message, [
    "messageId", "senderAgentRunId", "receiverAgentRunId", "content", "messageType",
    "referenceFiles", "createdAt",
  ], label);
  return Object.freeze({
    messageId: required(message.messageId, `${label}.messageId`),
    senderAgentRunId: required(message.senderAgentRunId, `${label}.senderAgentRunId`),
    receiverAgentRunId: required(message.receiverAgentRunId, `${label}.receiverAgentRunId`),
    content: required(message.content, `${label}.content`),
    messageType: required(message.messageType, `${label}.messageType`),
    referenceFiles: Object.freeze([...references(message.referenceFiles, `${label}.referenceFiles`)]),
    createdAt: timestamp(message.createdAt, `${label}.createdAt`),
  });
};

export const validateTeamCommunicationMessagesV1Payload = (
  value: unknown,
  expectedRootTeamRunId?: string,
): TeamCommunicationMessagesFileV1 => {
  const payload = record(value, "Team communication messages");
  exactKeys(payload, ["schemaVersion", "rootTeamRunId", "messages"], "Team communication messages");
  if (payload.schemaVersion !== 1) throw new Error("Team communication schemaVersion must be 1.");
  const rootTeamRunId = required(payload.rootTeamRunId, "rootTeamRunId");
  if (expectedRootTeamRunId && rootTeamRunId !== expectedRootTeamRunId) {
    throw new Error(`Communication root '${rootTeamRunId}' does not match '${expectedRootTeamRunId}'.`);
  }
  if (!Array.isArray(payload.messages)) throw new Error("messages must be an array.");
  const messageIds = new Set<string>();
  const messages = payload.messages.map((entry, index) => {
    const message = validateMessage(entry, `messages[${index}]`);
    if (messageIds.has(message.messageId)) throw new Error(`Duplicate message ID '${message.messageId}'.`);
    messageIds.add(message.messageId);
    return message;
  });
  return Object.freeze({
    schemaVersion: 1,
    rootTeamRunId,
    messages: Object.freeze(messages),
  });
};
