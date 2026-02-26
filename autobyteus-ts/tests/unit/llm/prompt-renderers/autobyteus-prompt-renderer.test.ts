import { describe, it, expect } from 'vitest';
import { AutobyteusPromptRenderer } from '../../../../src/llm/prompt-renderers/autobyteus-prompt-renderer.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';

describe('AutobyteusPromptRenderer', () => {
  it('uses the latest user message', async () => {
    const renderer = new AutobyteusPromptRenderer();
    const messages = [
      new Message(MessageRole.USER, 'first'),
      new Message(MessageRole.ASSISTANT, 'ignored'),
      new Message(MessageRole.USER, {
        content: 'latest',
        image_urls: ['img.png']
      })
    ];

    const rendered = await renderer.render(messages);
    expect(rendered).toEqual([
      {
        content: 'latest',
        image_urls: ['img.png'],
        audio_urls: [],
        video_urls: []
      }
    ]);
  });

  it('requires at least one user message', async () => {
    const renderer = new AutobyteusPromptRenderer();
    const messages = [new Message(MessageRole.ASSISTANT, 'hi')];

    await expect(renderer.render(messages))
      .rejects
      .toThrow('AutobyteusPromptRenderer requires at least one user message.');
  });
});
