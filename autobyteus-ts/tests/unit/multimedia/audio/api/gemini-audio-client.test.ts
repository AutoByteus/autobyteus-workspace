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
const initializeClientMock = vi.fn();
vi.mock('../../../../../src/utils/gemini-helper.js', () => ({
  initializeGeminiClientWithRuntime: (...args: unknown[]) => initializeClientMock(...args)
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
  beforeEach(() => {
    generateContentMock.mockReset();
    initializeClientMock.mockReset().mockImplementation(() => ({
      client: { models: { generateContent: generateContentMock } },
      runtimeInfo: { runtime: 'api_key' }
    }));
  });

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
      const result = await client.generateSpeech('Joe: Hello\nJane: Hi\nJoe: See you', {
        mode: 'multi-speaker', style_instructions: 'warm', speaker_mapping: [
          { speaker: 'Joe', voice: 'Puck' }, { speaker: 'Jane', voice: 'Kore' }
        ], turn_styles: [' whisper ', null, 'excited']
      });
      expect(body).toMatchObject({
        contents: [{ role: 'user', parts: [
          { text: 'Hello', speechMetadata: { speaker: 'Joe', style: 'whisper' } },
          { text: 'Hi', speechMetadata: { speaker: 'Jane', style: 'warm' } },
          { text: 'See you', speechMetadata: { speaker: 'Joe', style: 'excited' } }
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

  it.each(['ar-001-advisor-1', 'achernar', 'unverified-provider-id', 'Kore'])(
    'forwards single-speaker voice ID unchanged: %s', async (voice_name) => {
      generateContentMock.mockResolvedValue(reply(wav(), 'audio/wav'));
      const result = await clientFor().generateSpeech('Verbatim: text.', { voice_name });
      expect(generateContentMock.mock.calls[0][0]).toMatchObject({
        contents: [{ role: 'user', parts: [{ text: 'Verbatim: text.' }] }],
        config: { speechConfig: { voiceConfig: { voice: voice_name } } }
      });
      await fs.unlink(result.audio_urls[0]);
    }
  );

  it.each(['', ' ', ' Kore', 'Kore ', 7, null, {}, undefined])(
    'rejects invalid supplied voice shape before initialization: %j', async (voice_name) => {
      await expect(clientFor().generateSpeech('Hello', { voice_name }))
        .rejects.toThrow('voice_name must be a nonempty string without surrounding whitespace');
      expect(initializeClientMock).not.toHaveBeenCalled();
      expect(generateContentMock).not.toHaveBeenCalled();
    }
  );

  it.each([
    [null, '', '   '],
    ['', null, ''],
  ])('inherits the trimmed global style for blank/null turn entries: %j', async (...turn_styles) => {
    generateContentMock.mockResolvedValue(reply(wav()));
    const result = await clientFor().generateSpeech('Joe: One: first\r\nJane: Two\r\nJoe: Three', {
      mode: 'multi-speaker', style_instructions: ' warm ', turn_styles,
      speaker_mapping: [{ speaker: 'Joe', voice: 'Puck' }, { speaker: 'Jane', voice: 'Kore' }]
    });
    expect(generateContentMock.mock.calls[0][0].contents[0].parts).toEqual([
      { text: 'One: first', speechMetadata: { speaker: 'Joe', style: 'warm' } },
      { text: 'Two', speechMetadata: { speaker: 'Jane', style: 'warm' } },
      { text: 'Three', speechMetadata: { speaker: 'Joe', style: 'warm' } }
    ]);
    await fs.unlink(result.audio_urls[0]);
  });

  it('omits absent style metadata and preserves inactive voice/mapping fields', async () => {
    generateContentMock.mockResolvedValue(reply(wav()));
    const result = await clientFor().generateSpeech('Joe: One\nJoe: Two', {
      mode: 'multi-speaker', voice_name: null, turn_styles: [null, ''],
      speaker_mapping: [{ speaker: 'Joe', voice: 'Puck' }],
      arbitrary_provider_field: 'not forwarded'
    });
    expect(generateContentMock.mock.calls[0][0].contents[0].parts).toEqual([
      { text: 'One', speechMetadata: { speaker: 'Joe' } },
      { text: 'Two', speechMetadata: { speaker: 'Joe' } }
    ]);
    expect(generateContentMock.mock.calls[0][0].config).not.toHaveProperty('arbitrary_provider_field');
    await fs.unlink(result.audio_urls[0]);
    const single = await clientFor().generateSpeech('Hello', { speaker_mapping: 'inactive' });
    expect(generateContentMock.mock.calls[1][0].config.speechConfig).toEqual({ voiceConfig: { voice: 'Kore' } });
    await fs.unlink(single.audio_urls[0]);
  });

  it.each([null, undefined, 'whisper', {}, [], ['one'], ['one', 'two', 'three'], [1, null], [null, false], [undefined, ''], Array(2)]
    .map((turn_styles) => ({ turn_styles })))(
    'rejects wrong turn style shape/count before initialization: %j', async ({ turn_styles }) => {
      await expect(clientFor().generateSpeech('Joe: One\nJane: Two', {
        mode: 'multi-speaker', turn_styles,
        speaker_mapping: [{ speaker: 'Joe', voice: 'Puck' }, { speaker: 'Jane', voice: 'Kore' }]
      })).rejects.toThrow(/turn_styles/);
      expect(initializeClientMock).not.toHaveBeenCalled();
      expect(generateContentMock).not.toHaveBeenCalled();
    }
  );

  it.each([[], ['whisper'], null, undefined].map((turn_styles) => ({ turn_styles })))(
    'rejects supplied turn_styles in single mode: %j', async ({ turn_styles }) => {
      await expect(clientFor().generateSpeech('Hello', { turn_styles })).rejects.toThrow('only supported in multi-speaker mode');
      expect(initializeClientMock).not.toHaveBeenCalled();
      expect(generateContentMock).not.toHaveBeenCalled();
    }
  );

  it('uses model config values and call overrides through the same current ID/style path', async () => {
    generateContentMock.mockResolvedValue(reply(wav()));
    const client = new GeminiAudioClient(
      { name: 'gemini-3.8-flash-tts', value: 'gemini-3.8-flash-tts' } as any,
      new MultimediaConfig({ voice_name: 'ar-001-advisor-1', style_instructions: ' warm ' }),
      geminiProviderApiKeyResolver({ aiStudio: 'synthetic' }), geminiRuntimeResolver()
    );
    const configured = await client.generateSpeech('Configured');
    expect(generateContentMock.mock.calls[0][0].config.speechConfig).toEqual({ voiceConfig: { voice: 'ar-001-advisor-1' } });
    const overridden = await client.generateSpeech('Override', { voice_name: 'achernar', style_instructions: '' });
    expect(generateContentMock.mock.calls[1][0].config.speechConfig).toEqual({ voiceConfig: { voice: 'achernar' } });
    expect(generateContentMock.mock.calls[1][0].contents[0].parts).toEqual([{ text: 'Override' }]);
    await fs.unlink(configured.audio_urls[0]);
    await fs.unlink(overridden.audio_urls[0]);
  });

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
    ['Joe: Hi', [{ speaker: 'Joe', voice: 'ar-001-advisor-1' }]],
    ['Joe: Hi', [{ speaker: 'Joe', voice: 'Puck' }, { speaker: 'Unused', voice: 'Kore' }]],
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

  it('uses only the configured Vertex Express credential and forwards the extra ID through the real SDK', async () => {
    const actualHelper = await vi.importActual<typeof import('../../../../../src/utils/gemini-helper.js')>(
      '../../../../../src/utils/gemini-helper.js'
    );
    initializeClientMock.mockImplementation(actualHelper.initializeGeminiClientWithRuntime);
    const keys = geminiProviderApiKeyResolver({ vertexExpress: 'synthetic-configured-key' });
    const resolveKey = vi.spyOn(keys, 'resolve');
    const runtimeResolver = vi.fn(geminiRuntimeResolver({ kind: 'vertexExpress' }));
    let requestUrl = '';
    let body: any;
    const fetchMock = vi.fn(async (input: unknown, init: RequestInit) => {
      requestUrl = String(input);
      body = JSON.parse(String(init.body));
      return new Response(JSON.stringify(reply(wav(), 'audio/wav')), {
        status: 200, headers: { 'content-type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    try {
      const client = new GeminiAudioClient(
        { name: 'gemini-3.8-flash-tts', value: 'gemini-3.8-flash-tts' } as any,
        new MultimediaConfig(), keys, runtimeResolver
      );
      const result = await client.generateSpeech('Exact transcript.', {
        voice_name: 'ar-001-advisor-1', style_instructions: 'quiet'
      });
      expect(runtimeResolver).toHaveBeenCalledTimes(1);
      expect(resolveKey).toHaveBeenCalledExactlyOnceWith('GEMINI', 'geminiVertexExpressApiKey');
      expect(requestUrl).toContain('aiplatform.googleapis.com');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(body.generationConfig.speechConfig).toEqual({ voiceConfig: { voice: 'ar-001-advisor-1' } });
      expect(body.contents[0].parts).toEqual([{ text: 'Exact transcript.', speechMetadata: { style: 'quiet' } }]);
      await fs.unlink(result.audio_urls[0]);
    } finally {
      vi.unstubAllGlobals();
      resolveKey.mockRestore();
    }
  });

  it.each([404, 429])('sanitizes actual SDK HTTP %s bodies without logs, causes or success files', async (status) => {
    const sentinel = 'SYNTHETIC_SECRET_PROVIDER_BODY_SENTINEL';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      error: { code: status, message: sentinel, status: status === 404 ? 'NOT_FOUND' : 'RESOURCE_EXHAUSTED' }
    }), { status, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const logs = (['log', 'info', 'warn', 'error', 'debug'] as const)
      .map((method) => vi.spyOn(console, method).mockImplementation(() => undefined));
    const writeFile = vi.spyOn(fs, 'writeFile');
    try {
      const client = clientFor();
      (client as any).clientPromise = Promise.resolve({
        client: new GoogleGenAI({ apiKey: 'synthetic-wire-key', httpOptions: { retryOptions: { attempts: 1 } } }),
        runtimeInfo: { runtime: 'api_key' }
      });
      const error = await client.generateSpeech('Hello', { voice_name: 'unavailable-id' }).catch((failure) => failure);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(`Google Gemini speech generation failed: Gemini TTS provider request failed (HTTP ${status}).`);
      expect(error.cause).toBeUndefined();
      expect(error.stack).not.toContain(sentinel);
      expect(logs.flatMap((spy) => spy.mock.calls).flat().map(String).join('\n')).not.toContain(sentinel);
      expect(writeFile).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      writeFile.mockRestore();
      logs.forEach((spy) => spy.mockRestore());
      vi.unstubAllGlobals();
    }
  });

  it('sanitizes arbitrary external messages and causes instead of coercing them to text', async () => {
    const sentinel = 'SYNTHETIC_EXTERNAL_SENTINEL';
    generateContentMock.mockRejectedValue(new Error(sentinel, { cause: new Error(sentinel) }));
    const error = await clientFor().generateSpeech('Hello').catch((failure) => failure);
    expect(error.message).toBe('Google Gemini speech generation failed: Gemini TTS provider or audio operation failed.');
    expect(error.cause).toBeUndefined();
    expect(error.stack).not.toContain(sentinel);
  });

  it('reports a fixed configured-runtime category without leaking resolver failure', async () => {
    const sentinel = 'SYNTHETIC_RUNTIME_SECRET_SENTINEL';
    initializeClientMock.mockRejectedValue(new Error(sentinel));
    const error = await clientFor().generateSpeech('Hello').catch((failure) => failure);
    expect(error.message).toContain('configured runtime or credential could not be initialized');
    expect(error.message).not.toContain(sentinel);
    expect(error.cause).toBeUndefined();
    expect(generateContentMock).not.toHaveBeenCalled();
  });
});
