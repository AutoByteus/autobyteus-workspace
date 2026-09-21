import { createHash } from "node:crypto";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { CollaborationMemberExecutionIdentity } from "../domain/root-execution-identity.js";
import type { AgentPresentationContextPath, AgentPresentationEvent } from "./agent-presentation-event.js";

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const hash = (parts: readonly unknown[]): string => createHash("sha256")
  .update(parts.map((part) => String(part ?? "")).join("\0"))
  .digest("base64url").slice(0, 32);

const metadataOf = (message: AgentInputUserMessage): Record<string, unknown> => {
  const metadata = (message as unknown as { metadata?: unknown }).metadata;
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : {};
};

const contextPath = (value: unknown): AgentPresentationContextPath | null => {
  if (typeof value === "string" && value.trim()) return Object.freeze({ path: value.trim(), type: null });
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const path = text(record.uri) ?? text(record.path) ?? text(record.locator) ?? text(record.file_path);
  return path ? Object.freeze({
    path,
    type: text(record.file_type) ?? text(record.fileType) ?? text(record.type),
  }) : null;
};

const contextPaths = (message: AgentInputUserMessage): readonly AgentPresentationContextPath[] => {
  const values = (message as unknown as { contextFiles?: unknown }).contextFiles;
  if (!Array.isArray(values)) return Object.freeze([]);
  return Object.freeze(values
    .map((value) => value && typeof value === "object" && typeof (value as { toDict?: unknown }).toDict === "function"
      ? (value as { toDict: () => unknown }).toDict()
      : value)
    .map(contextPath)
    .filter((value): value is AgentPresentationContextPath => value !== null));
};

export const buildMemberInputPresentationEvent = (input: Readonly<{
  execution: CollaborationMemberExecutionIdentity;
  message: AgentInputUserMessage;
  receivedAt?: string | null;
}>): Extract<AgentPresentationEvent, { eventType: "MEMBER_INPUT_MESSAGE" }> => {
  const receivedAt = text(input.receivedAt) ?? new Date().toISOString();
  const metadata = metadataOf(input.message);
  const rawContent = (input.message as unknown as { content?: unknown }).content;
  const content = typeof rawContent === "string" ? rawContent : "";
  const parentCommunicationMessageId = text(metadata.parent_communication_message_id);
  const messageId = text(metadata.message_id) ?? text(metadata.recipient_input_message_id) ?? `memberinput_${hash([
    input.execution.root.rootRunId,
    input.execution.agentRunId,
    parentCommunicationMessageId ?? receivedAt,
    content,
  ])}`;
  return Object.freeze({
    eventType: "MEMBER_INPUT_MESSAGE",
    details: Object.freeze({
      messageId,
      dedupeKey: text(metadata.dedupe_key)
        ?? `member_input:${input.execution.root.rootRunId}:${input.execution.agentRunId}:${messageId}`,
      content,
      inputOrigin: metadata.input_origin === "inter_agent_delivery" ? "inter_agent_delivery" : "user_message",
      receivedAt,
      contextFilePaths: contextPaths(input.message),
      senderAgentRunId: text(metadata.sender_agent_id),
      parentCommunicationMessageId,
    }),
    statusHint: null,
  });
};
