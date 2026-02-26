import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import { SpeechGenerationResponse } from '../../../../../src/multimedia/index.js';
import { AudioClientFactory } from '../../../../../src/multimedia/audio/audio-client-factory.js';

const hasVertexApiKey = Boolean(process.env.VERTEX_AI_API_KEY);
const hasVertex = hasVertexApiKey || Boolean(process.env.VERTEX_AI_PROJECT && process.env.VERTEX_AI_LOCATION);
const hasApiKey = Boolean(process.env.GEMINI_API_KEY);
const runIntegration = hasVertex || hasApiKey ? describe : describe.skip;

async function cleanup(pathToRemove: string): Promise<void> {
  try {
    await fs.unlink(pathToRemove);
  } catch {
    // ignore cleanup errors
  }
}

runIntegration('GeminiAudioClient integration', () => {
  it('generates speech with gemini-2.5-flash-tts', async () => {
    const client = AudioClientFactory.createAudioClient('gemini-2.5-flash-tts');
    const response = await client.generateSpeech('Hello world from the integration test.');

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
