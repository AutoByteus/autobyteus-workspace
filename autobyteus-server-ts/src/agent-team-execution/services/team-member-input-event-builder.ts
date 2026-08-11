import { createHash } from "node:crypto";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { MixedAgentMemberContext } from "../backends/mixed/mixed-team-run-context.js";
import { createTeamExecutionAddress, serializeTeamExecutionAddress, type TeamExecutionAddress } from "../domain/team-execution-address.js";
import type { TeamRunMemberInputContextFile, TeamRunMemberInputEventPayload, TeamRunMemberInputOrigin } from "../domain/team-run-event.js";

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const hashIdentity = (parts: readonly unknown[]): string => createHash("sha256")
  .update(parts.map((part) => String(part ?? "")).join("\0"))
  .digest("base64url").slice(0, 32);

export const buildTeamMemberInputMessageId = (input: {
  teamRunId: string;
  executionAddress: TeamExecutionAddress;
  content: string;
  receivedAt: string;
  parentCommunicationMessageId?: string | null;
}): string => `memberinput_${hashIdentity([
  input.teamRunId,
  serializeTeamExecutionAddress(input.executionAddress),
  text(input.parentCommunicationMessageId) ?? input.receivedAt,
  input.content,
])}`;

export const buildTeamMemberInputDedupeKey = (input: {
  teamRunId: string;
  executionAddress: TeamExecutionAddress;
  messageId: string;
}): string => `member_input:${input.teamRunId}:${serializeTeamExecutionAddress(input.executionAddress)}:${input.messageId}`;

const readMetadata = (message: AgentInputUserMessage): Record<string, unknown> => {
  const metadata = (message as unknown as { metadata?: unknown }).metadata;
  return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata as Record<string, unknown> : {};
};

const contextFile = (value: unknown): TeamRunMemberInputContextFile | null => {
  if (typeof value === "string" && value.trim()) return { path: value.trim(), type: null };
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const path = text(record.uri) ?? text(record.path) ?? text(record.locator) ?? text(record.file_path);
  if (!path) return null;
  return { path, type: text(record.file_type) ?? text(record.fileType) ?? text(record.type) };
};

const readContextFiles = (message: AgentInputUserMessage): TeamRunMemberInputContextFile[] => {
  const files = (message as unknown as { contextFiles?: unknown }).contextFiles;
  if (!Array.isArray(files)) return [];
  return files.map((item) => item && typeof item === "object" && typeof (item as { toDict?: unknown }).toDict === "function"
    ? (item as { toDict: () => unknown }).toDict() : item)
    .map(contextFile).filter((item): item is TeamRunMemberInputContextFile => Boolean(item));
};

const origin = (message: AgentInputUserMessage, metadata: Record<string, unknown>): TeamRunMemberInputOrigin => {
  const explicit = text(metadata.input_origin);
  if (explicit === "inter_agent_delivery" || explicit === "user_message") return explicit;
  return text(metadata.sender_agent_id) || text((message as unknown as { senderType?: unknown }).senderType) === "agent"
    ? "inter_agent_delivery" : "user_message";
};

const readExecutionAddress = (value: unknown): TeamExecutionAddress | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try { return createTeamExecutionAddress(value as TeamExecutionAddress); } catch { return null; }
};

export const buildTeamMemberInputEventPayload = (input: {
  teamRunId: string;
  memberContext: MixedAgentMemberContext;
  executionAddress: TeamExecutionAddress;
  message: AgentInputUserMessage;
  receivedAt?: string | null;
}): TeamRunMemberInputEventPayload => {
  const receivedAt = text(input.receivedAt) ?? new Date().toISOString();
  const metadata = readMetadata(input.message);
  const contentValue = (input.message as unknown as { content?: unknown }).content;
  const content = typeof contentValue === "string" ? contentValue : "";
  const parentCommunicationMessageId = text(metadata.parent_communication_message_id);
  const executionAddress = createTeamExecutionAddress(input.executionAddress);
  const messageId = text(metadata.message_id) ?? text(metadata.recipient_input_message_id) ?? buildTeamMemberInputMessageId({
    teamRunId: input.teamRunId,
    executionAddress,
    content,
    receivedAt,
    parentCommunicationMessageId,
  });
  return {
    messageId,
    dedupeKey: text(metadata.dedupe_key) ?? buildTeamMemberInputDedupeKey({ teamRunId: input.teamRunId, executionAddress, messageId }),
    content,
    inputOrigin: origin(input.message, metadata),
    receivedAt,
    contextFilePaths: readContextFiles(input.message),
    senderAddress: readExecutionAddress(metadata.sender_execution_address),
    parentCommunicationMessageId,
  };
};
