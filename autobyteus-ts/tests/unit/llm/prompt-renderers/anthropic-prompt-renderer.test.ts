import { describe, it, expect } from 'vitest';
import { AnthropicPromptRenderer } from '../../../../src/llm/prompt-renderers/anthropic-prompt-renderer.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload
} from '../../../../src/llm/utils/messages.js';

describe('AnthropicPromptRenderer', () => {
  it('renders basic messages', async () => {
    const renderer = new AnthropicPromptRenderer();
    const messages = [
      new Message(MessageRole.SYSTEM, 'System'),
      new Message(MessageRole.USER, 'Hello'),
      new Message(MessageRole.ASSISTANT, 'Hi')
    ];

    const rendered = await renderer.render(messages);
    expect(rendered).toEqual([
      { role: 'system', content: 'System' },
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' }
    ]);
  });

  it('degrades tool payloads to text', async () => {
    const renderer = new AnthropicPromptRenderer();
    const toolArgs = { query: 'autobyteus' };
    const toolResult = { status: 'ok' };
    const messages = [
      new Message(MessageRole.ASSISTANT, {
        content: null,
        tool_payload: new ToolCallPayload([{ id: 'call_1', name: 'search', arguments: toolArgs }])
      }),
      new Message(MessageRole.TOOL, {
        tool_payload: new ToolResultPayload('call_1', 'search', toolResult)
      })
    ];

    const rendered = await renderer.render(messages);
    expect(rendered).toEqual([
      { role: 'assistant', content: '[TOOL_CALL] search {"query": "autobyteus"}' },
      { role: 'user', content: '[TOOL_RESULT] search {"status": "ok"}' }
    ]);
  });
});
