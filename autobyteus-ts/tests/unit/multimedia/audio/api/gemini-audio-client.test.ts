import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import { GoogleGenAI } from '@google/genai';
import { GeminiAudioClient } from '../../../../../src/multimedia/audio/api/gemini-audio-client.js';
import { MultimediaConfig } from '../../../../../src/multimedia/utils/multimedia-config.js';
import {
  geminiProviderApiKeyResolver,
  geminiRuntimeResolver,
} from '../../../provider-api-key-resolver-test-helpers.js';

const generateContentMock = vi.fn();
vi.mock('../../../../../src/utils/gemini-helper.js', () => ({
  initializeGeminiClientWithRuntime: () => ({
    client: { models: { generateContent: generateContentMock } },
    runtimeInfo: { runtime: 'api_key' }
  })
}));

const wav = () => {
  const bytes = Buffer.alloc(48);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(40, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(24000, 24);
  bytes.writeUInt32LE(48000, 28); bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34); bytes.write('data', 36);
  bytes.writeUInt32LE(4, 40); bytes.writeInt16LE(100, 44); bytes.writeInt16LE(-100, 46);
  return bytes;
};
const reply = (bytes: Buffer, mimeType?: string) => ({ candidates: [{ content: { parts: [{
  inlineData: { data: bytes.toString('base64'), mimeType }
}] } }] });
const clientFor = (model = 'gemini-3.8-flash-tts') => new GeminiAudioClient(
  { name: model, value: model } as any,
  new MultimediaConfig(),
  geminiProviderApiKeyResolver({ aiStudio: 'synthetic-gemini-key' }),
  geminiRuntimeResolver(),
);

