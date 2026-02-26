import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { OpenAIAudioClient } from '../../../../../src/multimedia/audio/api/openai-audio-client.js';
import { MultimediaConfig } from '../../../../../src/multimedia/utils/multimedia-config.js';

const createMock = vi.fn();

vi.mock('openai', () => {
  return {
    default: class {
      audio = { speech: { create: createMock } };
      constructor() {
        // no-op
      }
    }
  };
});

describe('OpenAIAudioClient', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
    createMock.mockReset();
  });

  afterEach(async () => {
    createMock.mockReset();
  });

  it('generates speech and writes audio file', async () => {
    const fakeBytes = Uint8Array.from([1, 2, 3, 4]);
    createMock.mockResolvedValue({
      arrayBuffer: async () => fakeBytes.buffer
    });

    const model = { name: 'test-model', value: 'gpt-4o-mini-tts' } as any;
    const client = new OpenAIAudioClient(model, new MultimediaConfig());

    const response = await client.generateSpeech('hello world');
    expect(response.audio_urls.length).toBe(1);

    const audioPath = response.audio_urls[0];
    const stat = await fs.stat(audioPath);
    expect(stat.isFile()).toBe(true);
    expect(path.extname(audioPath)).toBe('.mp3');

    await fs.unlink(audioPath);
  });
});
