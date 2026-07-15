import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
  type ToolCallSpec,
} from '../llm/utils/messages.js';
import { getMessageProvenance, setMessageProvenance } from './message-provenance.js';
import { createToolCallIdentity, toolCallIdentityKey } from './models/tool-call-identity.js';

export const SYNTHETIC_INTERRUPTED_TOOL_RESULT_CONTENT = [
  'Tool execution was interrupted by runtime shutdown before a result was recorded.',
  'Completion status is unknown. No tool output is available in memory.',
  'Do not assume the requested output exists. Retry or verify only if the user asks or task requires it.',
].join('\n');

export const AGENT_INTERRUPTED_TOOL_RESULT_CONTENT = [
  'Tool execution was interrupted before a result was recorded.',
  'Completion status is unknown. No tool output is available in memory.',
  'Do not assume the requested output exists. Retry or verify only if the user asks or task requires it.',
].join('\n');

export type CompletedToolResultFact = {
  toolCallId: string;
  toolName: string;
  toolResult: unknown;
  toolError: string | null;
  turnId: string | null;
  rawTraceId?: string;
};

export type ToolCallFact = {
  toolCallId: string;
  toolName: string;
  turnId: string | null;
  rawTraceId?: string;
};

export type InterruptedToolResultRepair = {
  toolCallId: string;
  toolName: string;
  turnId: string | null;
  source: 'synthetic_interrupted' | 'raw_completed_result';
  toolResult: unknown;
  toolError: string | null;
};

export type WorkingContextToolProtocolRepairResult = {
  messages: Message[];
  didRepair: boolean;
  repairs: InterruptedToolResultRepair[];
};

export type WorkingContextToolProtocolRepairOptions = {
  completedToolResultsByIdentity?: Map<string, CompletedToolResultFact>;
  toolCallFactsByIdentity?: Map<string, ToolCallFact>;
  syntheticInterruptedToolResultContent?: string;
  fallbackTurnId?: string | null;
};

export function repairWorkingContextToolProtocol(
  messages: Message[],
  options: WorkingContextToolProtocolRepairOptions = {},
): WorkingContextToolProtocolRepairResult {
  const repaired: Message[] = [];
  const repairs: InterruptedToolResultRepair[] = [];
  let didRepair = false;

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.tool_payload instanceof ToolCallPayload) {
      const repair = repairToolCallMessage(message, messages, index, options);
      repaired.push(message, ...repair.resultMessages, ...repair.insertedMessages);
      repairs.push(...repair.repairs);
      didRepair = didRepair || repair.didRepair;
      index = repair.nextIndex - 1;
      continue;
    }

    if (message.tool_payload instanceof ToolResultPayload) {
      didRepair = true;
      continue;
    }

    repaired.push(message);
  }

  return {
    messages: didRepair ? repaired : messages,
    didRepair,
    repairs,
  };
}

type ToolCallMessageRepair = {
  resultMessages: Message[];
  insertedMessages: Message[];
  repairs: InterruptedToolResultRepair[];
  didRepair: boolean;
  nextIndex: number;
};

function repairToolCallMessage(
  message: Message,
  messages: Message[],
  messageIndex: number,
  options: WorkingContextToolProtocolRepairOptions,
): ToolCallMessageRepair {
  const payload = message.tool_payload as ToolCallPayload;
  const expectedCalls = payload.toolCalls.filter((call) => normalizeToolCallId(call.id));
  const expectedIds = new Set(expectedCalls.map((call) => normalizeToolCallId(call.id)!));
  const observedIds = new Set<string>();
  const resultMessages: Message[] = [];
  const insertedMessages: Message[] = [];
  const repairs: InterruptedToolResultRepair[] = [];
  let didRepair = false;
  let cursor = messageIndex + 1;

  while (cursor < messages.length && messages[cursor].tool_payload instanceof ToolResultPayload) {
    const resultPayload = messages[cursor].tool_payload as ToolResultPayload;
    const resultId = normalizeToolCallId(resultPayload.toolCallId);
    if (resultId && expectedIds.has(resultId) && !observedIds.has(resultId)) {
      observedIds.add(resultId);
      resultMessages.push(messages[cursor]);
    } else {
      didRepair = true;
    }
    cursor += 1;
  }

  for (const call of expectedCalls) {
    const callId = normalizeToolCallId(call.id)!;
    if (observedIds.has(callId)) continue;
    const inserted = buildInsertedToolResultMessage(call, message, options);
    insertedMessages.push(inserted.message);
    repairs.push(inserted.repair);
    didRepair = true;
  }

  if (expectedCalls.length !== payload.toolCalls.length) {
    didRepair = true;
  }

  return { resultMessages, insertedMessages, repairs, didRepair, nextIndex: cursor };
}

function buildInsertedToolResultMessage(
  call: ToolCallSpec,
  assistantMessage: Message,
  options: WorkingContextToolProtocolRepairOptions,
): { message: Message; repair: InterruptedToolResultRepair } {
  const callId = normalizeToolCallId(call.id)!;
  const assistantProvenance = getMessageProvenance(assistantMessage);
  const identity = createToolCallIdentity(
    assistantProvenance?.turnId ?? options.fallbackTurnId,
    callId,
  );
  const identityKey = identity
    ? toolCallIdentityKey(identity)
    : resolveUniqueIdentityKey(callId, options);
  const completed = identityKey
    ? options.completedToolResultsByIdentity?.get(identityKey) ?? null
    : null;
  const callFact = identityKey
    ? options.toolCallFactsByIdentity?.get(identityKey) ?? null
    : null;
  const toolName = completed?.toolName || call.name || callFact?.toolName || 'unknown_tool';
  const turnId = completed?.turnId ?? assistantProvenance?.turnId ?? callFact?.turnId ?? options.fallbackTurnId ?? null;
  const source = completed ? 'raw_completed_result' : 'synthetic_interrupted';
  const toolResult = completed
    ? completed.toolResult
    : options.syntheticInterruptedToolResultContent ?? SYNTHETIC_INTERRUPTED_TOOL_RESULT_CONTENT;
  const toolError = completed ? completed.toolError : null;
  const message = new Message(MessageRole.TOOL, {
    content: null,
    tool_payload: new ToolResultPayload(callId, toolName, toolResult, toolError),
  });

  setMessageProvenance(message, {
    sourceKind: completed ? 'tool_result' : 'recovery',
    turnId,
    rawTraceIds: completed?.rawTraceId ? [completed.rawTraceId] : undefined,
    toolCallIds: [callId],
  });

  return {
    message,
    repair: { toolCallId: callId, toolName, turnId, source, toolResult, toolError },
  };
}

function resolveUniqueIdentityKey(
  toolCallId: string,
  options: WorkingContextToolProtocolRepairOptions,
): string | null {
  const matchingKeys = new Set<string>();
  for (const [key, fact] of options.completedToolResultsByIdentity ?? []) {
    if (fact.toolCallId === toolCallId) matchingKeys.add(key);
  }
  for (const [key, fact] of options.toolCallFactsByIdentity ?? []) {
    if (fact.toolCallId === toolCallId) matchingKeys.add(key);
  }
  return matchingKeys.size === 1 ? [...matchingKeys][0]! : null;
}

function normalizeToolCallId(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
