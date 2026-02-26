import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AutobyteusImageModelProvider } from '../../../../src/multimedia/image/autobyteus-image-provider.js';
import { ImageClientFactory } from '../../../../src/multimedia/image/image-client-factory.js';
import { ImageModel } from '../../../../src/multimedia/image/image-model.js';
import { MultimediaProvider } from '../../../../src/multimedia/providers.js';
import { MultimediaRuntime } from '../../../../src/multimedia/runtimes.js';
import { AutobyteusImageClient } from '../../../../src/multimedia/image/api/autobyteus-image-client.js';
import { AutobyteusClient } from '../../../../src/clients/autobyteus-client.js';

const hasHosts = Boolean(process.env.AUTOBYTEUS_LLM_SERVER_HOSTS);
const hasKey = Boolean(process.env.AUTOBYTEUS_API_KEY);
const runIntegration = hasHosts && hasKey ? describe : describe.skip;

describe('AutobyteusImageModelProvider integration', () => {
  beforeEach(() => {
    ImageClientFactory.reinitialize();
  });

  afterEach(() => {
    ImageClientFactory.reinitialize();
  });

  runIntegration('live discovery', () => {
    it('registers image models from the Autobyteus server', async () => {
      await AutobyteusImageModelProvider.discoverAndRegister();

      const allModels = ImageClientFactory.listModels();
      const autobyteusModels = allModels.filter((model) => model.runtime === MultimediaRuntime.AUTOBYTEUS);

      expect(autobyteusModels.length).toBeGreaterThan(0);
      const modelInfo = autobyteusModels[0];
      expect(modelInfo.modelIdentifier).toBeTruthy();

      const clientInstance = ImageClientFactory.createImageClient(modelInfo.modelIdentifier);
      expect(clientInstance).toBeInstanceOf(AutobyteusImageClient);
    }, 60000);
  });

  it('handles empty server response', async () => {
    const spy = vi.spyOn(AutobyteusClient.prototype, 'getAvailableImageModelsSync');
    spy.mockResolvedValue({ models: [] });

    await AutobyteusImageModelProvider.discoverAndRegister();

    const autobyteusModels = ImageClientFactory.listModels().filter((model) => model.runtime === MultimediaRuntime.AUTOBYTEUS);
    expect(autobyteusModels.length).toBe(0);

    spy.mockRestore();
  });

  it('preserves existing registrations on failure', async () => {
    const dummyModel = new ImageModel({
      name: 'dummy-image-model',
      value: 'dummy-image-model',
      provider: MultimediaProvider.OPENAI,
      clientClass: AutobyteusImageClient,
      runtime: MultimediaRuntime.AUTOBYTEUS,
      hostUrl: 'http://dummy-host:1234'
    });
    ImageClientFactory.registerModel(dummyModel);

    const spy = vi.spyOn(AutobyteusClient.prototype, 'getAvailableImageModelsSync');
    spy.mockRejectedValue(new Error('boom'));

    await AutobyteusImageModelProvider.discoverAndRegister();

    const autobyteusModels = ImageClientFactory.listModels().filter((model) => model.runtime === MultimediaRuntime.AUTOBYTEUS);
    expect(autobyteusModels.length).toBe(1);
    expect(autobyteusModels[0].modelIdentifier).toBe(dummyModel.modelIdentifier);

    spy.mockRestore();
  });
});
