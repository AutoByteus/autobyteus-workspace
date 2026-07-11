import type { InteractionBlock } from './interaction-block.js';
import { CompactionResult } from './compaction-result.js';
import type { CompactionAgentExecutionMetadata } from './compaction-agent-runner.js';
import { RawTraceItem } from '../models/raw-trace-item.js';
import type { WorkingContextMessageUnit } from './working-context-message-unit.js';
import { ToolCallPayload, ToolResultPayload } from '../../llm/utils/messages.js';

export abstract class Summarizer {
  abstract summarize(blocks: InteractionBlock[]): Promise<CompactionResult>;

  summarizeMessageUnits(units: WorkingContextMessageUnit[]): Promise<CompactionResult> {
    return this.summarize(units.map((unit, index) => ({
      blockId: `message_unit_${index + 1}`,
      turnId: null,
      traceIds: [],
      traces: unit.messages.flatMap((message, messageIndex) =>
        this.buildFallbackTracesForMessage(message, index, messageIndex)
      ),
      openingTraceId: null,
      closingTraceId: null,
      blockKind: 'recovery',
      hasAssistantTrace: unit.messages.some((message) => message.role === 'assistant'),
      toolCallIds: [],
      matchedToolCallIds: [],
      hasMalformedToolTrace: false,
      isStructurallyComplete: true,
      toolResultDigests: [],
    })));
  }

  getLastCompactionExecutionMetadata(): CompactionAgentExecutionMetadata | null {
    return null;
  }

  private buildFallbackTracesForMessage(
    message: WorkingContextMessageUnit['messages'][number],
    unitIndex: number,
    messageIndex: number,
  ): RawTraceItem[] {
    const base = {
      ts: Date.now() / 1000,
      turnId: 'working_context',
      sourceEvent: 'WorkingContextMessageUnit',
    };
    const tracePrefix = `message_unit_${unitIndex + 1}_${messageIndex + 1}`;

    if (message.tool_payload instanceof ToolCallPayload) {
      const traces: RawTraceItem[] = [];
      const assistantEnvelope = [message.reasoning_content, message.content]
        .filter((part): part is string => Boolean(part?.trim()))
        .join('\n');
      if (assistantEnvelope) {
        traces.push(new RawTraceItem({
          ...base,
          id: `${tracePrefix}_assistant`,
          seq: traces.length + 1,
          traceType: 'assistant',
          content: assistantEnvelope,
        }));
      }
      message.tool_payload.toolCalls.forEach((call) => {
        traces.push(new RawTraceItem({
          ...base,
          id: `${tracePrefix}_${call.id}`,
          seq: traces.length + 1,
          traceType: 'tool_call',
          content: '',
          toolName: call.name,
          toolCallId: call.id,
          toolArgs: call.arguments,
        }));
      });
      return traces;
    }

    if (message.tool_payload instanceof ToolResultPayload) {
      return [new RawTraceItem({
        ...base,
        id: tracePrefix,
        seq: 1,
        traceType: 'tool_result',
        content: message.content ?? '',
        toolCallId: message.tool_payload.toolCallId,
        toolResult: message.tool_payload.toolResult,
        toolError: message.tool_payload.toolError,
      })];
    }
    return [new RawTraceItem({
      ...base,
      id: tracePrefix,
      seq: 1,
      traceType: message.role,
      content: message.content ?? '',
    })];
  }
}
