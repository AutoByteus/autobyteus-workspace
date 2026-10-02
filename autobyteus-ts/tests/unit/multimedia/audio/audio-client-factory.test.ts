import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioClientFactory } from '../../../../src/multimedia/audio/audio-client-factory.js';
import { BaseAudioClient } from '../../../../src/multimedia/audio/base-audio-client.js';
import { MultimediaConfig } from '../../../../src/multimedia/utils/multimedia-config.js';
import { GEMINI_TTS_VOICES, GEMINI_VERIFIED_EXTENDED_VOICES } from '../../../../src/multimedia/audio/gemini-tts-voices.js';
import { ParameterDefinition, ParameterSchema, ParameterType } from '../../../../src/utils/parameter-schema.js';
import { GoogleGenAI } from '@google/genai';
import {
  geminiProviderApiKeyResolver,
  geminiRuntimeResolver,
  providerApiKeyResolver,
} from '../../provider-api-key-resolver-test-helpers.js';

vi.mock('../../../../src/utils/gemini-helper.js', () => ({
  selectGeminiRuntimeForResolver: async () => ({ kind: 'aiStudio' }),
  initializeGeminiClientWithRuntime: () => ({
    client: { models: { generateContent: vi.fn() } },
    runtimeInfo: { runtime: 'api_key' }
  })
}));

