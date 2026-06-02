import { Message, MessageRole } from '../../llm/utils/messages.js';
import { formatToCleanString } from '../../utils/llm-output-formatter.js';
import { clampRenderedLine } from '../compaction-snapshot-recent-turn-formatter.js';
import { setMessageProvenance } from '../message-provenance.js';
import type { RawTraceItem } from '../models/raw-trace-item.js';

export class WorkingContextRecoveryProjector {
  project(rawTraces: RawTraceItem[], maxItemChars?: number | null): Message[] {
    return rawTraces
      .slice(-12)
      .map((trace) => this.projectTrace(trace, maxItemChars))
      .filter((message): message is Message => message !== null);
  }

  private projectTrace(trace: RawTraceItem, maxItemChars?: number | null): Message | null {
    if (trace.traceType === 'user') {
      return this.withRecoveryProvenance(
        new Message(MessageRole.USER, {
          content: clampRenderedLine(trace.content, maxItemChars),
          image_urls: trace.media?.images ?? [],
          audio_urls: trace.media?.audio ?? [],
          video_urls: trace.media?.video ?? [],
        }),
        trace,
      );
    }

    if (trace.traceType === 'assistant') {
      return this.withRecoveryProvenance(
        new Message(MessageRole.ASSISTANT, { content: clampRenderedLine(trace.content, maxItemChars) }),
        trace,
      );
    }

    if (trace.traceType === 'tool_call' && trace.toolCallId && trace.toolName) {
      return this.withRecoveryProvenance(
        new Message(MessageRole.ASSISTANT, {
          content: clampRenderedLine(
            `I requested tool ${trace.toolName} with arguments ${formatToCleanString(trace.toolArgs ?? {})}.`,
            maxItemChars,
          ),
        }),
        trace,
      );
    }

    if (trace.traceType === 'tool_result' && trace.toolCallId && trace.toolName) {
      return this.withRecoveryProvenance(
        new Message(MessageRole.USER, {
          content: clampRenderedLine(
            `Recovered tool result from ${trace.toolName}: ${formatToCleanString(trace.toolError ?? trace.toolResult ?? trace.content)}`,
            maxItemChars,
          ),
        }),
        trace,
      );
    }

    return null;
  }

  private withRecoveryProvenance(message: Message, trace: RawTraceItem): Message {
    return setMessageProvenance(message, {
      sourceKind: 'recovery',
      turnId: trace.turnId,
      rawTraceIds: [trace.id],
      toolCallIds: trace.toolCallId ? [trace.toolCallId] : undefined,
    });
  }
}
