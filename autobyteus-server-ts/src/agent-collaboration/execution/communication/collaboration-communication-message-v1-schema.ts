import path from "node:path";
import type { CollaborationCommunicationMessageV1 } from "./collaboration-communication-message-v1.js";

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
};
const exactKeys = (value: Record<string, unknown>, expected: readonly string[], label: string): void => {
  const actual = Object.keys(value).sort();
  const target = [...expected].sort();
  if (actual.length !== target.length || actual.some((key, index) => key !== target[index])) {
    throw new Error(`${label} has unsupported or missing field(s).`);
  }
};
const required = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value || value !== value.trim()) throw new Error(`${label} must be a non-empty trimmed string.`);
  return value;
};
const timestamp = (value: unknown, label: string): string => {
  const normalized = required(value, label);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(normalized) || Number.isNaN(Date.parse(normalized))) {
    throw new Error(`${label} must be an ISO-8601 UTC timestamp.`);
  }
  return normalized;
};
const references = (value: unknown, label: string): readonly string[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return Object.freeze(value.map((entry, index) => {
    const filePath = required(entry, `${label}[${index}]`);
    if (!path.isAbsolute(filePath) || path.normalize(filePath) !== filePath) {
      throw new Error(`${label}[${index}] must be a normalized absolute local path.`);
    }
    return filePath;
  }));
};

export const validateCollaborationCommunicationMessageV1 = (
  value: unknown,
  label = "message",
): CollaborationCommunicationMessageV1 => {
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
    referenceFiles: references(message.referenceFiles, `${label}.referenceFiles`),
    createdAt: timestamp(message.createdAt, `${label}.createdAt`),
  });
};

export const validateCollaborationCommunicationMessageArrayV1 = (
  value: unknown,
  label = "messages",
): readonly CollaborationCommunicationMessageV1[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  const ids = new Set<string>();
  return Object.freeze(value.map((entry, index) => {
    const message = validateCollaborationCommunicationMessageV1(entry, `${label}[${index}]`);
    if (ids.has(message.messageId)) throw new Error(`Duplicate message ID '${message.messageId}'.`);
    ids.add(message.messageId);
    return message;
  }));
};
