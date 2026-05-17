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

  it('renders tool call payloads as function_call items', async () => {
    const renderer = new OpenAIResponsesRenderer();
    const toolPayload = new ToolCallPayload([
      { id: 'call_1', name: 'list_directory', arguments: { path: 'src' } }
    ]);
    const messages = [new Message(MessageRole.ASSISTANT, { tool_payload: toolPayload })];

    const rendered = await renderer.render(messages);

    expect(rendered).toEqual([
      {
        type: 'function_call',
        id: 'call_1',
        call_id: 'call_1',
        name: 'list_directory',
        arguments: JSON.stringify({ path: 'src' }),
        status: 'completed'
      }
    ]);
    expect(JSON.stringify(rendered)).not.toContain('[TOOL_');
  });

  it('replays captured reasoning before matching function calls and normalizes final arguments', async () => {
    const renderer = new OpenAIResponsesRenderer();
    const responseOutputItems = [
      {
        type: 'reasoning',
        id: 'rs_1',
        status: 'completed',
        summary: [{ type: 'summary_text', text: 'need directory listing' }],
        encrypted_content: 'encrypted-reasoning',
        provider_future_field: { keep: true }
      },
      {
        type: 'function_call',
        id: 'fc_1',
        call_id: 'call_1',
        name: 'list_directory',
        arguments: '{"path":"STALE"}',
        status: 'completed',
        provider_future_field: 'preserve-me'
      }
    ];
    const toolPayload = new ToolCallPayload([
      {
        id: 'call_1',
        name: 'list_directory',
        arguments: { path: 'src' },
        nativeToolCallContext: {
          provider: 'openai_responses',
          responseOutputItems
        }
      }
    ]);
    const messages = [
      new Message(MessageRole.ASSISTANT, { tool_payload: toolPayload }),
      new Message(MessageRole.TOOL, {
        tool_payload: new ToolResultPayload('call_1', 'list_directory', ['index.ts'])
      })
    ];

    const rendered = await renderer.render(messages);

    expect(rendered).toEqual([
      responseOutputItems[0],
      {
        type: 'function_call',
        id: 'fc_1',
        call_id: 'call_1',
        name: 'list_directory',
        arguments: JSON.stringify({ path: 'src' }),
        status: 'completed',
        provider_future_field: 'preserve-me'
      },
      {
        type: 'function_call_output',
        call_id: 'call_1',
        output: JSON.stringify(['index.ts'])
      }
    ]);
    expect(rendered[0]).not.toBe(responseOutputItems[0]);
    expect(rendered[1]).not.toBe(responseOutputItems[1]);
    expect(responseOutputItems[1].arguments).toBe('{"path":"STALE"}');
  });

  it('replays a shared captured OpenAI output sequence once for multi-tool calls', async () => {
    const renderer = new OpenAIResponsesRenderer();
    const sharedResponseOutputItems = [
      {
        type: 'reasoning',
        id: 'rs_shared',
        summary: [{ type: 'summary_text', text: 'need two tools' }],
        encrypted_content: 'encrypted-reasoning'
      },
      {
        type: 'function_call',
        id: 'fc_a',
        call_id: 'call_a',
        name: 'get_weather',
        arguments: '{"city":"STALE"}',
        status: 'completed'
      },
      {
        type: 'function_call',
        id: 'fc_b',
        call_id: 'call_b',
        name: 'get_time',
        arguments: '{"city":"STALE"}',
        status: 'completed'
      }
    ];
    const messages = [
      new Message(MessageRole.ASSISTANT, {
        tool_payload: new ToolCallPayload([
          {
            id: 'call_a',
            name: 'get_weather',
            arguments: { city: 'Berlin', unit: 'celsius' },
            nativeToolCallContext: {
              provider: 'openai_responses',
              responseOutputItems: sharedResponseOutputItems
            }
          },
          {
            id: 'call_b',
            name: 'get_time',
            arguments: { city: 'Berlin' },
            nativeToolCallContext: {
              provider: 'openai_responses',
              responseOutputItems: sharedResponseOutputItems
            }
          }
        ])
      }),
      new Message(MessageRole.TOOL, {
        tool_payload: new ToolResultPayload('call_b', 'get_time', { local_time: '10:00' })
      }),
      new Message(MessageRole.TOOL, {
        tool_payload: new ToolResultPayload('call_a', 'get_weather', { temp_c: 21 })
      })
    ];

    const rendered = await renderer.render(messages);
    const reasoningItems = rendered.filter((item) => item.type === 'reasoning');
    const functionCalls = rendered.filter((item) => item.type === 'function_call');
    const outputs = rendered.filter((item) => item.type === 'function_call_output');

    expect(reasoningItems).toHaveLength(1);
    expect(functionCalls.map((item) => item.call_id)).toEqual(['call_a', 'call_b']);
    expect(functionCalls.map((item) => item.id)).toEqual(['fc_a', 'fc_b']);
    expect(functionCalls.map((item) => JSON.parse(item.arguments).city)).toEqual(['Berlin', 'Berlin']);
    expect(outputs.map((item) => item.call_id)).toEqual(['call_a', 'call_b']);
  });

  it('renders tool result payloads as function_call_output items', async () => {
    const renderer = new OpenAIResponsesRenderer();
    const toolPayload = new ToolResultPayload('call_1', 'list_directory', ['app.py']);
    const messages = [new Message(MessageRole.TOOL, { tool_payload: toolPayload })];

    const rendered = await renderer.render(messages);

    expect(rendered).toEqual([
      {
        type: 'function_call_output',
        call_id: 'call_1',
        output: JSON.stringify(['app.py'])
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
