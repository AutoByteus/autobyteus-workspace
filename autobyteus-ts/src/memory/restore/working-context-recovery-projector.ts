import { Message, MessageRole } from '../../llm/utils/messages.js';
import { formatToCleanString } from '../../utils/llm-output-formatter.js';
import { setMessageProvenance } from '../message-provenance.js';
import type { RawTraceItem } from '../models/raw-trace-item.js';
import { createToolCallIdentity, toolCallIdentityKey } from '../models/tool-call-identity.js';
import { ToolInteractionStatus, type ToolInteraction } from '../models/tool-interaction.js';
import { buildToolInteractions } from '../tool-interaction-builder.js';

const TRUNCATION_MARKER = ' …[truncated]';
const clampRenderedLine = (line: string, maxItemChars: number | null | undefined): string => {
  const limit = typeof maxItemChars === 'number' && Number.isFinite(maxItemChars) && maxItemChars > 0
    ? Math.floor(maxItemChars)
    : null;
  if (limit === null || line.length <= limit) return line;
  if (limit <= TRUNCATION_MARKER.length) return TRUNCATION_MARKER.slice(0, limit);
  return `${line.slice(0, limit - TRUNCATION_MARKER.length)}${TRUNCATION_MARKER}`;
};

export class WorkingContextRecoveryProjector {
  project(rawTraces: RawTraceItem[], maxItemChars?: number | null): Message[] {
    const interactionByIdentity = new Map(
      buildToolInteractions(rawTraces).map((interaction) => [
        toolCallIdentityKey({ turnId: interaction.turnId!, toolCallId: interaction.toolCallId }),
        interaction,
      ]),
    );
    const projectedToolIdentities = new Set<string>();
    const messages: Message[] = [];

    for (const trace of rawTraces.slice(-12)) {
      if (trace.traceType === 'tool_call' || trace.traceType === 'tool_result') {
        const identity = createToolCallIdentity(trace.turnId, trace.toolCallId);
        if (!identity) continue;
        const key = toolCallIdentityKey(identity);
        if (projectedToolIdentities.has(key)) continue;
        projectedToolIdentities.add(key);
        const interaction = interactionByIdentity.get(key);
        if (interaction) messages.push(...this.projectInteraction(interaction, maxItemChars));
        continue;
      }
      const message = this.projectNonToolTrace(trace, maxItemChars);
      if (message) messages.push(message);
    }
    return messages;
  }

  private projectInteraction(interaction: ToolInteraction, maxItemChars?: number | null): Message[] {
    const toolName = interaction.toolName ?? 'unknown_tool';
    const request = this.withRecoveryProvenance(
      new Message(MessageRole.ASSISTANT, {
        content: clampRenderedLine(
          `I requested tool ${toolName} with arguments ${formatToCleanString(interaction.arguments ?? {})}.`,
          maxItemChars,
        ),
      }),
      interaction.turnId,
      interaction.anchorRawTraceId,
      interaction.toolCallId,
    );
    if (interaction.status === ToolInteractionStatus.PENDING) return [request];
    const result = this.withRecoveryProvenance(
      new Message(MessageRole.USER, {
        content: clampRenderedLine(
          `Recovered tool result from ${toolName}: ${formatToCleanString(interaction.error ?? interaction.result)}`,
          maxItemChars,
        ),
      }),
      interaction.turnId,
      interaction.terminalRawTraceId,
      interaction.toolCallId,
    );
    return [request, result];
  }

  private projectNonToolTrace(trace: RawTraceItem, maxItemChars?: number | null): Message | null {
    if (trace.traceType === 'user') {
      return this.withRecoveryProvenance(new Message(MessageRole.USER, {
        content: clampRenderedLine(trace.content, maxItemChars),
        image_urls: trace.media?.images ?? [],
        audio_urls: trace.media?.audio ?? [],
        video_urls: trace.media?.video ?? [],
      }), trace.turnId, trace.id, null);
    }
    if (trace.traceType === 'assistant') {
      return this.withRecoveryProvenance(
        new Message(MessageRole.ASSISTANT, { content: clampRenderedLine(trace.content, maxItemChars) }),
        trace.turnId,
        trace.id,
        null,
      );
    }
    return null;
  }

  private withRecoveryProvenance(
    message: Message,
    turnId: string | null,
    rawTraceId: string | null,
    toolCallId: string | null,
  ): Message {
    return setMessageProvenance(message, {
      sourceKind: 'recovery',
      turnId,
      rawTraceIds: rawTraceId ? [rawTraceId] : undefined,
      toolCallIds: toolCallId ? [toolCallId] : undefined,
    });
  }
}
