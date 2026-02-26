import { describe, it, expect } from 'vitest';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';

describe('Message (integration)', () => {
  it('serializes with media arrays', () => {
    const msg = new Message(MessageRole.USER, {
      content: 'Hello',
      image_urls: ['img.png'],
      audio_urls: ['audio.mp3'],
      video_urls: ['video.mp4']
    });

    const dict = msg.toDict();
    expect(dict).toEqual({
      role: 'user',
      content: 'Hello',
      reasoning_content: null,
      image_urls: ['img.png'],
      audio_urls: ['audio.mp3'],
      video_urls: ['video.mp4'],
      tool_payload: null
    });
  });
});
