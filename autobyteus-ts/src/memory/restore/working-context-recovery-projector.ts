import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
} from '../../llm/utils/messages.js';
import {
  buildSingleMessageProvenance,
  setWorkingContextMessageProvenance,
} from '../working-context-provenance.js';
import { createNaturalUserMessageProvenance } from '../working-context-finalizer.js';
import type { RawTraceItem } from '../models/raw-trace-item.js';
import { createToolCallIdentity, toolCallIdentityKey } from '../models/tool-call-identity.js';
import { ToolInteractionStatus, type ToolInteraction } from '../models/tool-interaction.js';
import { buildToolInteractions } from '../tool-interaction-builder.js';

const TRUSTED_INTERRUPTION_BOUNDARY_TRACE_TYPE = 'operation_boundary';
const TRUSTED_INTERRUPTION_BOUNDARY_SOURCE_EVENT = 'AgentTurnInterruptedEvent';

export class WorkingContextRecoveryProjector {
  project(rawTraces: RawTraceItem[], _maxItemChars?: number | null): Message[] {
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
        if (interaction) messages.push(...this.projectInteraction(interaction));
        continue;
      }
      const message = this.projectNonToolTrace(trace);
      if (message) messages.push(message);
    }
    return messages;
  }

  private projectInteraction(interaction: ToolInteraction): Message[] {
    const toolName = interaction.toolName ?? 'unknown_tool';
    const request = this.withRecoveryProvenance(
      new Message(MessageRole.ASSISTANT, {
        tool_payload: new ToolCallPayload([{
          id: interaction.toolCallId,
          name: toolName,
          arguments: interaction.arguments ?? {},
        }]),
      }),
      interaction.turnId,
      interaction.anchorRawTraceId,
    );
    if (interaction.status === ToolInteractionStatus.PENDING) return [request];
    const result = this.withRecoveryProvenance(
      new Message(MessageRole.TOOL, {
        tool_payload: new ToolResultPayload(
          interaction.toolCallId,
          toolName,
          interaction.result,
          interaction.error ?? null,
        ),
      }),
      interaction.turnId,
      interaction.terminalRawTraceId,
    );
    return [request, result];
  }

  private projectNonToolTrace(trace: RawTraceItem): Message | null {
    if (trace.traceType === 'user') {
      return this.withRecoveryProvenance(new Message(MessageRole.USER, {
        content: trace.content,
        image_urls: trace.media?.images ?? [],
        audio_urls: trace.media?.audio ?? [],
        video_urls: trace.media?.video ?? [],
      }), trace.turnId, trace.id);
    }
    if (trace.traceType === 'assistant') {
      return this.withRecoveryProvenance(
        new Message(MessageRole.ASSISTANT, { content: trace.content }),
        trace.turnId,
        trace.id,
      );
    }
    if (
      trace.traceType === TRUSTED_INTERRUPTION_BOUNDARY_TRACE_TYPE
      && trace.sourceEvent === TRUSTED_INTERRUPTION_BOUNDARY_SOURCE_EVENT
      && trace.content.trim()
    ) {
      return this.withRecoveryProvenance(
        new Message(MessageRole.SYSTEM, { content: trace.content }),
        trace.turnId,
        trace.id,
      );
    }
    return null;
  }

  private withRecoveryProvenance(
    message: Message,
    turnId: string | null,
    rawTraceId: string | null,
  ): Message {
    if (message.role === MessageRole.USER) {
      return createNaturalUserMessageProvenance(message, {
        kind: 'retained_user',
        turnId,
        rawTraceIds: rawTraceId ? [rawTraceId] : [],
      });
    }
    return setWorkingContextMessageProvenance(
      message,
      buildSingleMessageProvenance(rawTraceId ? [rawTraceId] : [], turnId),
    );
  }
}
