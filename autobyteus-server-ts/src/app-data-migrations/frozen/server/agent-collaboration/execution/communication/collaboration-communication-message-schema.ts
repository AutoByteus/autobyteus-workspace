import path from "node:path";
import type { CollaborationCommunicationMessage } from "./collaboration-communication-message.js";

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
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

/**
 * Reads one message tolerantly (Data Migration Guideline §3): the seven message fields are required and
 * validated; any other field is ignored and never reaches the result.
 */
export const validateCollaborationCommunicationMessage = (
  value: unknown,
  label = "message",
): CollaborationCommunicationMessage => {
  const message = record(value, label);
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
