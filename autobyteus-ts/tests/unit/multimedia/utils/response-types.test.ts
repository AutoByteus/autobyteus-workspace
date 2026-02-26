import { describe, it, expect } from 'vitest';
import { ImageGenerationResponse, SpeechGenerationResponse } from '../../../../src/multimedia/utils/response-types.js';

describe('multimedia response types', () => {
  it('creates ImageGenerationResponse with optional revised prompt', () => {
    const response = new ImageGenerationResponse(['https://example.com/img.png'], 'revised');
    expect(response.image_urls).toEqual(['https://example.com/img.png']);
    expect(response.revised_prompt).toBe('revised');
  });

  it('creates SpeechGenerationResponse with audio urls', () => {
    const response = new SpeechGenerationResponse(['https://example.com/audio.wav']);
    expect(response.audio_urls).toEqual(['https://example.com/audio.wav']);
  });
});
