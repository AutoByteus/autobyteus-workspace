import { describe, it, expect } from 'vitest';
import { GeminiPromptRenderer } from '../../../../src/llm/prompt-renderers/gemini-prompt-renderer.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload
} from '../../../../src/llm/utils/messages.js';

describe('GeminiPromptRenderer', () => {
  it('renders basic messages', async () => {
    const renderer = new GeminiPromptRenderer();
    const messages = [
      new Message(MessageRole.SYSTEM, 'System'),
      new Message(MessageRole.USER, 'Hello'),
      new Message(MessageRole.ASSISTANT, 'Hi')
    ];

    const rendered = await renderer.render(messages);
    expect(rendered).toEqual([
      { role: 'user', parts: [{ text: 'Hello' }] },
      { role: 'model', parts: [{ text: 'Hi' }] }
    ]);
  });

  it('renders tool payloads as text', async () => {
    const renderer = new GeminiPromptRenderer();
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
      { role: 'model', parts: [{ text: "[TOOL_CALL] search {'query': 'autobyteus'}" }] },
      { role: 'user', parts: [{ text: "[TOOL_RESULT] search {'status': 'ok'}" }] }
    ]);
  });
});
