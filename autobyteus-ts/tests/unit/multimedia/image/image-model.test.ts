import { describe, it, expect } from 'vitest';
import { ImageModel } from '../../../../src/multimedia/image/image-model.js';
import { MultimediaProvider } from '../../../../src/multimedia/providers.js';
import { MultimediaConfig } from '../../../../src/multimedia/utils/multimedia-config.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../../src/utils/parameter-schema.js';
import { BaseImageClient } from '../../../../src/multimedia/image/base-image-client.js';

class DummyImageClient extends BaseImageClient {
  async generateImage(): Promise<any> {
    return { image_urls: [] };
  }

  async editImage(): Promise<any> {
    return { image_urls: [] };
  }
}

describe('ImageModel', () => {
  const sampleSchemaDict = {
    parameters: [
      {
        name: 'quality',
        type: 'enum',
        description: 'The quality setting.',
        required: false,
        defaultValue: 'standard',
        enumValues: ['standard', 'hd']
      }
    ]
  };

  const sampleSchemaObject = new ParameterSchema([
    new ParameterDefinition({
      name: 'quality',
      type: ParameterType.ENUM,
      description: 'The quality setting.',
      defaultValue: 'standard',
      enumValues: ['standard', 'hd']
    })
  ]);

  it('deserializes dict schema into ParameterSchema', () => {
    const model = new ImageModel({
      name: 'test-model',
      value: 'test-model-v1',
      provider: MultimediaProvider.GEMINI,
      clientClass: DummyImageClient,
      parameterSchema: sampleSchemaDict
    });

    expect(model.parameterSchema).toBeInstanceOf(ParameterSchema);
    expect(model.parameterSchema.parameters.length).toBe(1);

    const qualityParam = model.parameterSchema.getParameter('quality');
    expect(qualityParam).toBeDefined();
    expect(qualityParam?.type).toBe(ParameterType.ENUM);
    expect(qualityParam?.defaultValue).toBe('standard');
  });

  it('accepts ParameterSchema directly', () => {
    const model = new ImageModel({
      name: 'test-model',
      value: 'test-model-v1',
      provider: MultimediaProvider.GEMINI,
      clientClass: DummyImageClient,
      parameterSchema: sampleSchemaObject
    });

    expect(model.parameterSchema).toBe(sampleSchemaObject);
  });

  it('creates empty schema when none provided', () => {
    const model = new ImageModel({
      name: 'test-model',
      value: 'test-model-v1',
      provider: MultimediaProvider.GEMINI,
      clientClass: DummyImageClient
    });

    expect(model.parameterSchema).toBeInstanceOf(ParameterSchema);
    expect(model.parameterSchema.parameters.length).toBe(0);
  });

  it('populates default config from schema defaults', () => {
    const model = new ImageModel({
      name: 'test-model',
      value: 'test-model-v1',
      provider: MultimediaProvider.GEMINI,
      clientClass: DummyImageClient,
      parameterSchema: sampleSchemaDict
    });

    expect(model.defaultConfig).toBeInstanceOf(MultimediaConfig);
    expect(model.defaultConfig.toDict()).toEqual({ quality: 'standard' });
  });
});
