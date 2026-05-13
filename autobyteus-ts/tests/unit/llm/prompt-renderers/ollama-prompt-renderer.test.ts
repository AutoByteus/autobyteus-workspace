import { describe, it, expect } from 'vitest';
import { OllamaPromptRenderer } from '../../../../src/llm/prompt-renderers/ollama-prompt-renderer.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload
} from '../../../../src/llm/utils/messages.js';

describe('OllamaPromptRenderer', () => {
  it('renders basic messages', async () => {
    const renderer = new OllamaPromptRenderer();
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

  it('renders tool payloads as native Ollama tool messages', async () => {
    const renderer = new OllamaPromptRenderer();
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
        tool_calls: [{ id: 'call_1', type: 'function', function: { index: 0, name: 'search', arguments: { query: 'autobyteus' } } }]
      },
      { role: 'tool', tool_name: 'search', content: JSON.stringify({ status: 'ok' }) }
    ]);
    expect(JSON.stringify(rendered)).not.toContain('[TOOL_');
  });
});
