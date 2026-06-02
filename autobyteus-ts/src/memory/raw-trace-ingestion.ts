import type { ToolResultEvent } from '../agent/events/agent-events.js';
import type { ToolInvocation } from '../agent/tool-invocation.js';
import type { ToolCallSpec } from '../llm/utils/messages.js';
import { RawTraceItem } from './models/raw-trace-item.js';

type NextSeq = (turnId: string) => number;

export type BuiltToolIntentTraces = {
  traces: RawTraceItem[];
  toolCalls: ToolCallSpec[];
  effectiveTurnId: string;
};

export const buildToolIntentTraces = (
  toolInvocations: ToolInvocation[],
  turnId: string | undefined,
  nextSeq: NextSeq,
): BuiltToolIntentTraces => {
  const traces: RawTraceItem[] = [];
  const toolCalls: ToolCallSpec[] = [];
  let effectiveTurnId: string | null = null;

  for (const invocation of toolInvocations) {
    const invocationTurnId = invocation.turnId ?? turnId;
    if (!invocationTurnId) throw new Error('turnId is required to ingest tool intent');
    if (!effectiveTurnId) effectiveTurnId = invocationTurnId;
    else if (effectiveTurnId !== invocationTurnId) throw new Error('All tool intents in a batch must belong to the same turnId');

    traces.push(new RawTraceItem({
      id: `rt_${Date.now()}_${invocation.id}`,
      ts: Date.now() / 1000,
      turnId: invocationTurnId,
      seq: nextSeq(invocationTurnId),
      traceType: 'tool_call',
      content: '',
      sourceEvent: 'PendingToolInvocationEvent',
      toolName: invocation.name,
      toolCallId: invocation.id,
      toolArgs: invocation.arguments
    }));
    toolCalls.push({
      id: invocation.id,
      name: invocation.name,
      arguments: invocation.arguments,
      nativeToolCallContext: invocation.nativeToolCallContext
    });
  }

  return { traces, toolCalls, effectiveTurnId: effectiveTurnId! };
};

export type BuiltToolResultTraces = {
  traces: RawTraceItem[];
  ingestedEvents: Array<{ event: ToolResultEvent; trace: RawTraceItem }>;
};

export const buildToolResultTraces = (
  events: ToolResultEvent[],
  turnId: string | undefined,
  sourceEvent: string,
  existingToolResultIds: Set<string>,
  nextSeq: NextSeq,
): BuiltToolResultTraces => {
  const traces: RawTraceItem[] = [];
  const ingestedEvents: Array<{ event: ToolResultEvent; trace: RawTraceItem }> = [];
  let effectiveTurnId: string | null = null;

  for (const event of events) {
    const eventTurnId = event.turnId ?? turnId;
    if (!eventTurnId) throw new Error('turnId is required to ingest tool result');
    if (!effectiveTurnId) effectiveTurnId = eventTurnId;
    else if (effectiveTurnId !== eventTurnId) throw new Error('All tool results in a batch must belong to the same turnId');

    const resultIdentity = event.toolInvocationId ? `${eventTurnId}:${event.toolInvocationId}` : null;
    if (resultIdentity && existingToolResultIds.has(resultIdentity)) continue;
    if (resultIdentity) existingToolResultIds.add(resultIdentity);

    const trace = new RawTraceItem({
      id: `rt_${Date.now()}_${event.toolInvocationId ?? traces.length}`,
      ts: Date.now() / 1000,
      turnId: eventTurnId,
      seq: nextSeq(eventTurnId),
      traceType: 'tool_result',
      content: '',
      sourceEvent,
      toolName: event.toolName,
      toolCallId: event.toolInvocationId ?? null,
      toolArgs: event.toolArgs ?? null,
      toolResult: event.result,
      toolError: event.error ?? null
    });
    traces.push(trace);
    ingestedEvents.push({ event, trace });
  }

  return { traces, ingestedEvents };
};
