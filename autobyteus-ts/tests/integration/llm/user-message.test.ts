import { describe, it, expect } from 'vitest';
import { LLMUserMessage } from '../../../src/llm/user-message.js';

describe('LLMUserMessage (integration)', () => {
  it('serializes and deserializes', () => {
    const msg = new LLMUserMessage({
      content: 'Hello',
      image_urls: ['img.png'],
      audio_urls: ['audio.mp3'],
      video_urls: ['video.mp4']
    });
    const dict = msg.toDict();
    const restored = LLMUserMessage.fromDict(dict);
    expect(restored.content).toBe('Hello');
    expect(restored.image_urls).toEqual(['img.png']);
    expect(restored.audio_urls).toEqual(['audio.mp3']);
    expect(restored.video_urls).toEqual(['video.mp4']);
  });
});
