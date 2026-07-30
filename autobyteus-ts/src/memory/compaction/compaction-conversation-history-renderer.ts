import {
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
} from '../../llm/utils/messages.js';
import { CondensedToolCallRenderer } from '../presentation/condensed-tool-call-renderer.js';
import { ReadableValueRenderer } from '../presentation/readable-value-renderer.js';
import type {
  ToolProtocolMessageUnit,
  WorkingContextMessageUnit,
} from './working-context-message-unit.js';

const escapeReservedBoundary = (value: string): string =>
  value
    .replaceAll('<conversation_history>', '&lt;conversation_history&gt;')
    .replaceAll('</conversation_history>', '&lt;/conversation_history&gt;');

export class CompactionConversationHistoryRenderer {
  constructor(
    private readonly valueRenderer = new ReadableValueRenderer(),
    private readonly toolRenderer = new CondensedToolCallRenderer(valueRenderer),
  ) {}

  render(units: readonly WorkingContextMessageUnit[], maxValueChars: number | null): string {
    const entries = units.flatMap((unit) =>
      unit.kind === 'tool_protocol_group'
        ? this.renderToolGroup(unit, maxValueChars)
        : unit.messages.flatMap((message) => {
            if (message.role === MessageRole.SYSTEM) return [];
            if (message.tool_payload) {
              throw new Error('Tool payloads must be rendered from complete tool protocol units.');
            }
            if (message.role !== MessageRole.USER && message.role !== MessageRole.ASSISTANT) {
              throw new Error(`Unsupported compaction conversation role '${message.role}'.`);
            }
            if (!message.content?.trim()) return [];
            const content = escapeReservedBoundary(this.valueRenderer.render(message.content, {
              maxChars: maxValueChars,
            }));
            return [`${message.role === MessageRole.USER ? 'User' : 'Assistant'}:\n${content}`];
          }));
    if (!entries.length) throw new Error('Compaction conversation history is empty.');
    return `<conversation_history>\n${entries.join('\n\n')}\n</conversation_history>`;
  }

  private renderToolGroup(
    unit: ToolProtocolMessageUnit,
    maxValueChars: number | null,
  ): string[] {
    if (!unit.isComplete) {
      throw new Error('Incomplete tool protocol cannot enter compaction conversation history.');
    }
    const assistant = unit.messages.find((message) => message.tool_payload instanceof ToolCallPayload);
    if (!assistant || !(assistant.tool_payload instanceof ToolCallPayload)) {
      throw new Error('Tool protocol unit has no assistant tool-call payload.');
    }
    const results = new Map<string, ToolResultPayload>();
    for (const message of unit.messages) {
      if (!(message.tool_payload instanceof ToolResultPayload)) continue;
      if (results.has(message.tool_payload.toolCallId)) {
        throw new Error(`Tool protocol has duplicate result '${message.tool_payload.toolCallId}'.`);
      }
      results.set(message.tool_payload.toolCallId, message.tool_payload);
    }
    const entries: string[] = [];
    if (assistant.content?.trim()) {
      entries.push(`Assistant:\n${escapeReservedBoundary(
        this.valueRenderer.render(assistant.content, { maxChars: maxValueChars }),
      )}`);
    }
    for (const call of assistant.tool_payload.toolCalls) {
      const result = results.get(call.id);
      if (!result) throw new Error(`Tool call '${call.id}' has no terminal result.`);
      const body = this.toolRenderer.render({
        name: call.name,
        arguments: call.arguments,
        outcome: result.toolError !== null
          ? { kind: 'error', value: result.toolError }
          : { kind: 'result', value: result.toolResult },
      }, { maxValueChars });
      entries.push(`Tool:\n${escapeReservedBoundary(body)}`);
    }
    return entries;
  }
}
