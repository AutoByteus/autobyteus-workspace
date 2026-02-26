import { describe, it, expect } from 'vitest';
import { WorkingContextSnapshot } from '../../../src/memory/working-context-snapshot.js';
import { Message, MessageRole, ToolCallSpec } from '../../../src/llm/utils/messages.js';

describe('WorkingContextSnapshot', () => {
  it('appends messages and tool payloads', () => {
    const snapshot = new WorkingContextSnapshot();
    snapshot.appendUser('hello');
    snapshot.appendAssistant('hi', 'reason');
    const toolCalls: ToolCallSpec[] = [
      { id: 'call-1', name: 'tool', arguments: { a: 1 } }
    ];
    snapshot.appendToolCalls(toolCalls);
    snapshot.appendToolResult('call-1', 'tool', { ok: true });

    const messages = snapshot.buildMessages();
    expect(messages).toHaveLength(4);
    expect(messages[0].role).toBe(MessageRole.USER);
    expect(messages[1].role).toBe(MessageRole.ASSISTANT);
    expect(messages[2].role).toBe(MessageRole.ASSISTANT);
    expect(messages[3].role).toBe(MessageRole.TOOL);
  });

  it('resets with snapshot and increments epoch', () => {
    const snapshot = new WorkingContextSnapshot([new Message(MessageRole.SYSTEM, { content: 'sys' })]);
    const startingEpoch = snapshot.epochId;
    snapshot.reset([new Message(MessageRole.SYSTEM, { content: 'snapshot' })]);
    expect(snapshot.epochId).toBe(startingEpoch + 1);
    const messages = snapshot.buildMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('snapshot');
  });
});
