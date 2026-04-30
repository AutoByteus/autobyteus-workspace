import { describe, it, expect } from 'vitest';
import { AutobyteusPromptRenderer } from '../../../../src/llm/prompt-renderers/autobyteus-prompt-renderer.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload
} from '../../../../src/llm/utils/messages.js';

describe('AutobyteusPromptRenderer', () => {
  it('renders the transcript and marks the latest user message as current', async () => {
    const renderer = new AutobyteusPromptRenderer();
    const messages = [
      new Message(MessageRole.USER, {
        content: 'first',
        image_urls: ['old-image.png'],
        audio_urls: ['old-audio.wav']
      }),
      new Message(MessageRole.ASSISTANT, 'kept'),
      new Message(MessageRole.USER, {
        content: 'latest',
        image_urls: ['img.png']
      })
    ];

    const rendered = await renderer.render(messages);
    expect(rendered.current_message_index).toBe(2);
    expect(rendered.messages).toEqual([
      {
        role: 'user',
        content: 'first\n\nHistorical media not reattached: 1 image attachment, 1 audio attachment.',
        image_urls: [],
        audio_urls: [],
        video_urls: []
      },
      {
        role: 'assistant',
        content: 'kept',
        image_urls: [],
        audio_urls: [],
        video_urls: []
      },
      {
        role: 'user',
        content: 'latest',
        image_urls: ['img.png'],
        audio_urls: [],
        video_urls: []
      }
    ]);
  });

  it('renders structured tool call payloads into canonical AutoByteus XML content', async () => {
    const renderer = new AutobyteusPromptRenderer();
    const messages = [
      new Message(MessageRole.ASSISTANT, {
        content: 'I will update the files.',
        tool_payload: new ToolCallPayload([
          {
            id: 'call-1',
            name: 'write_file',
            arguments: {
              path: '/tmp/out.txt',
              content: 'Hello <AutoByteus> & friends',
              metadata: { z: 1, a: true }
            }
          },
          {
            id: 'call-2',
            name: 'edit_file',
            arguments: {
              path: '/tmp/out.txt',
              patch: '*** Begin Patch\n*** Update File: /tmp/out.txt\n@@\n-Hello\n+Hi\n*** End Patch'
            }
          }
        ])
      }),
      new Message(MessageRole.USER, 'continue')
    ];

    const rendered = await renderer.render(messages);
    const assistantContent = rendered.messages[0].content;

    expect(assistantContent).toContain('I will update the files.');
    expect(assistantContent).toContain('<tool name="write_file">');
    expect(assistantContent).toContain('<arg name="content">');
    expect(assistantContent).toContain('__START_CONTENT__');
    expect(assistantContent).toContain('Hello &lt;AutoByteus&gt; &amp; friends');
    expect(assistantContent).toContain('__END_CONTENT__');
    expect(assistantContent).toContain('<arg name="metadata">{"a":true,"z":1}</arg>');
    expect(assistantContent).toContain('<arg name="path">/tmp/out.txt</arg>');
    expect(assistantContent).toContain('<tool name="edit_file">');
    expect(assistantContent).toContain('<arg name="patch">');
    expect(assistantContent).toContain('__START_PATCH__');
    expect(assistantContent).toContain('*** Begin Patch');
    expect(assistantContent).toContain('__END_PATCH__');
    expect(rendered.messages[0]).not.toHaveProperty('tool_payload');
  });

  it('renders structured tool result payloads into deterministic result records', async () => {
    const renderer = new AutobyteusPromptRenderer();
    const messages = [
      new Message(MessageRole.TOOL, {
        tool_payload: new ToolResultPayload(
          'call-1',
          'write_file',
          { path: '/tmp/out.txt', ok: true },
          null
        )
      }),
      new Message(MessageRole.USER, 'continue')
    ];

    const rendered = await renderer.render(messages);

    expect(rendered.messages[0].content).toBe([
      'Tool result:',
      'tool_call_id: call-1',
      'tool_name: write_file',
      'tool_result: {"ok":true,"path":"/tmp/out.txt"}',
      'tool_error: null'
    ].join('\n'));
    expect(rendered.messages[0]).not.toHaveProperty('tool_payload');
  });

  it('requires at least one user message', async () => {
    const renderer = new AutobyteusPromptRenderer();
    const messages = [new Message(MessageRole.ASSISTANT, 'hi')];

    await expect(renderer.render(messages))
      .rejects
      .toThrow('AutobyteusPromptRenderer requires at least one user message.');
  });
});
