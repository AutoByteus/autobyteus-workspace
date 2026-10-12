import { beforeEach, describe, expect, it } from 'vitest';
import { AudioClientFactory } from '../../../src/multimedia/audio/audio-client-factory.js';
import { AudioModel } from '../../../src/multimedia/audio/audio-model.js';
import { BaseAudioClient } from '../../../src/multimedia/audio/base-audio-client.js';
import { BaseImageClient } from '../../../src/multimedia/image/base-image-client.js';
import { ImageClientFactory } from '../../../src/multimedia/image/image-client-factory.js';
import { ImageModel } from '../../../src/multimedia/image/image-model.js';
import { MultimediaProvider } from '../../../src/multimedia/providers.js';
import { BaseVideoClient } from '../../../src/multimedia/video/base-video-client.js';
import { VideoClientFactory } from '../../../src/multimedia/video/video-client-factory.js';
import { VideoModel } from '../../../src/multimedia/video/video-model.js';
import { geminiRuntimeResolver, providerApiKeyResolver } from '../provider-api-key-resolver-test-helpers.js';

/**
 * Media models run on the provider API only. The Gemini runtime resolver is required exactly for
 * Gemini models and refused for every other provider, decided by the provider alone.
 */

const constructorArgs: unknown[][] = [];

class RecordingImageClient extends BaseImageClient {
  constructor(...args: any[]) {
    super(args[0], args[1]);
    constructorArgs.push(args);
  }
  async generateImage(): Promise<any> { return { image_urls: [] }; }
  async editImage(): Promise<any> { return { image_urls: [] }; }
}

class RecordingAudioClient extends BaseAudioClient {
  constructor(...args: any[]) {
    super(args[0], args[1]);
    constructorArgs.push(args);
  }
  async generateSpeech(): Promise<any> { return { audio_urls: [] }; }
}

class RecordingVideoClient extends BaseVideoClient {
  constructor(...args: any[]) {
    super(args[0], args[1]);
    constructorArgs.push(args);
  }
  async generateVideo(): Promise<any> { return { video_urls: [] }; }
}

const kinds = [
  {
    kind: 'image',
    build: (provider: MultimediaProvider) =>
      new ImageModel({ name: `gate-${provider}`, value: `gate-${provider}`, provider, clientClass: RecordingImageClient as any }),
  },
  {
    kind: 'audio',
    build: (provider: MultimediaProvider) =>
      new AudioModel({ name: `gate-${provider}`, value: `gate-${provider}`, provider, clientClass: RecordingAudioClient as any }),
  },
  {
    kind: 'video',
    build: (provider: MultimediaProvider) =>
      new VideoModel({ name: `gate-${provider}`, value: `gate-${provider}`, provider, clientClass: RecordingVideoClient as any }),
  },
] as const;

describe('Gemini runtime resolver gate for media models', () => {
  beforeEach(() => {
    constructorArgs.length = 0;
  });

  it.each(kinds)('requires the resolver for a Gemini $kind model and passes it to the client', ({ build }) => {
    const model = build(MultimediaProvider.GEMINI);
    const apiKeys = providerApiKeyResolver();
    const resolver = geminiRuntimeResolver();

    expect(() => model.createClient(undefined, apiKeys)).toThrow('GEMINI_RUNTIME_RESOLVER_REQUIRED');
    model.createClient(undefined, apiKeys, resolver);
    expect(constructorArgs).toHaveLength(1);
    expect(constructorArgs[0]?.[2]).toBe(apiKeys);
    expect(constructorArgs[0]?.[3]).toBe(resolver);
  });

  it.each(kinds)('refuses the resolver for a non-Gemini $kind model and constructs without it', ({ build }) => {
    const model = build(MultimediaProvider.OPENAI);
    const apiKeys = providerApiKeyResolver();

    expect(() => model.createClient(undefined, apiKeys, geminiRuntimeResolver()))
      .toThrow('GEMINI_RUNTIME_RESOLVER_NOT_ALLOWED');
    model.createClient(undefined, apiKeys);
    expect(constructorArgs).toHaveLength(1);
    expect(constructorArgs[0]).toHaveLength(3);
    expect(constructorArgs[0]?.[2]).toBe(apiKeys);
  });

  it('reports the resolver requirement for every registered media model by provider alone', () => {
    ImageClientFactory.reinitialize();
    AudioClientFactory.reinitialize();
    VideoClientFactory.reinitialize();
    const rows = [
      ...ImageClientFactory.listModels().map((model) => ({
        provider: model.provider,
        requires: ImageClientFactory.requiresGeminiRuntimeResolver(model.modelIdentifier),
      })),
      ...AudioClientFactory.listModels().map((model) => ({
        provider: model.provider,
        requires: AudioClientFactory.requiresGeminiRuntimeResolver(model.modelIdentifier),
      })),
      ...VideoClientFactory.listModels().map((model) => ({
        provider: model.provider,
        requires: VideoClientFactory.requiresGeminiRuntimeResolver(model.modelIdentifier),
      })),
    ];

    expect(rows.some((row) => row.provider === MultimediaProvider.GEMINI)).toBe(true);
    expect(rows.some((row) => row.provider === MultimediaProvider.OPENAI)).toBe(true);
    for (const row of rows) {
      expect(row.requires).toBe(row.provider === MultimediaProvider.GEMINI);
    }
    expect('runtime' in (ImageClientFactory.listModels()[0] as object)).toBe(false);
  });
});
