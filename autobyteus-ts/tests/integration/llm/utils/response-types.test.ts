import { describe, it, expect } from 'vitest';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';

describe('ResponseTypes (integration)', () => {
  it('preserves media arrays in CompleteResponse', () => {
    const resp = new CompleteResponse({
      content: 'Hello',
      image_urls: ['img.png'],
      audio_urls: ['audio.mp3'],
      video_urls: ['video.mp4']
    });
    expect(resp.image_urls).toEqual(['img.png']);
    expect(resp.audio_urls).toEqual(['audio.mp3']);
    expect(resp.video_urls).toEqual(['video.mp4']);
  });

  it('supports tool calls and completion flag in ChunkResponse', () => {
    const chunk = new ChunkResponse({
      content: 'part',
      is_complete: true,
      tool_calls: [{ index: 0, call_id: 'c1', name: 'tool' }]
    });
    expect(chunk.is_complete).toBe(true);
    expect(chunk.tool_calls?.[0].name).toBe('tool');
  });
});
