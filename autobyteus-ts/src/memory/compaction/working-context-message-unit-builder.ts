import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
} from '../../llm/utils/messages.js';
import {
  getMessageRawTraceIds,
  getWorkingContextMessageProvenance,
  setWorkingContextMessageProvenance,
} from '../working-context-provenance.js';
import {
  createCompactedMemoryUserMessage,
  createNaturalUserMessageProvenance,
} from '../working-context-finalizer.js';
import { WorkingContext } from '../working-context.js';
import type {
  WorkingContextMessageUnit,
  ToolProtocolMessageUnit,
} from './working-context-message-unit.js';

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

      units.push(...this.buildSingleMessageUnits(message, index));
      index += 1;
    }

    return units;
  }

  private buildSingleMessageUnits(message: Message, index: number): WorkingContextMessageUnit[] {
    const provenance = getWorkingContextMessageProvenance(message);
    if (message.role === MessageRole.USER && provenance?.kind === 'composed_user') {
      return provenance.constituents.map((constituent, constituentIndex) => {
        const content = constituent.textRange
          ? (message.content ?? '').slice(constituent.textRange.start, constituent.textRange.end)
          : null;
        const unitMessage = constituent.kind === 'compacted_memory'
          ? createCompactedMemoryUserMessage(content ?? '')
          : createNaturalUserMessageProvenance(new Message(MessageRole.USER, {
              content,
              image_urls: message.image_urls.slice(
                constituent.imageRange.start,
                constituent.imageRange.end,
              ),
              audio_urls: message.audio_urls.slice(
                constituent.audioRange.start,
                constituent.audioRange.end,
              ),
              video_urls: message.video_urls.slice(
                constituent.videoRange.start,
                constituent.videoRange.end,
              ),
            }), {
              kind: constituent.kind,
              rawTraceIds: constituent.rawTraceIds,
              turnId: constituent.turnId,
            });
        return {
          id: `unit_${index}_${constituentIndex}`,
          kind: constituent.kind === 'compacted_memory' ? 'compacted_memory' : 'message',
          startIndex: index,
          endIndex: index,
          messages: [unitMessage],
          rawTraceIds: constituent.kind === 'compacted_memory' ? [] : [...constituent.rawTraceIds],
        } as WorkingContextMessageUnit;
      });
    }
    const kind = message.role === MessageRole.SYSTEM ? 'system' : 'message';
    const copied = new WorkingContext([message]).buildMessages()[0]!;
    if (provenance) setWorkingContextMessageProvenance(copied, provenance);
    return [{
      id: `unit_${index}`,
      kind,
      startIndex: index,
      endIndex: index,
      messages: [copied],
      rawTraceIds: getMessageRawTraceIds(message),
    } as WorkingContextMessageUnit];
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
