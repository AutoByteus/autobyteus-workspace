import { describe, it, expect } from 'vitest';
import { AudioModel } from '../../../../src/multimedia/audio/audio-model.js';
import { MultimediaProvider } from '../../../../src/multimedia/providers.js';
import { MultimediaConfig } from '../../../../src/multimedia/utils/multimedia-config.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../../src/utils/parameter-schema.js';
import { BaseAudioClient } from '../../../../src/multimedia/audio/base-audio-client.js';

class DummyAudioClient extends BaseAudioClient {
  async generateSpeech(): Promise<any> {
    return { audio_urls: [] };
  }
}

describe('AudioModel', () => {
  const sampleSchemaDict = {
    parameters: [
      {
        name: 'voice_name',
        type: 'enum',
        description: 'The voice to use.',
        required: false,
        defaultValue: 'Kore',
        enumValues: ['Kore', 'Zephyr']
      },
      {
        name: 'speed',
        type: 'float',
        description: 'The speech speed.',
        required: true,
        defaultValue: null,
        minValue: 0.5,
        maxValue: 2.0
      }
    ]
  };

  const sampleSchemaObject = new ParameterSchema([
    new ParameterDefinition({
      name: 'voice_name',
      type: ParameterType.ENUM,
      description: 'The voice to use.',
      defaultValue: 'Kore',
      enumValues: ['Kore', 'Zephyr']
    }),
    new ParameterDefinition({
      name: 'speed',
      type: ParameterType.FLOAT,
      description: 'The speech speed.',
      required: true
    })
  ]);

  it('deserializes dict schema into ParameterSchema', () => {
    const model = new AudioModel({
      name: 'test-model',
      value: 'test-model-v1',
      provider: MultimediaProvider.GEMINI,
      clientClass: DummyAudioClient,
      parameterSchema: sampleSchemaDict
    });

    expect(model.parameterSchema).toBeInstanceOf(ParameterSchema);
    expect(model.parameterSchema.parameters.length).toBe(2);

    const voiceParam = model.parameterSchema.getParameter('voice_name');
    expect(voiceParam).toBeDefined();
    expect(voiceParam?.type).toBe(ParameterType.ENUM);
    expect(voiceParam?.defaultValue).toBe('Kore');
  });

  it('accepts ParameterSchema directly', () => {
    const model = new AudioModel({
      name: 'test-model',
      value: 'test-model-v1',
      provider: MultimediaProvider.GEMINI,
      clientClass: DummyAudioClient,
      parameterSchema: sampleSchemaObject
    });

    expect(model.parameterSchema).toBe(sampleSchemaObject);
    expect(model.parameterSchema.parameters.length).toBe(2);
  });

  it('creates empty schema when none provided', () => {
    const model = new AudioModel({
      name: 'test-model',
      value: 'test-model-v1',
      provider: MultimediaProvider.GEMINI,
      clientClass: DummyAudioClient
    });

    expect(model.parameterSchema).toBeInstanceOf(ParameterSchema);
    expect(model.parameterSchema.parameters.length).toBe(0);
  });

  it('populates default config from schema defaults', () => {
    const model = new AudioModel({
      name: 'test-model',
      value: 'test-model-v1',
      provider: MultimediaProvider.GEMINI,
      clientClass: DummyAudioClient,
      parameterSchema: sampleSchemaDict
    });

    expect(model.defaultConfig).toBeInstanceOf(MultimediaConfig);
    expect(model.defaultConfig.toDict()).toEqual({ voice_name: 'Kore' });
  });

  it('defaults to empty config when no defaults present', () => {
    const schema = {
      parameters: [
        { name: 'speed', type: 'float', description: 'speed', required: true }
      ]
    };

    const model = new AudioModel({
      name: 'test-model',
      value: 'test-model-v1',
      provider: MultimediaProvider.GEMINI,
      clientClass: DummyAudioClient,
      parameterSchema: schema
    });

    expect(model.defaultConfig.toDict()).toEqual({});
  });
});
