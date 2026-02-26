import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { SpeechGenerationResponse } from '../../../../../src/multimedia/index.js';
import { AudioClientFactory } from '../../../../../src/multimedia/audio/audio-client-factory.js';

const apiKey = process.env.OPENAI_API_KEY;
const runIntegration = apiKey ? describe : describe.skip;

async function cleanup(pathToRemove: string): Promise<void> {
  try {
    await fs.unlink(pathToRemove);
  } catch {
    // ignore cleanup errors
  }
}

runIntegration('OpenAIAudioClient integration', () => {
  it('generates speech with default settings', async () => {
    const client = AudioClientFactory.createAudioClient('gpt-4o-mini-tts');
    const response = await client.generateSpeech('Hello from the OpenAI TTS integration test.');

    expect(response).toBeInstanceOf(SpeechGenerationResponse);
    expect(response.audio_urls.length).toBeGreaterThan(0);
    const audioPath = response.audio_urls[0];
    expect(audioPath.endsWith('.mp3')).toBe(true);
    const stats = await fs.stat(audioPath);
    expect(stats.isFile()).toBe(true);
    expect(stats.size).toBeGreaterThan(0);

    await cleanup(audioPath);
  });

  it('generates speech with voice and format overrides', async () => {
    const client = AudioClientFactory.createAudioClient('gpt-4o-mini-tts');
    const response = await client.generateSpeech(
      'Please read this line slowly using a different voice.',
      { voice: 'ash', format: 'wav', instructions: 'Slow pace, friendly tone.' }
    );

    expect(response).toBeInstanceOf(SpeechGenerationResponse);
    expect(response.audio_urls.length).toBeGreaterThan(0);
    const audioPath = response.audio_urls[0];
    expect(audioPath.endsWith('.wav')).toBe(true);
    const stats = await fs.stat(audioPath);
    expect(stats.isFile()).toBe(true);
    expect(stats.size).toBeGreaterThan(0);

    await cleanup(audioPath);
  });
});
