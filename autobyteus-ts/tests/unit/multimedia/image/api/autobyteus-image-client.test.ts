import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AutobyteusImageClient } from '../../../../../src/multimedia/image/api/autobyteus-image-client.js';
import { ImageModel } from '../../../../../src/multimedia/image/image-model.js';
import { MultimediaProvider } from '../../../../../src/multimedia/providers.js';
import { MultimediaRuntime } from '../../../../../src/multimedia/runtimes.js';
import { MultimediaConfig } from '../../../../../src/multimedia/utils/multimedia-config.js';
import { ImageGenerationResponse } from '../../../../../src/multimedia/utils/response-types.js';

const { generateImageMock, cleanupImageSessionMock, closeMock, MockAutobyteusClient } = vi.hoisted(() => {
  const generateImageMock = vi.fn();
  const cleanupImageSessionMock = vi.fn();
  const closeMock = vi.fn();

  class MockAutobyteusClient {
    serverUrl: string;
    constructor(serverUrl: string) {
      this.serverUrl = serverUrl;
    }

    generateImage = generateImageMock;
    cleanupImageSession = cleanupImageSessionMock;
    close = closeMock;
  }

  return { generateImageMock, cleanupImageSessionMock, closeMock, MockAutobyteusClient };
});

vi.mock('../../../../../src/clients/autobyteus-client.js', () => ({
  AutobyteusClient: MockAutobyteusClient
}));

describe('AutobyteusImageClient', () => {
  beforeEach(() => {
    generateImageMock.mockReset();
    cleanupImageSessionMock.mockReset();
    closeMock.mockReset();
  });

  function buildModel(hostUrl: string | null = 'https://autobyteus-host') {
    return new ImageModel({
      name: 'remote-image',
      value: 'remote-image',
      provider: MultimediaProvider.OPENAI,
      clientClass: AutobyteusImageClient,
      runtime: MultimediaRuntime.AUTOBYTEUS,
      hostUrl
    });
  }

  it('throws when hostUrl is missing', () => {
    const model = buildModel(null);
    const config = new MultimediaConfig({});
    expect(() => new AutobyteusImageClient(model, config)).toThrow(/hostUrl/);
  });

  it('generates images via Autobyteus server', async () => {
    const model = buildModel();
    const config = new MultimediaConfig({});
    const client = new AutobyteusImageClient(model, config);
    generateImageMock.mockResolvedValue({ image_urls: ['img.png'] });

    const response = await client.generateImage('hello', ['input.png'], { size: '1024x1024' });

    expect(response).toBeInstanceOf(ImageGenerationResponse);
    expect(response.image_urls).toEqual(['img.png']);
    expect(generateImageMock).toHaveBeenCalledWith(
      model.name,
      'hello',
      ['input.png'],
      null,
      { size: '1024x1024' },
      client.sessionId
    );
  });

  it('edits images via Autobyteus server', async () => {
    const model = buildModel();
    const config = new MultimediaConfig({});
    const client = new AutobyteusImageClient(model, config);
    generateImageMock.mockResolvedValue({ image_urls: ['edited.png'] });

    const response = await client.editImage('edit', ['input.png'], 'mask.png', { size: '1024x1024' });

    expect(response.image_urls).toEqual(['edited.png']);
    expect(generateImageMock).toHaveBeenCalledWith(
      model.name,
      'edit',
      ['input.png'],
      'mask.png',
      { size: '1024x1024' },
      client.sessionId
    );
  });

  it('throws when server returns no image URLs', async () => {
    const model = buildModel();
    const config = new MultimediaConfig({});
    const client = new AutobyteusImageClient(model, config);
    generateImageMock.mockResolvedValue({ image_urls: [] });

    await expect(client.generateImage('hello')).rejects.toThrow(/image URLs/);
  });

  it('cleans up remote session', async () => {
    const model = buildModel();
    const config = new MultimediaConfig({});
    const client = new AutobyteusImageClient(model, config);

    await client.cleanup();

    expect(cleanupImageSessionMock).toHaveBeenCalledWith(client.sessionId);
    expect(closeMock).toHaveBeenCalled();
  });
});
