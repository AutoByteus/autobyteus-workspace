import 'reflect-metadata';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GeminiAudioClient } from 'autobyteus-ts/multimedia/audio/api/gemini-audio-client.js';
import { defaultToolRegistry } from 'autobyteus-ts/tools/registry/tool-registry.js';
import { GeminiJsonSchemaFormatter } from 'autobyteus-ts/tools/usage/formatters/gemini-json-schema-formatter.js';
import { GEMINI_TTS_VOICES } from 'autobyteus-ts/multimedia/audio/gemini-tts-voices.js';
import { registerMediaTools, reloadMediaToolSchemas, unregisterMediaTools } from '../../../src/agent-tools/media/register-media-tools.js';
import { GENERATE_SPEECH_TOOL_NAME } from '../../../src/agent-tools/media/media-tool-contract.js';
import { assertLiveAudioFileBytes } from '../../../../test-support/live-e2e/live-e2e-audio-assertions.js';

// Real tool/parser/service/factory/adapter/installed SDK/path publication; only
// configuration, availability, credentials and HTTP are synthetic. Never paid.
const bindings = vi.hoisted(() => ({
  model: 'gemini-3.8-flash-tts',
  workspace: '',
  resolveKey: vi.fn(async () => ({ revealToTrustedConsumer: () => 'synthetic-voice-tool-key' })),
  resolveRuntime: vi.fn(async () => ({ kind: 'vertexExpress' as const })),
}));
vi.mock('../../../src/config/app-config-provider.js', () => ({
  appConfigProvider: { config: {
    get: (key: string) => key === 'DEFAULT_SPEECH_GENERATION_MODEL' ? bindings.model : undefined,
    getAppDataDir: () => bindings.workspace,
  } },
}));
vi.mock('../../../src/llm-management/services/model-availability-service.js', () => ({
  getModelAvailabilityService: () => ({ ensureModelAvailable: async () => undefined }),
}));
vi.mock('../../../src/llm-management/services/gemini-runtime-resolver-adapter.js', () => ({
  createGeminiRuntimeResolver: () => bindings.resolveRuntime,
}));
vi.mock('../../../src/secret-management/resolution/secret-management-provider-api-key-resolver.js', () => ({
  createMediaProviderApiKeyResolver: () => ({ resolve: bindings.resolveKey }),
}));

const wav = (): Buffer => {
  const bytes = Buffer.alloc(48);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(40, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(24000, 24); bytes.writeUInt32LE(48000, 28);
  bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(4, 40);
  bytes.writeInt16LE(100, 44); bytes.writeInt16LE(-100, 46);
  return bytes;
};
const reply = () => ({ candidates: [{ content: { parts: [{
  inlineData: { mimeType: 'audio/wav', data: wav().toString('base64') },
}] } }] });
let registrySnapshot: ReturnType<typeof defaultToolRegistry.snapshot>;
let generatedFiles: string[];
let requests: Array<{ url: string; body: any }>;
let status: number;
const sentinel = 'synthetic-private-provider-body-voice-test';

const executeSpeech = (generation_config?: Record<string, unknown>, prompt = 'Hello from the speech tool.') =>
  defaultToolRegistry.createTool(GENERATE_SPEECH_TOOL_NAME).execute({
    agentId: 'voice-tool-test', runId: 'voice-tool-test', workspaceRootPath: bindings.workspace,
  }, { prompt, output_file_path: 'audio/speech.wav', ...(generation_config ? { generation_config } : {}) }) as Promise<{ file_path: string }>;

beforeEach(async () => {
  bindings.workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'gemini-voice-tool-e2e-'));
  bindings.model = 'gemini-3.8-flash-tts';
  bindings.resolveKey.mockClear(); bindings.resolveRuntime.mockClear();
  generatedFiles = []; requests = []; status = 200;
  registrySnapshot = defaultToolRegistry.snapshot();
  unregisterMediaTools(); registerMediaTools();
  const generateSpeech = GeminiAudioClient.prototype.generateSpeech;
  vi.spyOn(GeminiAudioClient.prototype, 'generateSpeech').mockImplementation(async function (this: GeminiAudioClient, ...args) {
    const result = await generateSpeech.apply(this, args);
    generatedFiles.push(...result.audio_urls);
    return result;
  });
  vi.stubGlobal('fetch', vi.fn(async (input: unknown, init?: RequestInit) => {
    requests.push({ url: String(input), body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify(status === 200 ? reply() : {
      error: { code: status, status: status === 404 ? 'NOT_FOUND' : 'RESOURCE_EXHAUSTED', message: sentinel },
    }), { status, headers: { 'content-type': 'application/json' } });
  }));
});
afterEach(async () => {
  try {
    await Promise.all(generatedFiles.map((file) => fs.rm(file, { force: true })));
    await fs.rm(bindings.workspace, { recursive: true, force: true });
  } finally {
    unregisterMediaTools(); defaultToolRegistry.restore(registrySnapshot);
    vi.restoreAllMocks(); vi.unstubAllGlobals();
  }
});

