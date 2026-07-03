import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VideoClientFactory } from '../../../../src/multimedia/video/video-client-factory.js';
import { BaseVideoClient } from '../../../../src/multimedia/video/base-video-client.js';
import { GeminiVideoClient } from '../../../../src/multimedia/video/api/gemini-video-client.js';

vi.mock('../../../../src/utils/gemini-helper.js', () => ({
  initializeGeminiClientWithRuntime: () => ({
    client: { interactions: { create: vi.fn() }, files: { get: vi.fn(), download: vi.fn() } },
    runtimeInfo: { runtime: 'api_key' }
  })
}));

describe('VideoClientFactory', () => {
  beforeEach(() => {
    VideoClientFactory.reinitialize();
  });

  it('lists Gemini Omni Flash Preview video model with default schema values', () => {
    const models = VideoClientFactory.listModels();
    const model = models.find((entry) => entry.modelIdentifier === 'gemini-omni-flash-preview');

    expect(model).toBeDefined();
    expect(model?.value).toBe('gemini-omni-flash-preview');
    expect(model?.defaultConfig.toDict()).toEqual({
      aspect_ratio: '16:9',
      delivery: 'uri',
      poll_interval_ms: 5000,
      max_poll_ms: 600000
    });

    const taskParameter = model?.parameterSchema.getParameter('task');
    expect(taskParameter?.enumValues).toEqual([
      'text_to_video',
      'image_to_video',
      'reference_to_video'
    ]);
    expect(taskParameter?.enumValues).not.toContain('edit');
    expect(taskParameter?.defaultValue).toBeUndefined();
  });

  it('creates GeminiVideoClient for Gemini Omni Flash Preview', () => {
    const client = VideoClientFactory.createVideoClient('gemini-omni-flash-preview');

    expect(client).toBeInstanceOf(BaseVideoClient);
    expect(client).toBeInstanceOf(GeminiVideoClient);
    expect(client.model.modelIdentifier).toBe('gemini-omni-flash-preview');
  });

  it('throws for invalid identifier', () => {
    expect(() => VideoClientFactory.createVideoClient('unsupported-video-model-xyz'))
      .toThrow('No video model registered');
  });
});
