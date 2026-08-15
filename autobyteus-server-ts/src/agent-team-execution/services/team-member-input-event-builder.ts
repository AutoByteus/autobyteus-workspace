import { createHash } from "node:crypto";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type {
  TeamRunMemberInputContextFile,
  TeamRunMemberInputEventPayload,
  TeamRunMemberInputOrigin,
} from "../domain/team-run-event.js";

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const hash = (parts: readonly unknown[]): string => createHash("sha256")
  .update(parts.map((part) => String(part ?? "")).join("\0"))
  .digest("base64url").slice(0, 32);

export const buildTeamMemberInputMessageId = (input: {
  rootTeamRunId: string;
  recipientAgentRunId: string;
  content: string;
  receivedAt: string;
  parentCommunicationMessageId?: string | null;
}): string => `memberinput_${hash([
  input.rootTeamRunId,
  input.recipientAgentRunId,
  text(input.parentCommunicationMessageId) ?? input.receivedAt,
  input.content,
])}`;

export const buildTeamMemberInputDedupeKey = (input: {
  rootTeamRunId: string;
  recipientAgentRunId: string;
  messageId: string;
}): string => `member_input:${input.rootTeamRunId}:${input.recipientAgentRunId}:${input.messageId}`;

const metadataOf = (message: AgentInputUserMessage): Record<string, unknown> => {
  const metadata = (message as unknown as { metadata?: unknown }).metadata;
  return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata as Record<string, unknown> : {};
};
const contextFile = (value: unknown): TeamRunMemberInputContextFile | null => {
  if (typeof value === "string" && value.trim()) return { path: value.trim(), type: null };
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const path = text(record.uri) ?? text(record.path) ?? text(record.locator) ?? text(record.file_path);
  return path ? { path, type: text(record.file_type) ?? text(record.fileType) ?? text(record.type) } : null;
};
const contextFiles = (message: AgentInputUserMessage): TeamRunMemberInputContextFile[] => {
  const values = (message as unknown as { contextFiles?: unknown }).contextFiles;
  if (!Array.isArray(values)) return [];
  return values.map((value) => value && typeof value === "object" && typeof (value as { toDict?: unknown }).toDict === "function"
    ? (value as { toDict: () => unknown }).toDict() : value)
    .map(contextFile).filter((value): value is TeamRunMemberInputContextFile => Boolean(value));
};
const origin = (metadata: Record<string, unknown>): TeamRunMemberInputOrigin =>
  metadata.input_origin === "inter_agent_delivery" ? "inter_agent_delivery" : "user_message";

export const buildTeamMemberInputEventPayload = (input: {
  rootTeamRunId: string;
  recipientAgentRunId: string;
  message: AgentInputUserMessage;
  receivedAt?: string | null;
}): TeamRunMemberInputEventPayload => {
  const receivedAt = text(input.receivedAt) ?? new Date().toISOString();
  const metadata = metadataOf(input.message);
  const contentValue = (input.message as unknown as { content?: unknown }).content;
  const content = typeof contentValue === "string" ? contentValue : "";
  const parentCommunicationMessageId = text(metadata.parent_communication_message_id);
  const messageId = text(metadata.message_id) ?? text(metadata.recipient_input_message_id) ?? buildTeamMemberInputMessageId({
    ...input, content, receivedAt, parentCommunicationMessageId,
  });
  return Object.freeze({
    recipientAgentRunId: input.recipientAgentRunId,
    messageId,
    dedupeKey: text(metadata.dedupe_key) ?? buildTeamMemberInputDedupeKey({
      rootTeamRunId: input.rootTeamRunId,
      recipientAgentRunId: input.recipientAgentRunId,
      messageId,
    }),
    content,
    inputOrigin: origin(metadata),
    receivedAt,
    contextFilePaths: Object.freeze(contextFiles(input.message)),
    senderAgentRunId: text(metadata.sender_agent_id),
    parentCommunicationMessageId,
  });
};
