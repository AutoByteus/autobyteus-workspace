import type { ToolResultEvent } from '../agent/events/agent-events.js';
import type { ToolInvocation } from '../agent/tool-invocation.js';
import type { ToolCallSpec } from '../llm/utils/messages.js';
import { RawTraceItem } from './models/raw-trace-item.js';
import { createToolCallIdentity, type ToolCallIdentity } from './models/tool-call-identity.js';

type NextSeq = (turnId: string) => number;

export type NativeToolCallRegistration = {
  identity: ToolCallIdentity;
  toolName: string;
  toolArgs: Record<string, unknown>;
  toolCall: ToolCallSpec;
};

export const normalizeNativeToolCallBatch = (
  toolInvocations: readonly ToolInvocation[],
  turnId?: string,
): NativeToolCallRegistration[] => {
  let batchTurnId: string | null = null;
  return toolInvocations.map((invocation) => {
    const identity = createToolCallIdentity(invocation.turnId ?? turnId, invocation.id);
    if (!identity) {
      throw new Error('Every native tool call requires a non-empty turnId and tool invocation id; the batch was rejected.');
    }
    if (!batchTurnId) batchTurnId = identity.turnId;
    else if (batchTurnId !== identity.turnId) {
      throw new Error('All native tool calls in a batch must belong to the same turnId.');
    }
    const toolName = invocation.name.trim();
    if (!toolName) {
      throw new Error('Every native tool call requires a non-empty tool name; the batch was rejected.');
    }
    const toolArgs = structuredClone(invocation.arguments);
    return {
      identity,
      toolName,
      toolArgs,
      toolCall: {
        id: identity.toolCallId,
        name: toolName,
        arguments: structuredClone(toolArgs),
        nativeToolCallContext: invocation.nativeToolCallContext,
      },
    };
  });
};

export const buildNativeToolCallTrace = (
  registration: NativeToolCallRegistration,
  nextSeq: NextSeq,
): RawTraceItem => new RawTraceItem({
  id: `rt_${Date.now()}_${registration.identity.turnId}_${registration.identity.toolCallId}_call`,
  ts: Date.now() / 1000,
  turnId: registration.identity.turnId,
  seq: nextSeq(registration.identity.turnId),
  traceType: 'tool_call',
  content: '',
  sourceEvent: 'PendingToolInvocationEvent',
  toolName: registration.toolName,
  toolCallId: registration.identity.toolCallId,
  toolArgs: registration.toolArgs,
});

export type NativeToolResultRegistration = {
  event: ToolResultEvent;
  identity: ToolCallIdentity;
};

export const normalizeNativeToolResultBatch = (
  events: readonly ToolResultEvent[],
  turnId?: string,
): NativeToolResultRegistration[] => {
  let batchTurnId: string | null = null;
  return events.map((event) => {
    const identity = createToolCallIdentity(event.turnId ?? turnId, event.toolInvocationId);
    if (!identity) {
      throw new Error('Every native tool result requires a non-empty turnId and toolInvocationId; the batch was rejected.');
    }
    if (!batchTurnId) batchTurnId = identity.turnId;
    else if (batchTurnId !== identity.turnId) {
      throw new Error('All native tool results in a batch must belong to the same turnId.');
    }
    return { event, identity };
  });
};

export const buildNativeToolResultTrace = (
  registration: NativeToolResultRegistration,
  canonicalToolName: string,
  sourceEvent: string,
  nextSeq: NextSeq,
): RawTraceItem => {
  const { event, identity } = registration;
  const toolError = event.error?.trim() || (event.isDenied ? 'Tool execution denied.' : null);
  return new RawTraceItem({
    id: `rt_${Date.now()}_${identity.turnId}_${identity.toolCallId}_result`,
    ts: Date.now() / 1000,
    turnId: identity.turnId,
    seq: nextSeq(identity.turnId),
    traceType: 'tool_result',
    content: event.isDenied ? 'Tool execution denied.' : '',
    sourceEvent,
    toolName: canonicalToolName,
    toolCallId: identity.toolCallId,
    toolResult: event.result === undefined ? null : event.result,
    toolError,
  });
};
