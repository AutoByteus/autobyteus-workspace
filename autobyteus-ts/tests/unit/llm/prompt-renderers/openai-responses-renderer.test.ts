import { describe, it, expect } from 'vitest';
import { OpenAIResponsesRenderer } from '../../../../src/llm/prompt-renderers/openai-responses-renderer.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload
} from '../../../../src/llm/utils/messages.js';

describe('OpenAIResponsesRenderer', () => {
  it('renders basic messages', async () => {
    const renderer = new OpenAIResponsesRenderer();
    const messages = [new Message(MessageRole.USER, 'Hello')];

    const rendered = await renderer.render(messages);

    expect(rendered).toEqual([
      {
        type: 'message',
        role: 'user',
        content: 'Hello'
      }
    ]);
  });

  it('renders tool call payloads as message content', async () => {
    const renderer = new OpenAIResponsesRenderer();
    const toolPayload = new ToolCallPayload([
      { id: 'call_1', name: 'list_directory', arguments: { path: 'src' } }
    ]);
    const messages = [new Message(MessageRole.ASSISTANT, { tool_payload: toolPayload })];

    const rendered = await renderer.render(messages);

    expect(rendered).toEqual([
      {
        type: 'message',
        role: 'assistant',
        content: `[TOOL_CALL] list_directory ${JSON.stringify({ path: 'src' })}`
      }
    ]);
  });

  it('renders tool result payloads as user content', async () => {
    const renderer = new OpenAIResponsesRenderer();
    const toolPayload = new ToolResultPayload('call_1', 'list_directory', ['app.py']);
    const messages = [new Message(MessageRole.TOOL, { tool_payload: toolPayload })];

    const rendered = await renderer.render(messages);

    expect(rendered).toEqual([
      {
        type: 'message',
        role: 'user',
        content: `[TOOL_RESULT] list_directory ${JSON.stringify(['app.py'])}`
      }
    ]);
  });

  it('degrades user audio input in responses renderer and keeps text content', async () => {
    const renderer = new OpenAIResponsesRenderer();
    const messages = [
      new Message(MessageRole.USER, {
        content: 'please transcribe',
        audio_urls: ['data:audio/wav;base64,ZmFrZQ==']
      })
    ];

    const rendered = await renderer.render(messages);

    expect(rendered).toEqual([
      {
        type: 'message',
        role: 'user',
        content: [
          { type: 'input_text', text: 'please transcribe' }
        ]
      }
    ]);
  });
});
