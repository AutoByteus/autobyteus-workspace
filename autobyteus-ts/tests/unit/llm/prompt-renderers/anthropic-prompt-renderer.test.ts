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
      { role: 'user', content: 'System' },
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' }
    ]);
  });

  it('renders tool payloads as native tool_use/tool_result blocks', async () => {
    const renderer = new AnthropicPromptRenderer();
    const messages = [
      new Message(MessageRole.ASSISTANT, {
        content: null,
        tool_payload: new ToolCallPayload([{ id: 'call_1', name: 'search', arguments: { query: 'autobyteus' } }])
      }),
      new Message(MessageRole.TOOL, {
        tool_payload: new ToolResultPayload('call_1', 'search', { status: 'ok' })
      })
    ];

    const rendered = await renderer.render(messages);
    expect(rendered).toEqual([
      { role: 'assistant', content: [{ type: 'tool_use', id: 'call_1', name: 'search', input: { query: 'autobyteus' } }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'call_1', content: JSON.stringify({ status: 'ok' }) }] }
    ]);
    expect(JSON.stringify(rendered)).not.toContain('[TOOL_');
  });
});
