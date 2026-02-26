import { describe, it, expect } from 'vitest';
import { AutobyteusAudioModelProvider } from '../../../../../src/multimedia/audio/autobyteus-audio-provider.js';
import { AudioClientFactory } from '../../../../../src/multimedia/audio/audio-client-factory.js';
import { MultimediaRuntime } from '../../../../../src/multimedia/runtimes.js';

const hasHosts = Boolean(process.env.AUTOBYTEUS_LLM_SERVER_HOSTS);
const hasKey = Boolean(process.env.AUTOBYTEUS_API_KEY);
const forcedModelId = process.env.AUTOBYTEUS_AUDIO_MODEL_ID;
const runIntegration = hasHosts && hasKey ? describe : describe.skip;

runIntegration('AutobyteusAudioClient integration', () => {
  it(
    'generates speech via Autobyteus server',
    { timeout: 60000 },
    async () => {
      await AutobyteusAudioModelProvider.discoverAndRegister();

      const models = AudioClientFactory.listModels().filter(
        (model) => model.runtime === MultimediaRuntime.AUTOBYTEUS
      );
      expect(models.length).toBeGreaterThan(0);

      const model = forcedModelId
        ? models.find((candidate) => candidate.modelIdentifier === forcedModelId || candidate.name === forcedModelId)
        : models[0];
      if (!model) {
        throw new Error(
          `Forced AUTOBYTEUS_AUDIO_MODEL_ID not found: ${forcedModelId}. ` +
            `Available: ${models.map((candidate) => candidate.modelIdentifier).join(', ')}`
        );
      }
      const client = AudioClientFactory.createAudioClient(model.modelIdentifier);
      const response = await client.generateSpeech('Hello from the Autobyteus audio integration test.');

      expect(Array.isArray(response.audio_urls)).toBe(true);
      expect(response.audio_urls.length).toBeGreaterThan(0);

      await client.cleanup();
    }
  );
});
