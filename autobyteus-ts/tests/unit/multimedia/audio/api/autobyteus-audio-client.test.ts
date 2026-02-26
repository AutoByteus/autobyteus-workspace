import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AutobyteusAudioClient } from '../../../../../src/multimedia/audio/api/autobyteus-audio-client.js';
import { AudioModel } from '../../../../../src/multimedia/audio/audio-model.js';
import { MultimediaProvider } from '../../../../../src/multimedia/providers.js';
import { MultimediaRuntime } from '../../../../../src/multimedia/runtimes.js';
import { MultimediaConfig } from '../../../../../src/multimedia/utils/multimedia-config.js';
import { SpeechGenerationResponse } from '../../../../../src/multimedia/utils/response-types.js';

const { generateSpeechMock, cleanupAudioSessionMock, closeMock, MockAutobyteusClient } = vi.hoisted(() => {
  const generateSpeechMock = vi.fn();
  const cleanupAudioSessionMock = vi.fn();
  const closeMock = vi.fn();

  class MockAutobyteusClient {
    serverUrl: string;
    constructor(serverUrl: string) {
      this.serverUrl = serverUrl;
    }

    generateSpeech = generateSpeechMock;
    cleanupAudioSession = cleanupAudioSessionMock;
    close = closeMock;
  }

  return { generateSpeechMock, cleanupAudioSessionMock, closeMock, MockAutobyteusClient };
});

vi.mock('../../../../../src/clients/autobyteus-client.js', () => ({
  AutobyteusClient: MockAutobyteusClient
}));

describe('AutobyteusAudioClient', () => {
  beforeEach(() => {
    generateSpeechMock.mockReset();
    cleanupAudioSessionMock.mockReset();
    closeMock.mockReset();
  });

  function buildModel(hostUrl: string | null = 'https://autobyteus-host') {
    return new AudioModel({
      name: 'remote-tts',
      value: 'remote-tts',
      provider: MultimediaProvider.OPENAI,
      clientClass: AutobyteusAudioClient,
      runtime: MultimediaRuntime.AUTOBYTEUS,
      hostUrl
    });
  }

  it('throws when hostUrl is missing', () => {
    const model = buildModel(null);
    const config = new MultimediaConfig({});
    expect(() => new AutobyteusAudioClient(model, config)).toThrow(/hostUrl/);
  });

  it('generates speech via Autobyteus server', async () => {
    const model = buildModel();
    const config = new MultimediaConfig({});
    const client = new AutobyteusAudioClient(model, config);
    generateSpeechMock.mockResolvedValue({ audio_urls: ['file.wav'] });

    const response = await client.generateSpeech('hello', { voice: 'test' });

    expect(response).toBeInstanceOf(SpeechGenerationResponse);
    expect(response.audio_urls).toEqual(['file.wav']);
    expect(generateSpeechMock).toHaveBeenCalledWith(
      model.name,
      'hello',
      { voice: 'test' },
      client.sessionId
    );
  });

  it('throws when server returns no audio URLs', async () => {
    const model = buildModel();
    const config = new MultimediaConfig({});
    const client = new AutobyteusAudioClient(model, config);
    generateSpeechMock.mockResolvedValue({ audio_urls: [] });

    await expect(client.generateSpeech('hello')).rejects.toThrow(/audio URLs/);
  });

  it('cleans up remote session', async () => {
    const model = buildModel();
    const config = new MultimediaConfig({});
    const client = new AutobyteusAudioClient(model, config);

    await client.cleanup();

    expect(cleanupAudioSessionMock).toHaveBeenCalledWith(client.sessionId);
    expect(closeMock).toHaveBeenCalled();
  });
});