describe('GeminiAudioClient 3.8 speech contract', () => {
  beforeEach(() => generateContentMock.mockReset());

  it('serializes turn metadata and nested voice config through the installed SDK', async () => {
    let body: Record<string, any> | undefined;
    vi.stubGlobal('fetch', vi.fn(async (_input: unknown, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return new Response(JSON.stringify(reply(wav(), 'audio/wav')), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    }));
    try {
      const client = clientFor();
      (client as any).clientPromise = Promise.resolve({
        client: new GoogleGenAI({ apiKey: 'synthetic-wire-key' }),
        runtimeInfo: { runtime: 'api_key' },
      });
      const result = await client.generateSpeech('Joe: Hello\nJane: Hi', {
        mode: 'multi-speaker', style_instructions: 'warm', speaker_mapping: [
          { speaker: 'Joe', voice: 'Puck' }, { speaker: 'Jane', voice: 'Kore' }
        ]
      });
      expect(body).toMatchObject({
        contents: [{ role: 'user', parts: [
          { text: 'Hello', speechMetadata: { speaker: 'Joe', style: 'warm' } },
          { text: 'Hi', speechMetadata: { speaker: 'Jane', style: 'warm' } }
        ] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: {
          multiSpeakerVoiceConfig: { speakerVoiceConfigs: [
            { speaker: 'Joe', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
            { speaker: 'Jane', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
          ] }
        } }
      });
      await fs.unlink(result.audio_urls[0]);
    } finally { vi.unstubAllGlobals(); }
  });

  it.each(['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'])(
    'sends verbatim styled text to %s and writes a valid WAV', async (model) => {
      generateContentMock.mockResolvedValue(reply(wav()));
      const response = await clientFor(model).generateSpeech('Hello, world!', {
        style_instructions: 'cheerful', voice_name: 'Kore'
      });
      expect(generateContentMock).toHaveBeenCalledWith({
        model,
        contents: [{ role: 'user', parts: [{ text: 'Hello, world!', speechMetadata: { style: 'cheerful' } }] }],
        config: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { voice: 'Kore' } } }
      });
      expect(await fs.readFile(response.audio_urls[0])).toEqual(wav());
      await fs.unlink(response.audio_urls[0]);
    }
  );

  it('maps ordered dialogue turns to two voices without speaking labels', async () => {
    generateContentMock.mockResolvedValue(reply(wav(), 'audio/wav'));
    const result = await clientFor().generateSpeech('Joe: Hi: Jane!\nJane: Hello.', {
      mode: 'multi-speaker', style_instructions: 'warm', speaker_mapping: [
        { speaker: 'Joe', voice: 'Puck' }, { speaker: 'Jane', voice: 'Kore' }
      ]
    });
    expect(generateContentMock.mock.calls[0][0]).toEqual({
      model: 'gemini-3.8-flash-tts',
      contents: [{ role: 'user', parts: [
        { text: 'Hi: Jane!', speechMetadata: { speaker: 'Joe', style: 'warm' } },
        { text: 'Hello.', speechMetadata: { speaker: 'Jane', style: 'warm' } }
      ] }],
      config: { responseModalities: ['AUDIO'], speechConfig: { multiSpeakerVoiceConfig: {
        speakerVoiceConfigs: [
          { speaker: 'Joe', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          { speaker: 'Jane', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
        ]
      } } }
    });
    await fs.unlink(result.audio_urls[0]);
  });

  it.each([
    ['Joe Hi', [{ speaker: 'Joe', voice: 'Puck' }]],
    ['Joe: Hi', [{ speaker: 'Jane', voice: 'Kore' }]],
    ['Joe: Hi', [{ speaker: 'Joe', voice: 'Puck' }, { speaker: 'Joe', voice: 'Kore' }]],
    ['Joe: Hi', [{ speaker: 'Joe', voice: 'unknown' }]],
    ['Joe: Hi', [{ speaker: 'Joe', voice: 'Puck' }, { speaker: 'Jane', voice: 'Kore' }, { speaker: 'Sam', voice: 'Charon' }]],
  ])('rejects invalid dialogue or mapping: %s', async (prompt, speaker_mapping) => {
    await expect(clientFor().generateSpeech(prompt, { mode: 'multi-speaker', speaker_mapping }))
      .rejects.toThrow();
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it('wraps only explicitly described PCM', async () => {
    generateContentMock.mockResolvedValue(reply(Buffer.from([1, 2, 3, 4]), 'audio/pcm;rate=24000;channels=1'));
    const result = await clientFor().generateSpeech('Hello');
    expect((await fs.readFile(result.audio_urls[0])).subarray(0, 4).toString()).toBe('RIFF');
    await fs.unlink(result.audio_urls[0]);
  });

  it.each([
    ['non-PCM format', (bytes: Buffer) => bytes.writeUInt16LE(3, 20)],
    ['zero channels', (bytes: Buffer) => bytes.writeUInt16LE(0, 22)],
    ['zero sample rate', (bytes: Buffer) => bytes.writeUInt32LE(0, 24)],
    ['unsupported bit depth', (bytes: Buffer) => bytes.writeUInt16LE(12, 34)],
    ['incorrect block alignment', (bytes: Buffer) => bytes.writeUInt16LE(0, 32)],
    ['incorrect byte rate', (bytes: Buffer) => bytes.writeUInt32LE(0, 28)],
    ['non-frame-aligned data', (bytes: Buffer) => {
      bytes.writeUInt16LE(2, 22);
      bytes.writeUInt16LE(4, 32);
      bytes.writeUInt32LE(96000, 28);
      bytes.writeUInt32LE(2, 40);
      bytes.writeUInt32LE(38, 4);
      return bytes.subarray(0, 46);
    }],
  ])('rejects malformed WAV: %s', async (_label, change) => {
    const bytes = wav();
    const changed = change(bytes);
    generateContentMock.mockResolvedValue(reply(Buffer.isBuffer(changed) ? changed : bytes, 'audio/wav'));
    await expect(clientFor().generateSpeech('Hello')).rejects.toThrow(/WAV/);
  });

  it.each([
    [Buffer.from([1, 2, 3, 4]), undefined],
    [Buffer.from([1, 2, 3, 4]), 'audio/wav'],
    [Buffer.from([1, 2, 3, 4]), 'audio/pcm'],
    [Buffer.alloc(0), 'audio/wav'],
  ])('rejects missing, malformed or empty audio', async (bytes, mime) => {
    generateContentMock.mockResolvedValue(reply(bytes, mime));
    await expect(clientFor().generateSpeech('Hello')).rejects.toThrow();
  });
});
