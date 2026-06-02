import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
} from '../../llm/utils/messages.js';
import { getMessageProvenance, getMessageRawTraceIds } from '../message-provenance.js';
import type {
  WorkingContextMessageUnit,
  ToolProtocolMessageUnit,
} from './working-context-message-unit.js';

const COMPACTED_MEMORY_PREFIX = 'You are continuing an ongoing task after compacting earlier working memory.';

export class WorkingContextMessageUnitBuilder {
  build(messages: Message[]): WorkingContextMessageUnit[] {
    const units: WorkingContextMessageUnit[] = [];
    let index = 0;

    while (index < messages.length) {
      const message = messages[index];
      if (!message) {
        index += 1;
        continue;
      }

      if (message.tool_payload instanceof ToolCallPayload) {
        const unit = this.buildToolProtocolUnit(messages, index);
        units.push(unit);
        index = unit.endIndex + 1;
        continue;
      }

      units.push(this.buildSingleMessageUnit(message, index));
      index += 1;
    }

    return units;
  }

  private buildSingleMessageUnit(message: Message, index: number): WorkingContextMessageUnit {
    const provenance = getMessageProvenance(message);
    const kind = message.role === MessageRole.SYSTEM
      ? 'system'
      : provenance?.sourceKind === 'compacted_memory' ||
          message.content?.startsWith(COMPACTED_MEMORY_PREFIX)
        ? 'compacted_memory'
        : 'message';

    return {
      id: `unit_${index}`,
      kind,
      startIndex: index,
      endIndex: index,
      messages: [message],
      rawTraceIds: getMessageRawTraceIds(message),
    } as WorkingContextMessageUnit;
  }

  private buildToolProtocolUnit(messages: Message[], startIndex: number): ToolProtocolMessageUnit {
    const assistantMessage = messages[startIndex];
    const payload = assistantMessage.tool_payload as ToolCallPayload;
    const toolCallIds = payload.toolCalls.map((call) => call.id);
    const expectedIds = new Set(toolCallIds);
    const matchedToolCallIds: string[] = [];
    const unitMessages = [assistantMessage];
    let endIndex = startIndex;

    for (let index = startIndex + 1; index < messages.length; index += 1) {
      const candidate = messages[index];
      if (!(candidate?.tool_payload instanceof ToolResultPayload)) {
        break;
      }
      const resultPayload = candidate.tool_payload;
      if (!expectedIds.has(resultPayload.toolCallId)) {
        break;
      }
      unitMessages.push(candidate);
      matchedToolCallIds.push(resultPayload.toolCallId);
      endIndex = index;
      if (new Set(matchedToolCallIds).size >= expectedIds.size) {
        break;
      }
    }

    return {
      id: `unit_${startIndex}_${endIndex}`,
      kind: 'tool_protocol_group',
      startIndex,
      endIndex,
      messages: unitMessages,
      rawTraceIds: unitMessages.flatMap((message) => getMessageRawTraceIds(message)),
      toolCallIds,
      matchedToolCallIds: [...new Set(matchedToolCallIds)],
      isComplete: toolCallIds.every((id) => matchedToolCallIds.includes(id)),
    };
  }
}
