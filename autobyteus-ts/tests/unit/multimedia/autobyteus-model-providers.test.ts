import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAvailableAudioModelsSync = vi.hoisted(() => vi.fn());
const getAvailableImageModelsSync = vi.hoisted(() => vi.fn());
const close = vi.hoisted(() => vi.fn());
const construct = vi.hoisted(() => vi.fn());

vi.mock('../../../src/clients/autobyteus-client.js', () => ({
  AutobyteusClient: class {
    constructor(...args: unknown[]) { construct(...args); }
    getAvailableAudioModelsSync = getAvailableAudioModelsSync;
    getAvailableImageModelsSync = getAvailableImageModelsSync;
    close = close;
  },
}));

import { AutobyteusAudioModelProvider } from '../../../src/multimedia/audio/autobyteus-audio-provider.js';
import { AutobyteusImageModelProvider } from '../../../src/multimedia/image/autobyteus-image-provider.js';
import { SecretValue } from '../../../src/secrets/secret-value.js';

describe('AutoByteus single-host multimedia discovery adapters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    close.mockResolvedValue(undefined);
    getAvailableAudioModelsSync.mockResolvedValue({
      models: [{
        name: 'audio-model', value: 'audio-model', provider: 'OPENAI', parameter_schema: {},
      }],
    });
    getAvailableImageModelsSync.mockResolvedValue({
      models: [{
        name: 'image-model', value: 'image-model', provider: 'OPENAI', parameter_schema: {},
      }],
    });
  });

  it('passes the attempt signal through the audio client and stamps the exact host', async () => {
    const controller = new AbortController();
    const models = await AutobyteusAudioModelProvider.getModels(
      'https://audio.example.invalid',
      { apiKey: SecretValue.fromString('synthetic-key') },
      { signal: controller.signal },
    );
    expect(construct).toHaveBeenCalledWith('https://audio.example.invalid', 'synthetic-key');
    expect(getAvailableAudioModelsSync).toHaveBeenCalledWith({ signal: controller.signal });
    expect(models[0]?.hostUrl).toBe('https://audio.example.invalid');
    expect(close).toHaveBeenCalledOnce();
  });

  it('passes the attempt signal through the image client and stamps the exact host', async () => {
    const controller = new AbortController();
    const models = await AutobyteusImageModelProvider.getModels(
      'https://image.example.invalid',
      { apiKey: SecretValue.fromString('synthetic-key') },
      { signal: controller.signal },
    );
    expect(construct).toHaveBeenCalledWith('https://image.example.invalid', 'synthetic-key');
    expect(getAvailableImageModelsSync).toHaveBeenCalledWith({ signal: controller.signal });
    expect(models[0]?.hostUrl).toBe('https://image.example.invalid');
    expect(close).toHaveBeenCalledOnce();
  });
});
