import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioClientFactory } from '../../../../src/multimedia/audio/audio-client-factory.js';
import { BaseAudioClient } from '../../../../src/multimedia/audio/base-audio-client.js';
import {
  apiKeyAuthentication,
  geminiAiStudioAuthentication,
} from '../../explicit-auth-test-helpers.js';

vi.mock('../../../../src/utils/gemini-helper.js', () => ({
  initializeGeminiClientWithRuntime: () => ({
    client: { models: { generateContent: vi.fn() } },
    runtimeInfo: { runtime: 'api_key' }
  })
}));

describe('AudioClientFactory', () => {
  beforeEach(() => {
    AudioClientFactory.reinitialize();
  });

  const explicitApiKey = () => ({
    authentication: apiKeyAuthentication(),
  });
  const explicitGeminiAiStudio = () => ({
    authentication: geminiAiStudioAuthentication(),
  });

  it('lists available models', () => {
    const models = AudioClientFactory.listModels();
    const identifiers = models.map((model) => model.modelIdentifier);
    expect(identifiers).toContain('gpt-4o-mini-tts');
    expect(identifiers).toContain('gemini-3.1-flash-tts-preview');
    expect(identifiers).toContain('gemini-2.5-flash-tts');
    expect(identifiers).toContain('gemini-2.5-pro-tts');
    expect(models.find((model) => model.modelIdentifier === 'gemini-2.5-pro-tts')?.value).toBe(
      'gemini-2.5-pro-preview-tts'
    );
  });

  it('describes Gemini construction with only credential ownership and exact mode requirement', () => {
    const target = AudioClientFactory.describeConstructionTarget('gemini-2.5-pro-tts');
    expect(target).toEqual({
      credentialProviderId: 'GEMINI',
      authenticationRequirement: { kind: 'geminiAuthenticationMode' },
    });
    expect(Object.keys(target).sort()).toEqual(['authenticationRequirement', 'credentialProviderId']);
  });

  it('creates audio client for valid identifier', () => {
    const client = AudioClientFactory.createAudioClient('gpt-4o-mini-tts', explicitApiKey());
    expect(client).toBeInstanceOf(BaseAudioClient);
    expect(client.model.modelIdentifier).toBe('gpt-4o-mini-tts');
  });

  it('creates Gemini audio clients with user-facing identifiers and API values', () => {
    const latestClient = AudioClientFactory.createAudioClient(
      'gemini-3.1-flash-tts-preview',
      explicitGeminiAiStudio(),
    );
    const proClient = AudioClientFactory.createAudioClient(
      'gemini-2.5-pro-tts',
      explicitGeminiAiStudio(),
    );

    expect(latestClient).toBeInstanceOf(BaseAudioClient);
    expect(latestClient.model.value).toBe('gemini-3.1-flash-tts-preview');
    expect(proClient).toBeInstanceOf(BaseAudioClient);
    expect(proClient.model.value).toBe('gemini-2.5-pro-preview-tts');
  });

  it('throws for invalid identifier', () => {
    expect(() => AudioClientFactory.createAudioClient('unsupported-audio-model-xyz', explicitApiKey()))
      .toThrow('No audio model registered');
  });
});
