import { describe, it, expect } from 'vitest';
import { AutobyteusImageModelProvider } from '../../../../../src/multimedia/image/autobyteus-image-provider.js';
import { ImageClientFactory } from '../../../../../src/multimedia/image/image-client-factory.js';
import { MultimediaRuntime } from '../../../../../src/multimedia/runtimes.js';

const hasHosts = Boolean(process.env.AUTOBYTEUS_LLM_SERVER_HOSTS);
const hasKey = Boolean(process.env.AUTOBYTEUS_API_KEY);
const forcedModelId = process.env.AUTOBYTEUS_IMAGE_MODEL_ID;
const runIntegration = hasHosts && hasKey ? describe : describe.skip;

runIntegration('AutobyteusImageClient integration', () => {
  it(
    'generates images via Autobyteus server',
    { timeout: 60000 },
    async () => {
      await AutobyteusImageModelProvider.discoverAndRegister();

      const models = ImageClientFactory.listModels().filter(
        (model) => model.runtime === MultimediaRuntime.AUTOBYTEUS
      );
      expect(models.length).toBeGreaterThan(0);

      const model = forcedModelId
        ? models.find((candidate) => candidate.modelIdentifier === forcedModelId || candidate.name === forcedModelId)
        : models[0];
      if (!model) {
        throw new Error(
          `Forced AUTOBYTEUS_IMAGE_MODEL_ID not found: ${forcedModelId}. ` +
            `Available: ${models.map((candidate) => candidate.modelIdentifier).join(', ')}`
        );
      }
      const client = ImageClientFactory.createImageClient(model.modelIdentifier);
      const response = await client.generateImage('A simple blue circle on a white background.');

      expect(Array.isArray(response.image_urls)).toBe(true);
      expect(response.image_urls.length).toBeGreaterThan(0);

      await client.cleanup();
    }
  );
});
