import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload
} from '../llm/utils/messages.js';
import { ToolResultEvent } from '../agent/events/agent-events.js';
import { formatToCleanString } from '../utils/llm-output-formatter.js';

type ToolProtocolProjection = {
  unsafeToolCallIds: Set<string>;
  safeToolResultIds: Set<string>;
  completedResultPayloadsByMessageIndex: Map<number, ToolResultPayload[]>;
};

export function projectInterruptedTurnWorkingContext(
  messages: Message[],
  markerContent: string | null,
  completedToolResults: ToolResultEvent[] = []
): Message[] {
  const toolProtocolProjection = classifyToolProtocolMessages(messages);
  const projected: Message[] = [];
  const summarizedToolResultIds = new Set<string>();

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.tool_payload instanceof ToolCallPayload) {
      const calls = message.tool_payload.toolCalls;
      if (calls.some((call) => toolProtocolProjection.unsafeToolCallIds.has(call.id))) {
        const completedPayloads = toolProtocolProjection.completedResultPayloadsByMessageIndex.get(index) ?? [];
        for (const payload of completedPayloads) {
          if (payload.toolCallId) {
            summarizedToolResultIds.add(payload.toolCallId);
          }
        }
        const summary = buildInterruptedToolCallSummary(message.tool_payload, completedPayloads);
        projected.push(new Message(MessageRole.ASSISTANT, {
          content: [
            message.content,
            summary
          ].filter((part): part is string => Boolean(part && part.trim().length > 0)).join('\n\n') || summary,
          reasoning_content: message.reasoning_content
        }));
        continue;
      }
    }

    if (
      message.tool_payload instanceof ToolResultPayload &&
      !toolProtocolProjection.safeToolResultIds.has(message.tool_payload.toolCallId)
    ) {
      continue;
    }

    projected.push(message);
  }

  const unsummarizedCompletedResults = completedToolResults.filter((event) => {
    const invocationId = event.toolInvocationId;
    return !invocationId || (
      !summarizedToolResultIds.has(invocationId) &&
      !toolProtocolProjection.safeToolResultIds.has(invocationId)
    );
  });
  if (unsummarizedCompletedResults.length) {
    projected.push(new Message(MessageRole.ASSISTANT, {
      content: buildCompletedToolResultEventsSummary(unsummarizedCompletedResults)
    }));
  }

  if (markerContent && !projected.some((message) => message.content === markerContent)) {
    projected.push(new Message(MessageRole.USER, { content: markerContent }));
  }
  return projected;
}

function classifyToolProtocolMessages(messages: Message[]): ToolProtocolProjection {
  const unsafeToolCallIds = new Set<string>();
  const safeToolResultIds = new Set<string>();
  const completedResultPayloadsByMessageIndex = new Map<number, ToolResultPayload[]>();

  for (let index = 0; index < messages.length; index += 1) {
    const payload = messages[index].tool_payload;
    if (!(payload instanceof ToolCallPayload)) {
      continue;
    }
    const callIds = payload.toolCalls.map((call) => call.id).filter(Boolean);
    const expected = new Set(callIds);
    const observed = new Set<string>();
    let cursor = index + 1;
    while (cursor < messages.length && messages[cursor].tool_payload instanceof ToolResultPayload) {
      const resultPayload = messages[cursor].tool_payload as ToolResultPayload;
      if (expected.has(resultPayload.toolCallId)) {
        observed.add(resultPayload.toolCallId);
        const existing = completedResultPayloadsByMessageIndex.get(index) ?? [];
        existing.push(resultPayload);
        completedResultPayloadsByMessageIndex.set(index, existing);
      }
      cursor += 1;
    }

    if (!expected.size || observed.size !== expected.size) {
      for (const callId of callIds) {
        unsafeToolCallIds.add(callId);
      }
      continue;
    }

    for (const callId of observed) {
      safeToolResultIds.add(callId);
    }
  }

  return { unsafeToolCallIds, safeToolResultIds, completedResultPayloadsByMessageIndex };
}

function buildInterruptedToolCallSummary(
  payload: ToolCallPayload,
  completedResults: ToolResultPayload[] = []
): string {
  const toolNames = payload.toolCalls
    .map((call) => call.name)
    .filter((name): name is string => Boolean(name && name.trim().length > 0));
  const suffix = toolNames.length ? ` Tool request(s): ${toolNames.join(', ')}.` : '';
  const completedSummary = completedResults.length
    ? `\nCompleted tool results before interruption:\n${completedResults
        .map((result) => formatCompletedToolResultFact({
          toolName: result.toolName,
          toolInvocationId: result.toolCallId,
          result: result.toolResult,
          error: result.toolError ?? undefined
        }))
        .join('\n')}`
    : '';
  return `Interrupted tool request was fenced from native tool-call history.${suffix}${completedSummary}`;
}

function buildCompletedToolResultEventsSummary(events: ToolResultEvent[]): string {
  return [
    'Completed tool results before interruption:',
    ...events.map((event) => formatCompletedToolResultFact(event))
  ].join('\n');
}

function formatCompletedToolResultFact(event: {
  toolName: string;
  toolInvocationId?: string;
  result: unknown;
  error?: string | null;
}): string {
  const invocationSuffix = event.toolInvocationId ? ` (${event.toolInvocationId})` : '';
  const detail = event.error
    ? `Error: ${event.error}`
    : `Result: ${formatToCleanString(event.result)}`;
  return `- ${event.toolName}${invocationSuffix}: ${detail}`;
}
