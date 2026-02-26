import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AutobyteusAudioModelProvider } from '../../../../src/multimedia/audio/autobyteus-audio-provider.js';
import { AudioClientFactory } from '../../../../src/multimedia/audio/audio-client-factory.js';
import { AudioModel } from '../../../../src/multimedia/audio/audio-model.js';
import { MultimediaProvider } from '../../../../src/multimedia/providers.js';
import { MultimediaRuntime } from '../../../../src/multimedia/runtimes.js';
import { AutobyteusAudioClient } from '../../../../src/multimedia/audio/api/autobyteus-audio-client.js';
import { AutobyteusClient } from '../../../../src/clients/autobyteus-client.js';

const hasHosts = Boolean(process.env.AUTOBYTEUS_LLM_SERVER_HOSTS);
const hasKey = Boolean(process.env.AUTOBYTEUS_API_KEY);
const runIntegration = hasHosts && hasKey ? describe : describe.skip;

describe('AutobyteusAudioModelProvider integration', () => {
  beforeEach(() => {
    AudioClientFactory.reinitialize();
  });

  afterEach(() => {
    AudioClientFactory.reinitialize();
  });

  runIntegration('live discovery', () => {
    it('registers audio models from the Autobyteus server', async () => {
      await AutobyteusAudioModelProvider.discoverAndRegister();

      const allModels = AudioClientFactory.listModels();
      const autobyteusModels = allModels.filter((model) => model.runtime === MultimediaRuntime.AUTOBYTEUS);

      expect(autobyteusModels.length).toBeGreaterThan(0);
      const modelInfo = autobyteusModels[0];
      expect(modelInfo.modelIdentifier).toBeTruthy();

      const clientInstance = AudioClientFactory.createAudioClient(modelInfo.modelIdentifier);
      expect(clientInstance).toBeInstanceOf(AutobyteusAudioClient);
    }, 60000);
  });

  it('handles empty server response', async () => {
    const spy = vi.spyOn(AutobyteusClient.prototype, 'getAvailableAudioModelsSync');
    spy.mockResolvedValue({ models: [] });

    await AutobyteusAudioModelProvider.discoverAndRegister();

    const autobyteusModels = AudioClientFactory.listModels().filter((model) => model.runtime === MultimediaRuntime.AUTOBYTEUS);
    expect(autobyteusModels.length).toBe(0);

    spy.mockRestore();
  });

  it('preserves existing registrations on failure', async () => {
    const dummyModel = new AudioModel({
      name: 'dummy-audio-model',
      value: 'dummy-audio-model',
      provider: MultimediaProvider.GEMINI,
      clientClass: AutobyteusAudioClient,
      runtime: MultimediaRuntime.AUTOBYTEUS,
      hostUrl: 'http://dummy-host:1234'
    });
    AudioClientFactory.registerModel(dummyModel);

    const spy = vi.spyOn(AutobyteusClient.prototype, 'getAvailableAudioModelsSync');
    spy.mockRejectedValue(new Error('boom'));

    await AutobyteusAudioModelProvider.discoverAndRegister();

    const autobyteusModels = AudioClientFactory.listModels().filter((model) => model.runtime === MultimediaRuntime.AUTOBYTEUS);
    expect(autobyteusModels.length).toBe(1);
    expect(autobyteusModels[0].modelIdentifier).toBe(dummyModel.modelIdentifier);

    spy.mockRestore();
  });
});
