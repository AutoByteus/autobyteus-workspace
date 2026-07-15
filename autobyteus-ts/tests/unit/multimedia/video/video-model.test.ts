import { describe, it, expect } from 'vitest';
import { VideoModel } from '../../../../src/multimedia/video/video-model.js';
import { BaseVideoClient } from '../../../../src/multimedia/video/base-video-client.js';
import { MultimediaProvider } from '../../../../src/multimedia/providers.js';
import { MultimediaConfig } from '../../../../src/multimedia/utils/multimedia-config.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../../src/utils/parameter-schema.js';

class DummyVideoClient extends BaseVideoClient {
  async generateVideo(): Promise<any> {
    return { video_urls: [] };
  }
}

describe('VideoModel', () => {
  it('deserializes schema and populates default config', () => {
    const model = new VideoModel({
      name: 'test-video',
      value: 'test-video-v1',
      provider: MultimediaProvider.GEMINI,
      clientClass: DummyVideoClient,
      parameterSchema: {
        parameters: [
          {
            name: 'aspect_ratio',
            type: 'enum',
            description: 'Aspect ratio.',
            defaultValue: '16:9',
            enumValues: ['16:9', '9:16']
          }
        ]
      }
    });

    expect(model.parameterSchema).toBeInstanceOf(ParameterSchema);
    expect(model.defaultConfig).toBeInstanceOf(MultimediaConfig);
    expect(model.defaultConfig.toDict()).toEqual({ aspect_ratio: '16:9' });
  });

  it('accepts ParameterSchema directly', () => {
    const schema = new ParameterSchema([
      new ParameterDefinition({
        name: 'delivery',
        type: ParameterType.ENUM,
        description: 'Delivery.',
        enumValues: ['uri', 'inline'],
        defaultValue: 'uri'
      })
    ]);

    const model = new VideoModel({
      name: 'test-video',
      value: 'test-video-v1',
      provider: MultimediaProvider.GEMINI,
      clientClass: DummyVideoClient,
      parameterSchema: schema
    });

    expect(model.parameterSchema).toBe(schema);
  });
});
