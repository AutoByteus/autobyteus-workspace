import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  GenerateSpeechTool,
  _getConfiguredModelIdentifier
} from '../../../../src/tools/multimedia/audio-tools.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../../src/utils/parameter-schema.js';

const originalEnv = { ...process.env };

const makeContext = (basePath: string) => ({
  agentId: 'test-agent',
  workspace: {
    getBasePath: () => basePath
  }
});

const isVertexRuntime = () =>
  Boolean(
    process.env.VERTEX_AI_API_KEY
      || (process.env.VERTEX_AI_PROJECT && process.env.VERTEX_AI_LOCATION)
  );

const runMultiSpeaker = isVertexRuntime() ? it.skip : it;

describe('Audio tools integration', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audio-tools-int-'));
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('reads configured model identifier with fallback', () => {
    process.env.TEST_AUDIO_MODEL = 'test-audio-model';
    expect(_getConfiguredModelIdentifier('TEST_AUDIO_MODEL', 'fallback')).toBe('test-audio-model');
    delete process.env.TEST_AUDIO_MODEL;
    expect(_getConfiguredModelIdentifier('TEST_AUDIO_MODEL', 'fallback-model')).toBe('fallback-model');
  });

  it('throws when configured model identifier is missing and no fallback provided', () => {
    delete process.env.TEST_AUDIO_MODEL;
    expect(() => _getConfiguredModelIdentifier('TEST_AUDIO_MODEL')).toThrow('environment variable is not set');
  });

  it('builds dynamic schema for speech generation', () => {
    process.env.DEFAULT_SPEECH_GENERATION_MODEL = 'gemini-2.5-flash-tts';

    const schema = GenerateSpeechTool.getArgumentSchema();
    expect(schema).toBeInstanceOf(ParameterSchema);

    const params = { ...Object.fromEntries(schema.parameters.map((p) => [p.name, p])) };
    expect(params.prompt).toBeDefined();
    expect(params.generation_config).toBeDefined();

    const configParam = params.generation_config as ParameterDefinition;
    expect(configParam.type).toBe(ParameterType.OBJECT);
    const objectSchema = configParam.objectSchema as ParameterSchema;
    expect(objectSchema).toBeInstanceOf(ParameterSchema);

    const speakerMapping = objectSchema.getParameter('speaker_mapping');
    expect(speakerMapping?.type).toBe(ParameterType.ARRAY);
    expect(speakerMapping?.arrayItemSchema).toBeInstanceOf(ParameterSchema);

    const itemSchema = speakerMapping?.arrayItemSchema as ParameterSchema;
    const speakerParam = itemSchema.getParameter('speaker');
    const voiceParam = itemSchema.getParameter('voice');

    expect(speakerParam?.type).toBe(ParameterType.STRING);
    expect(speakerParam?.required).toBe(true);
    expect(voiceParam?.type).toBe(ParameterType.ENUM);
    expect(voiceParam?.required).toBe(true);
  });

  it('generates single-speaker audio', async () => {
    const tool = new GenerateSpeechTool();
    const context = makeContext(tempDir);

    const result = await tool.execute(context, {
      prompt: 'This is a test of the single-speaker speech generation tool.',
      output_file_path: 'single_speaker.wav'
    });

    const filePath = result.file_path as string;
    expect(filePath.endsWith('.wav')).toBe(true);

    const stats = await fs.stat(filePath);
    expect(stats.isFile()).toBe(true);
    expect(stats.size).toBeGreaterThan(50);
  }, 120000);

  runMultiSpeaker('generates multi-speaker audio', async () => {
    const tool = new GenerateSpeechTool();
    const context = makeContext(tempDir);

    const result = await tool.execute(context, {
      prompt: 'Joe: Hello, this is Joe.\nJane: And this is Jane, testing the multi-speaker functionality.',
      generation_config: {
        mode: 'multi-speaker',
        speaker_mapping: [
          { speaker: 'Joe', voice: 'Puck' },
          { speaker: 'Jane', voice: 'Kore' }
        ],
        style_instructions: 'Speak in a clear, conversational tone.'
      },
      output_file_path: 'multi_speaker.wav'
    });

    const filePath = result.file_path as string;
    expect(filePath.endsWith('.wav')).toBe(true);

    const stats = await fs.stat(filePath);
    expect(stats.isFile()).toBe(true);
    expect(stats.size).toBeGreaterThan(50);
  }, 120000);
});
