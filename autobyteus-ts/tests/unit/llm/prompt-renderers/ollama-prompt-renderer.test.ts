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

  it('renders tool payloads as text', async () => {
    const renderer = new OllamaPromptRenderer();
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
      { role: 'assistant', content: "[TOOL_CALL] search {'query': 'autobyteus'}" },
      { role: 'user', content: "[TOOL_RESULT] search {'status': 'ok'}" }
    ]);
  });
});