describe('configured Gemini generate_speech public tool integration (non-paid)', () => {
  it.each(['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'])(
    'exposes the approved model-derived schema through registered %s tool discovery', async (model) => {
      bindings.model = model; reloadMediaToolSchemas();
      const definition = defaultToolRegistry.getToolDefinition(GENERATE_SPEECH_TOOL_NAME)!;
      const schema = definition.argumentSchema!.toJsonSchema() as any;
      expect(schema.required).toEqual(['prompt', 'output_file_path']);
      const config = schema.properties.generation_config;
      expect(config.required).not.toContain('turn_styles');
      expect(config.properties.voice_name).toMatchObject({ type: 'string', default: 'Kore' });
      expect(config.properties.voice_name).not.toHaveProperty('enum');
      expect(config.properties.voice_name.description).toContain('ar-001-advisor-1');
      expect(config.properties.voice_name.description).toContain('Authoritative Advisor 1');
      expect(config.properties.voice_name.description).toContain('Arabic pronunciation/quality not tested');
      expect(config.properties.speaker_mapping.items.properties.voice.enum)
        .toEqual(GEMINI_TTS_VOICES);
      expect(config.properties.turn_styles.type).toBe('array');
      expect(config.properties.turn_styles).not.toHaveProperty('default');
      const formatted = new GeminiJsonSchemaFormatter().provide(definition) as any;
      expect(formatted.parameters.properties.generation_config.properties.turn_styles.items)
        .toEqual({ anyOf: [{ type: 'string' }, { type: 'null' }] });
      expect(requests).toHaveLength(0);
    },
  );

  it('forwards a genuine extra voice ID unchanged and publishes the validated WAV at the requested path', async () => {
    const result = await executeSpeech({ voice_name: 'ar-001-advisor-1', style_instructions: ' warm ' });
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toContain('publishers/google/models/gemini-3.8-flash-tts:generateContent');
    expect(requests[0].body).toMatchObject({
      contents: [{ role: 'user', parts: [{ text: 'Hello from the speech tool.', speechMetadata: { style: 'warm' } }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { voice: 'ar-001-advisor-1' } } },
    });
    expect(bindings.resolveKey).toHaveBeenCalledWith('GEMINI', 'geminiVertexExpressApiKey');
    expect(result).toEqual({ file_path: path.join(bindings.workspace, 'audio/speech.wav') });
    const bytes = await fs.readFile(result.file_path);
    assertLiveAudioFileBytes(bytes, 'GEMINI'); expect(bytes).toEqual(wav());
  });

  it('uses old omitted-config arguments directly with the preserved Kore default', async () => {
    const result = await executeSpeech();
    expect(requests[0].body.generationConfig.speechConfig).toEqual({ voiceConfig: { voice: 'Kore' } });
    expect(await fs.readFile(result.file_path)).toEqual(wav());
  });

  it('preserves three-turn order/text/speaker association and nullable override/inheritance through tool coercion', async () => {
    await executeSpeech({
      mode: 'multi-speaker', style_instructions: ' natural ', turn_styles: [' whisper ', null, ' excited '],
      speaker_mapping: [{ speaker: 'Narrator', voice: 'Kore' }, { speaker: 'Guest', voice: 'Puck' }],
    }, 'Narrator: First: the door is open.\nGuest: Second, welcome!\nNarrator: Third, let us begin.');
    expect(requests).toHaveLength(1);
    expect(requests[0].body.contents[0].parts).toEqual([
      { text: 'First: the door is open.', speechMetadata: { speaker: 'Narrator', style: 'whisper' } },
      { text: 'Second, welcome!', speechMetadata: { speaker: 'Guest', style: 'natural' } },
      { text: 'Third, let us begin.', speechMetadata: { speaker: 'Narrator', style: 'excited' } },
    ]);
    expect(requests[0].body.generationConfig.speechConfig).toEqual({
      multiSpeakerVoiceConfig: { speakerVoiceConfigs: [
        { speaker: 'Narrator', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        { speaker: 'Guest', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
      ] },
    });
  });

  it('uses historical global-only dialogue arguments directly without migration', async () => {
    await executeSpeech({ mode: 'multi-speaker', style_instructions: 'calm',
      speaker_mapping: [{ speaker: 'Narrator', voice: 'Kore' }],
    }, 'Narrator: One.\nNarrator: Two.');
    expect(requests[0].body.contents[0].parts).toEqual([
      { text: 'One.', speechMetadata: { speaker: 'Narrator', style: 'calm' } },
      { text: 'Two.', speechMetadata: { speaker: 'Narrator', style: 'calm' } },
    ]);
  });

  it.each([
    { turn_styles: ['one'] }, { turn_styles: [false, null] }, { turn_styles: null },
    { speaker_mapping: [{ speaker: 'Narrator', voice: 'ar-001-advisor-1' }] },
    { speaker_mapping: [{ speaker: 'Unknown', voice: 'Kore' }] },
  ])('rejects unsupported dialogue input before credentials/HTTP and publishes no success: %j', async (invalid) => {
    await expect(executeSpeech({ mode: 'multi-speaker',
      speaker_mapping: [{ speaker: 'Narrator', voice: 'Kore' }], ...invalid,
    }, 'Narrator: One.\nNarrator: Two.')).rejects.toThrow();
    expect(bindings.resolveRuntime).not.toHaveBeenCalled();
    expect(bindings.resolveKey).not.toHaveBeenCalled(); expect(requests).toHaveLength(0);
    await expect(fs.stat(path.join(bindings.workspace, 'audio/speech.wav'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it.each([404, 429])('returns only safe HTTP %s on selected-provider failure and preserves existing output', async (code) => {
    status = code;
    const output = path.join(bindings.workspace, 'audio/speech.wav');
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, 'previous-owned-output');
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = await executeSpeech({ voice_name: 'unavailable-provider-id' }).catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(`provider request failed (HTTP ${code})`);
    expect((error as Error).message).not.toContain(sentinel);
    expect(JSON.stringify([log.mock.calls, warn.mock.calls])).not.toContain(sentinel);
    expect(await fs.readFile(output, 'utf8')).toBe('previous-owned-output');
    expect(generatedFiles).toEqual([]);
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.every(({ url, body }) => url.includes('publishers/google/models/gemini-3.8-flash-tts:generateContent')
      && body.generationConfig.speechConfig.voiceConfig.voice === 'unavailable-provider-id')).toBe(true);
    expect(bindings.resolveKey).toHaveBeenCalledTimes(1);
    expect(bindings.resolveKey).toHaveBeenCalledWith('GEMINI', 'geminiVertexExpressApiKey');
  });
});
