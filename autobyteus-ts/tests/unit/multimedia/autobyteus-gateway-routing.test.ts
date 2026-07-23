import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AudioClientFactory } from '../../../src/multimedia/audio/audio-client-factory.js';
import { AutobyteusAudioClient } from '../../../src/multimedia/audio/api/autobyteus-audio-client.js';
import { OpenAIAudioClient } from '../../../src/multimedia/audio/api/openai-audio-client.js';
import { AudioModel } from '../../../src/multimedia/audio/audio-model.js';
import { ImageClientFactory } from '../../../src/multimedia/image/image-client-factory.js';
import { AutobyteusImageClient } from '../../../src/multimedia/image/api/autobyteus-image-client.js';
import { OpenAIImageClient } from '../../../src/multimedia/image/api/openai-image-client.js';
import { ImageModel } from '../../../src/multimedia/image/image-model.js';
import { MultimediaProvider } from '../../../src/multimedia/providers.js';
import { MultimediaRuntime } from '../../../src/multimedia/runtimes.js';
import { providerApiKeyResolver } from '../provider-api-key-resolver-test-helpers.js';

const audioState = AudioClientFactory as unknown as {
  initialized: boolean;
  modelsByIdentifier: Map<string, AudioModel>;
};
const imageState = ImageClientFactory as unknown as {
  initialized: boolean;
  modelsByIdentifier: Map<string, ImageModel>;
};

describe('AutoByteus multimedia gateway routing', () => {
  let originalAudioInitialized: boolean;
  let originalAudioModels: Map<string, AudioModel>;
  let originalImageInitialized: boolean;
  let originalImageModels: Map<string, ImageModel>;

  beforeEach(() => {
    originalAudioInitialized = audioState.initialized;
    originalAudioModels = audioState.modelsByIdentifier;
    originalImageInitialized = imageState.initialized;
    originalImageModels = imageState.modelsByIdentifier;
    audioState.initialized = true;
    audioState.modelsByIdentifier = new Map();
    imageState.initialized = true;
    imageState.modelsByIdentifier = new Map();
  });

  afterEach(() => {
    audioState.initialized = originalAudioInitialized;
    audioState.modelsByIdentifier = originalAudioModels;
    imageState.initialized = originalImageInitialized;
    imageState.modelsByIdentifier = originalImageModels;
  });

  it('passes a resolver to remote audio without credential fields on the model', () => {
    const model = new AudioModel({
      name: 'remote-audio', value: 'remote-audio', provider: MultimediaProvider.OPENAI,
      clientClass: AutobyteusAudioClient, runtime: MultimediaRuntime.AUTOBYTEUS,
      hostUrl: 'https://gateway.example.invalid',
    });
    AudioClientFactory.registerModel(model);

    const resolver = providerApiKeyResolver();
    const client = AudioClientFactory.createAudioClient(model.modelIdentifier, undefined, resolver);
    expect((client as unknown as { apiKeyResolver: unknown }).apiKeyResolver).toBe(resolver);
    expect(model).not.toHaveProperty('credentialProviderId');
    expect(model).not.toHaveProperty('authenticationRequirement');
  });

  it('scopes audio replacement to the gateway runtime', () => {
    const native = new AudioModel({
      name: 'native-audio', value: 'native-audio', provider: MultimediaProvider.OPENAI,
      clientClass: OpenAIAudioClient,
    });
    const remote = new AudioModel({
      name: 'remote-audio', value: 'remote-audio', provider: MultimediaProvider.OPENAI,
      clientClass: AutobyteusAudioClient, runtime: MultimediaRuntime.AUTOBYTEUS,
      hostUrl: 'https://gateway.example.invalid',
    });
    AudioClientFactory.registerModel(native);
    AudioClientFactory.syncRuntimeModels(MultimediaRuntime.AUTOBYTEUS, [remote]);
    expect(AudioClientFactory.listModels()).toEqual(expect.arrayContaining([native, remote]));
  });

  it('passes a resolver to remote image without credential fields on the model', () => {
    const model = new ImageModel({
      name: 'remote-image', value: 'remote-image', provider: MultimediaProvider.GEMINI,
      clientClass: AutobyteusImageClient, runtime: MultimediaRuntime.AUTOBYTEUS,
      hostUrl: 'https://gateway.example.invalid',
    });
    ImageClientFactory.registerModel(model);

    const resolver = providerApiKeyResolver();
    const client = ImageClientFactory.createImageClient(model.modelIdentifier, undefined, resolver);
    expect((client as unknown as { apiKeyResolver: unknown }).apiKeyResolver).toBe(resolver);
    expect(model).not.toHaveProperty('credentialProviderId');
    expect(model).not.toHaveProperty('authenticationRequirement');
  });

  it('scopes image replacement to the gateway runtime', () => {
    const native = new ImageModel({
      name: 'native-image', value: 'native-image', provider: MultimediaProvider.OPENAI,
      clientClass: OpenAIImageClient,
    });
    const remote = new ImageModel({
      name: 'remote-image', value: 'remote-image', provider: MultimediaProvider.OPENAI,
      clientClass: AutobyteusImageClient, runtime: MultimediaRuntime.AUTOBYTEUS,
      hostUrl: 'https://gateway.example.invalid',
    });
    ImageClientFactory.registerModel(native);
    ImageClientFactory.syncRuntimeModels(MultimediaRuntime.AUTOBYTEUS, [remote]);
    expect(ImageClientFactory.listModels()).toEqual(expect.arrayContaining([native, remote]));
  });
});
