import { describe, it, expect } from 'vitest';
import { MistralPromptRenderer } from '../../../../src/llm/prompt-renderers/mistral-prompt-renderer.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload
} from '../../../../src/llm/utils/messages.js';

describe('MistralPromptRenderer', () => {
  it('renders basic messages', async () => {
    const renderer = new MistralPromptRenderer();
    const messages = [
      new Message(MessageRole.SYSTEM, 'System'),
      new Message(MessageRole.USER, 'Hello')
    ];

    const rendered = await renderer.render(messages);
    expect(rendered).toEqual([
      { role: 'system', content: 'System' },
      { role: 'user', content: 'Hello' }
    ]);
  });

  it('renders tool payloads as native Mistral tool messages', async () => {
    const renderer = new MistralPromptRenderer();
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
      {
        role: 'assistant',
        content: '',
        tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'search', arguments: JSON.stringify({ query: 'autobyteus' }) } }]
      },
      { role: 'tool', name: 'search', content: JSON.stringify({ status: 'ok' }), tool_call_id: 'call_1' }
    ]);
    expect(JSON.stringify(rendered)).not.toContain('[TOOL_');
  });
});