describe('AudioClientFactory', () => {
  beforeEach(() => {
    AudioClientFactory.reinitialize();
  });

  it('lists available models', () => {
    const models = AudioClientFactory.listModels();
    const identifiers = models.map((model) => model.modelIdentifier);
    expect(identifiers).toContain('gpt-4o-mini-tts');
    expect(identifiers).toContain('gemini-3.8-flash-tts');
    expect(identifiers).toContain('gemini-3.8-flash-lite-tts');
    expect(identifiers).not.toContain('gemini-3.1-flash-tts-preview');
    expect(identifiers).not.toContain('gemini-2.5-flash-tts');
    expect(identifiers).not.toContain('gemini-2.5-pro-tts');
  });

  it('keeps model definitions credential-independent', () => {
    const model = AudioClientFactory.listModels()
      .find((entry) => entry.modelIdentifier === 'gemini-3.8-flash-lite-tts');
    expect(model).toBeDefined();
    expect(model).not.toHaveProperty('credentialProviderId');
    expect(model).not.toHaveProperty('authenticationRequirement');
  });

  it.each(['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'])(
    'exposes ID-capable single voice and optional nullable turn styles for %s', (identifier) => {
      const model = AudioClientFactory.listModels().find((entry) => entry.modelIdentifier === identifier)!;
      const schema = model.parameterSchema.toJsonSchema() as any;
      expect(schema.properties.voice_name).toMatchObject({
        type: 'string', default: 'Kore', pattern: '^\\S(?:[\\s\\S]*\\S)?$'
      });
      expect(schema.properties.voice_name).not.toHaveProperty('enum');
      expect(schema.properties.voice_name.description).toContain('Featured prebuilt voices (not the full Google catalog)');
      expect(schema.properties.voice_name.description).toContain('ar-001-advisor-1 (Authoritative Advisor 1, ar-001)');
      expect(schema.properties.voice_name.description).toContain('Arabic pronunciation/quality not tested');
      expect(schema.properties.voice_name.description).toContain('Other caller-supplied IDs are not pre-verified');
      expect(schema.properties.speaker_mapping.items.properties.voice.enum).toEqual(GEMINI_TTS_VOICES);
      expect(GEMINI_TTS_VOICES).toHaveLength(30);
      expect(schema.properties.speaker_mapping.items.properties.voice.enum).not.toContain('ar-001-advisor-1');
      expect(schema.properties.turn_styles).toMatchObject({
        type: 'array', items: { anyOf: [{ type: 'string' }, { type: 'null' }] }
      });
      expect(schema.properties.turn_styles).not.toHaveProperty('default');
      expect(schema.required).not.toContain('turn_styles');
      expect(model.defaultConfig.toDict()).toEqual({ mode: 'single-speaker', voice_name: 'Kore' });
      const pattern = new RegExp(schema.properties.voice_name.pattern);
      expect(pattern.test('ar-001-advisor-1')).toBe(true);
      expect(pattern.test('achernar')).toBe(true);
      expect(pattern.test(' Kore')).toBe(false);
      expect(pattern.test('Kore ')).toBe(false);
      expect(pattern.test('')).toBe(false);
    }
  );

  it('keeps tested-addition provenance separate from featured dialogue and OpenAI schemas', () => {
    expect(GEMINI_VERIFIED_EXTENDED_VOICES).toEqual([
      { id: 'ar-001-advisor-1', displayName: 'Authoritative Advisor 1', languageCode: 'ar-001' }
    ]);
    const openai = AudioClientFactory.listModels().find((entry) => entry.modelIdentifier === 'gpt-4o-mini-tts')!;
    expect(openai.parameterSchema.parameters.map((parameter) => parameter.name)).toEqual(['voice', 'format', 'instructions']);
    expect(openai.defaultConfig.toDict()).toEqual({ voice: 'alloy', format: 'mp3' });
  });

  it.each([false, true])('serializes the model-derived nullable style schema in the installed SDK (vertexai=%s)', async (vertexai) => {
    const model = AudioClientFactory.listModels().find((entry) => entry.modelIdentifier === 'gemini-3.8-flash-tts')!;
    const schema = new ParameterSchema([
      new ParameterDefinition({ name: 'prompt', type: ParameterType.STRING, description: 'Transcript', required: true }),
      new ParameterDefinition({ name: 'output_file_path', type: ParameterType.STRING, description: 'Output', required: true }),
      new ParameterDefinition({ name: 'generation_config', type: ParameterType.OBJECT, description: 'Configured model', objectSchema: model.parameterSchema })
    ]);
    let body: any;
    const fetchMock = vi.fn(async (_input: unknown, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'synthetic' }] } }] }), {
        status: 200, headers: { 'content-type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    try {
      const sdk = new GoogleGenAI({ apiKey: 'synthetic-schema-key', vertexai });
      await sdk.models.generateContent({
        model: 'wire-model', contents: 'synthetic schema check',
        config: { tools: [{ functionDeclarations: [{ name: 'generate_speech', parameters: schema.toJsonSchema() }] }] }
      });
      const parameters = body.tools[0].functionDeclarations[0].parameters;
      expect(parameters.required).toEqual(['prompt', 'output_file_path']);
      const config = parameters.properties.generation_config;
      expect(config.properties.voice_name.type).toBe('STRING');
      expect(config.properties.voice_name).not.toHaveProperty('enum');
      expect(config.properties.turn_styles.items).toEqual({ type: 'STRING', nullable: true });
      expect(config.required).not.toContain('turn_styles');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally { vi.unstubAllGlobals(); }
  });

  it('creates audio client for valid identifier', () => {
    const client = AudioClientFactory.createAudioClient(
      'gpt-4o-mini-tts',
      undefined,
      providerApiKeyResolver(),
    );
    expect(client).toBeInstanceOf(BaseAudioClient);
    expect(client.model.modelIdentifier).toBe('gpt-4o-mini-tts');
  });

  it('creates Gemini audio clients with user-facing identifiers and API values', () => {
    const latestClient = AudioClientFactory.createAudioClient(
      'gemini-3.8-flash-tts',
      new MultimediaConfig(),
      geminiProviderApiKeyResolver({ aiStudio: 'synthetic-gemini-key' }),
      geminiRuntimeResolver(),
    );
    const liteClient = AudioClientFactory.createAudioClient(
      'gemini-3.8-flash-lite-tts',
      new MultimediaConfig(),
      geminiProviderApiKeyResolver({ aiStudio: 'synthetic-gemini-key' }),
      geminiRuntimeResolver(),
    );

    expect(latestClient).toBeInstanceOf(BaseAudioClient);
    expect(latestClient.model.value).toBe('gemini-3.8-flash-tts');
    expect(liteClient).toBeInstanceOf(BaseAudioClient);
    expect(liteClient.model.value).toBe('gemini-3.8-flash-lite-tts');
  });

  it('throws for invalid identifier', () => {
    expect(() => AudioClientFactory.createAudioClient(
      'unsupported-audio-model-xyz',
      undefined,
      providerApiKeyResolver(),
    ))
      .toThrow('No audio model registered');
  });
});
