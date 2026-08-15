import {
  type Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
} from '../../llm/utils/messages.js';
import { CondensedToolCallRenderer } from '../presentation/condensed-tool-call-renderer.js';
import { ReadableValueRenderer } from '../presentation/readable-value-renderer.js';
import { WorkingContextFinalizer } from '../working-context-finalizer.js';
import type { WorkingContextMessageUnit } from './working-context-message-unit.js';

const escapeReservedBoundary = (value: string): string =>
  value
    .replaceAll(
      '<target_agent_conversation_history>',
      '&lt;target_agent_conversation_history&gt;',
    )
    .replaceAll(
      '</target_agent_conversation_history>',
      '&lt;/target_agent_conversation_history&gt;',
    );

export class CompactionConversationHistoryRenderer {
  constructor(
    private readonly valueRenderer = new ReadableValueRenderer(),
    private readonly toolRenderer = new CondensedToolCallRenderer(valueRenderer),
    private readonly finalizer = new WorkingContextFinalizer(),
  ) {}

  render(units: readonly WorkingContextMessageUnit[], maxValueChars: number | null): string {
    const messages = this.finalizer.finalize({
      messages: units
        .flatMap((unit) => unit.messages)
        .filter((message) => message.role !== MessageRole.SYSTEM),
    }).buildMessages();
    const entries: string[] = [];
    for (let index = 0; index < messages.length; index += 1) {
      const message = messages[index]!;
      if (message.tool_payload instanceof ToolCallPayload) {
        const rendered = this.renderToolProtocol(messages, index, maxValueChars);
        entries.push(...rendered.entries);
        index = rendered.endIndex;
        continue;
      }
      if (message.tool_payload) {
        throw new Error('Tool payloads must be rendered from complete tool protocol units.');
      }
      if (message.role !== MessageRole.USER && message.role !== MessageRole.ASSISTANT) {
        throw new Error(`Unsupported compaction conversation role '${message.role}'.`);
      }
      if (!message.content?.trim()) continue;
      const content = escapeReservedBoundary(this.valueRenderer.render(message.content, {
        maxChars: maxValueChars,
      }));
      entries.push(`${message.role === MessageRole.USER ? 'User' : 'Assistant'}:\n${content}`);
    }
    if (!entries.length) throw new Error('Compaction conversation history is empty.');
    return [
      '<target_agent_conversation_history>',
      entries.join('\n\n'),
      '</target_agent_conversation_history>',
    ].join('\n');
  }

  private renderToolProtocol(
    messages: readonly Message[],
    startIndex: number,
    maxValueChars: number | null,
  ): { entries: string[]; endIndex: number } {
    const assistant = messages[startIndex]!;
    const payload = assistant.tool_payload as ToolCallPayload;
    const expectedIds = new Set(payload.toolCalls.map(({ id }) => id));
    const results = new Map<string, ToolResultPayload>();
    let endIndex = startIndex;
    for (let index = startIndex + 1; index < messages.length; index += 1) {
      const message = messages[index]!;
      if (!(message.tool_payload instanceof ToolResultPayload)) break;
      const result = message.tool_payload;
      if (!expectedIds.has(result.toolCallId)) {
        throw new Error(`Tool protocol has unexpected result '${result.toolCallId}'.`);
      }
      if (results.has(result.toolCallId)) {
        throw new Error(`Tool protocol has duplicate result '${result.toolCallId}'.`);
      }
      results.set(result.toolCallId, result);
      endIndex = index;
    }
    const entries: string[] = [];
    if (assistant.content?.trim()) {
      entries.push(`Assistant:\n${escapeReservedBoundary(
        this.valueRenderer.render(assistant.content, { maxChars: maxValueChars }),
      )}`);
    }
    for (const call of payload.toolCalls) {
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
    return { entries, endIndex };
  }
}
