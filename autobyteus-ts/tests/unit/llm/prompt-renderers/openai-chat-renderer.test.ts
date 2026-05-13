import { describe, it, expect } from 'vitest';
import { OpenAIChatRenderer } from '../../../../src/llm/prompt-renderers/openai-chat-renderer.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload
} from '../../../../src/llm/utils/messages.js';

describe('OpenAIChatRenderer', () => {
  it('renders basic messages', async () => {
    const renderer = new OpenAIChatRenderer();
    const messages = [new Message(MessageRole.USER, 'Hello')];

    const rendered = await renderer.render(messages);

    expect(rendered).toEqual([{ role: 'user', content: 'Hello' }]);
  });

  it('renders tool call payloads', async () => {
    const renderer = new OpenAIChatRenderer();
    const toolPayload = new ToolCallPayload([
      { id: 'call_1', name: 'list_directory', arguments: { path: 'src' } }
    ]);
    const messages = [new Message(MessageRole.ASSISTANT, { content: null, tool_payload: toolPayload })];

    const rendered = await renderer.render(messages);

    expect(rendered).toHaveLength(1);
    expect(rendered[0]).toMatchObject({ role: 'assistant', content: null });
    expect(rendered[0].tool_calls).toEqual([
      {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'list_directory',
          arguments: JSON.stringify({ path: 'src' })
        }
      }
    ]);
  });

  it('renders tool result payloads', async () => {
    const renderer = new OpenAIChatRenderer();
    const toolPayload = new ToolResultPayload('call_1', 'list_directory', ['app.py']);
    const messages = [new Message(MessageRole.TOOL, { tool_payload: toolPayload })];

    const rendered = await renderer.render(messages);

    expect(rendered).toEqual([
      {
        role: 'tool',
        tool_call_id: 'call_1',
        content: JSON.stringify(['app.py'])
      }
    ]);
  });

  it('renders user audio inputs as input_audio content parts', async () => {
    const renderer = new OpenAIChatRenderer();
    const messages = [
      new Message(MessageRole.USER, {
        content: 'please transcribe',
        audio_urls: ['data:audio/wav;base64,ZmFrZQ==']
      })
    ];

    const rendered = await renderer.render(messages);

    expect(rendered).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'please transcribe' },
          {
            type: 'input_audio',
            input_audio: {
              data: 'ZmFrZQ==',
              format: 'wav'
            }
          }
        ]
      }
    ]);
  });

  it('omits reasoning_content for non-tool assistant messages by default', async () => {
    const rendered = await new OpenAIChatRenderer().render([
      new Message(MessageRole.ASSISTANT, {
        content: 'The answer is 42.',
        reasoning_content: 'because'
      })
    ]) as any[];

    expect(rendered[0]).toMatchObject({
      role: 'assistant',
      content: 'The answer is 42.'
    });
    expect(rendered[0]).not.toHaveProperty('reasoning_content');
  });

  it('omits reasoning_content on assistant tool-call messages by default', async () => {
    const rendered = await new OpenAIChatRenderer().render([
      new Message(MessageRole.ASSISTANT, {
        content: 'I will inspect the workspace.',
        reasoning_content: 'Need the current directory before answering.',
        tool_payload: new ToolCallPayload([
          { id: 'call_1', name: 'run_bash', arguments: { command: 'pwd' } }
        ])
      })
    ]) as any[];

    expect(rendered[0]).toMatchObject({
      role: 'assistant',
      content: 'I will inspect the workspace.',
      tool_calls: [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'run_bash',
            arguments: JSON.stringify({ command: 'pwd' })
          }
        }
      ]
    });
    expect(rendered[0]).not.toHaveProperty('reasoning_content');
  });

  it('does not synthesize reasoning_content for any generic rendered role', async () => {
    const rendered = await new OpenAIChatRenderer().render([
      new Message(MessageRole.ASSISTANT, {
        content: 'Empty reasoning is still an explicit provider field.',
        reasoning_content: ''
      }),
      new Message(MessageRole.USER, {
        content: 'hello',
        reasoning_content: 'should not render on user'
      }),
      new Message(MessageRole.SYSTEM, {
        content: 'system',
        reasoning_content: 'should not render on system'
      })
    ]) as any[];

    expect(rendered[0]).not.toHaveProperty('reasoning_content');
    expect(rendered[1]).not.toHaveProperty('reasoning_content');
    expect(rendered[2]).not.toHaveProperty('reasoning_content');
  });
});
