import { createHash } from "node:crypto";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { MixedAgentMemberContext } from "../backends/mixed/mixed-team-run-context.js";
import type {
  TeamRunMemberInputContextFile,
  TeamRunMemberInputEventPayload,
  TeamRunMemberInputOrigin,
} from "../domain/team-run-event.js";

const normalizeString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const normalizeStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const normalized = value
    .map((item) => normalizeString(item))
    .filter((item): item is string => Boolean(item));
  return normalized.length > 0 ? normalized : null;
};

const hashIdentity = (parts: readonly unknown[]): string =>
  createHash("sha256")
    .update(parts.map((part) => String(part ?? "")).join("\0"))
    .digest("base64url")
    .slice(0, 32);

export const buildTeamMemberInputMessageId = (input: {
  teamRunId: string;
  memberRunId: string;
  memberRouteKey: string;
  content: string;
  receivedAt: string;
  parentCommunicationMessageId?: string | null;
}): string => {
  const parentMessageId = normalizeString(input.parentCommunicationMessageId);
  const hash = hashIdentity([
    input.teamRunId,
    input.memberRunId,
    input.memberRouteKey,
    parentMessageId ?? input.receivedAt,
    input.content,
  ]);
  return `memberinput_${hash}`;
};

export const buildTeamMemberInputDedupeKey = (input: {
  teamRunId: string;
  memberRouteKey: string;
  messageId: string;
}): string => `member_input:${input.teamRunId}:${input.memberRouteKey}:${input.messageId}`;

const readMetadata = (message: AgentInputUserMessage): Record<string, unknown> => {
  const metadata = (message as unknown as { metadata?: unknown }).metadata;
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : {};
};

const readContextFilePath = (value: unknown): TeamRunMemberInputContextFile | null => {
  if (typeof value === "string" && value.trim().length > 0) {
    return { path: value.trim() };
  }
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const path =
    normalizeString(record.path) ??
    normalizeString(record.locator) ??
    normalizeString(record.file_path);
  if (!path) {
    return null;
  }
  return {
    path,
    type: normalizeString(record.type),
  };
};

const readContextFilePaths = (
  message: AgentInputUserMessage,
): TeamRunMemberInputContextFile[] => {
  const contextFiles = (message as unknown as { contextFiles?: unknown }).contextFiles;
  if (!Array.isArray(contextFiles)) {
    return [];
  }

  return contextFiles
    .map((item) => {
      const dict =
        item && typeof item === "object" && typeof (item as { toDict?: unknown }).toDict === "function"
          ? (item as { toDict: () => unknown }).toDict()
          : item;
      return readContextFilePath(dict);
    })
    .filter((item): item is TeamRunMemberInputContextFile => Boolean(item));
};

const inferInputOrigin = (
  message: AgentInputUserMessage,
  metadata: Record<string, unknown>,
): TeamRunMemberInputOrigin => {
  const explicitOrigin = normalizeString(metadata.input_origin);
  if (explicitOrigin === "inter_agent_delivery") {
    return "inter_agent_delivery";
  }
  if (explicitOrigin === "user_message") {
    return "user_message";
  }
  if (normalizeString(metadata.sender_agent_id)) {
    return "inter_agent_delivery";
  }
  const senderType = normalizeString((message as unknown as { senderType?: unknown }).senderType);
  return senderType === "agent" ? "inter_agent_delivery" : "user_message";
};

export const buildTeamMemberInputEventPayload = (input: {
  teamRunId: string;
  memberContext: MixedAgentMemberContext;
  message: AgentInputUserMessage;
  receivedAt?: string | null;
}): TeamRunMemberInputEventPayload => {
  const receivedAt = normalizeString(input.receivedAt) ?? new Date().toISOString();
  const metadata = readMetadata(input.message);
  const content = (input.message as unknown as { content?: unknown }).content;
  const normalizedContent = typeof content === "string" ? content : "";
  const parentCommunicationMessageId = normalizeString(metadata.parent_communication_message_id);
  const messageId =
    normalizeString(metadata.message_id) ??
    normalizeString(metadata.recipient_input_message_id) ??
    buildTeamMemberInputMessageId({
      teamRunId: input.teamRunId,
      memberRunId: input.memberContext.memberRunId,
      memberRouteKey: input.memberContext.memberRouteKey,
      content: normalizedContent,
      receivedAt,
      parentCommunicationMessageId,
    });
  const dedupeKey =
    normalizeString(metadata.dedupe_key) ??
    buildTeamMemberInputDedupeKey({
      teamRunId: input.teamRunId,
      memberRouteKey: input.memberContext.memberRouteKey,
      messageId,
    });

  return {
    messageId,
    dedupeKey,
    teamRunId: input.teamRunId,
    recipientMemberRunId: input.memberContext.memberRunId,
    recipientMemberName: input.memberContext.memberName,
    recipientMemberPath: [...input.memberContext.memberPath],
    recipientMemberRouteKey: input.memberContext.memberRouteKey,
    content: normalizedContent,
    inputOrigin: inferInputOrigin(input.message, metadata),
    receivedAt,
    contextFilePaths: readContextFilePaths(input.message),
    senderRunId: normalizeString(metadata.sender_agent_id),
    senderMemberName: normalizeString(metadata.sender_agent_name),
    senderMemberRouteKey:
      normalizeString(metadata.sender_member_route_key) ??
      normalizeString(metadata.sender_route_key),
    senderMemberPath:
      normalizeStringArray(metadata.sender_member_path) ??
      normalizeStringArray(metadata.sender_path),
    parentCommunicationMessageId,
  };
};
