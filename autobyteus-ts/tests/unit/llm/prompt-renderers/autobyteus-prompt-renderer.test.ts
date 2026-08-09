import { describe, expect, it } from 'vitest';
import { AutobyteusPromptRenderer } from '../../../../src/llm/prompt-renderers/autobyteus-prompt-renderer.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload
} from '../../../../src/llm/utils/messages.js';

describe('AutobyteusPromptRenderer', () => {
  it('renders ordinary transcript/media and marks the latest user message as current', async () => {
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

    const rendered = await new AutobyteusPromptRenderer().render(messages);

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

  it('keeps assistant content but does not emulate structured tool calls as XML or text', async () => {
    const messages = [
      new Message(MessageRole.ASSISTANT, {
        content: 'I will update the files.',
        tool_payload: new ToolCallPayload([
          {
            id: 'call-1',
            name: 'write_file',
            arguments: { path: '/tmp/out.txt', content: 'Hello <AutoByteus> & friends' }
          }
        ])
      }),
      new Message(MessageRole.USER, 'continue')
    ];

    const rendered = await new AutobyteusPromptRenderer().render(messages);

    expect(rendered.messages[0]).toEqual({
      role: 'assistant',
      content: 'I will update the files.',
      image_urls: [],
      audio_urls: [],
      video_urls: []
    });
    const serialized = JSON.stringify(rendered);
    expect(serialized).not.toContain('<tool');
    expect(serialized).not.toContain('[TOOL_CALL]');
    expect(serialized).not.toContain('write_file');
    expect(rendered.messages[0]).not.toHaveProperty('tool_payload');
  });

  it('does not encode structured tool results into model-facing text records', async () => {
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

    const rendered = await new AutobyteusPromptRenderer().render(messages);

    expect(rendered.messages[0]).toEqual({
      role: 'tool',
      content: '',
      image_urls: [],
      audio_urls: [],
      video_urls: []
    });
    const serialized = JSON.stringify(rendered);
    expect(serialized).not.toContain('Tool result:');
    expect(serialized).not.toContain('[TOOL_RESULT]');
    expect(serialized).not.toContain('write_file');
  });

  it('keeps a media continuation user message current without tool-text emulation', async () => {
    const messages = [
      new Message(MessageRole.USER, 'Please transcribe the audio.'),
      new Message(MessageRole.ASSISTANT, {
        tool_payload: new ToolCallPayload([
          { id: 'call-media', name: 'read_media_file', arguments: { file_path: '/tmp/audio.m4a' } }
        ])
      }),
      new Message(MessageRole.TOOL, {
        tool_payload: new ToolResultPayload('call-media', 'read_media_file', {
          uri: '/tmp/audio.m4a',
          file_type: 'audio'
        })
      }),
      new Message(MessageRole.USER, {
        content: 'The media is ready.',
        audio_urls: ['/tmp/audio.m4a']
      })
    ];

    const rendered = await new AutobyteusPromptRenderer().render(messages);

    expect(rendered.current_message_index).toBe(3);
    expect(rendered.messages[3]).toEqual({
      role: 'user',
      content: 'The media is ready.',
      image_urls: [],
      audio_urls: ['/tmp/audio.m4a'],
      video_urls: []
    });
    expect(JSON.stringify(rendered)).not.toContain('[TOOL_');
    expect(JSON.stringify(rendered)).not.toContain('<tool');
  });

  it('requires at least one user message', async () => {
    await expect(new AutobyteusPromptRenderer().render([
      new Message(MessageRole.ASSISTANT, 'hi')
    ])).rejects.toThrow('AutobyteusPromptRenderer requires at least one user message.');
  });
});
