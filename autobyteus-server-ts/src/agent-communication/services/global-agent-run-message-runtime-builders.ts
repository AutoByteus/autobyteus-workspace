import { randomUUID } from "node:crypto";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../agent-execution/domain/agent-run-event.js";
import type { AgentRunMessageSenderContext } from "../domain/agent-run-message-sender.js";

const resolveMessageType = (value: string | null | undefined): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "agent_message";
  }
  return value.trim();
};

const normalizeReferenceFiles = (
  referenceFiles: string[] | null | undefined,
): string[] => {
  if (!Array.isArray(referenceFiles)) {
    return [];
  }
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of referenceFiles) {
    if (typeof value !== "string") {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }
  return normalized;
};

const buildReferenceFilesBlock = (referenceFiles: string[]): string =>
  referenceFiles.length === 0
    ? ""
    : `\n\nReference files:\n${referenceFiles.map((filePath) => `- ${filePath}`).join("\n")}`;

export type DirectAgentRunMessageRuntimeInput = {
  sender: AgentRunMessageSenderContext;
  targetAgentRunId: string;
  content: string;
  messageType?: string | null;
  referenceFiles?: string[] | null;
  createdAt?: string | null;
  messageId?: string | null;
};

export const buildDirectAgentRunMessageId = (): string =>
  `direct_inter_agent_${randomUUID()}`;

export const buildDirectAgentRunVisibleMessageContent = (
  input: DirectAgentRunMessageRuntimeInput,
): string => {
  const referenceFiles = normalizeReferenceFiles(input.referenceFiles);
  return (
    `You received a message from sender name: ${input.sender.senderName}, sender id: ${input.sender.senderRunId}\n` +
    `message:\n${input.content}${buildReferenceFilesBlock(referenceFiles)}`
  );
};

export const buildDirectAgentRunInputMessage = (
  input: DirectAgentRunMessageRuntimeInput,
): AgentInputUserMessage => {
  const referenceFiles = normalizeReferenceFiles(input.referenceFiles);
  const messageId = input.messageId?.trim() || buildDirectAgentRunMessageId();
  return new AgentInputUserMessage(
    buildDirectAgentRunVisibleMessageContent(input),
    SenderType.AGENT,
    null,
    {
      message_id: messageId,
      input_origin: "direct_inter_agent_delivery",
      sender_agent_id: input.sender.senderRunId,
      sender_agent_name: input.sender.senderName,
      sender_runtime_kind: input.sender.runtimeKind ?? null,
      receiver_run_id: input.targetAgentRunId,
      original_message_type: resolveMessageType(input.messageType),
      reference_files: referenceFiles,
    },
  );
};

export const buildDirectAgentRunInterAgentEvent = (
  input: DirectAgentRunMessageRuntimeInput,
): AgentRunEvent => {
  const messageType = resolveMessageType(input.messageType);
  const createdAt = input.createdAt?.trim() || new Date().toISOString();
  const messageId = input.messageId?.trim() || buildDirectAgentRunMessageId();
  const referenceFiles = normalizeReferenceFiles(input.referenceFiles);
  return {
    eventType: AgentRunEventType.INTER_AGENT_MESSAGE,
    runId: input.targetAgentRunId,
    payload: {
      message_id: messageId,
      sender_agent_id: input.sender.senderRunId,
      sender_agent_name: input.sender.senderName,
      sender_runtime_kind: input.sender.runtimeKind ?? null,
      receiver_run_id: input.targetAgentRunId,
      content: input.content,
      message_type: messageType,
      reference_files: referenceFiles,
      created_at: createdAt,
    },
    statusHint: null,
  };
};
