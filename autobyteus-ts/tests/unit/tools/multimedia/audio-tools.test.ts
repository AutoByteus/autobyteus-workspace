import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { GenerateSpeechTool } from '../../../../src/tools/multimedia/audio-tools.js';
import { AudioClientFactory } from '../../../../src/multimedia/audio/audio-client-factory.js';
import { downloadFileFromUrl } from '../../../../src/utils/download-utils.js';

vi.mock('../../../../src/utils/download-utils.js', () => ({
  downloadFileFromUrl: vi.fn()
}));

describe('GenerateSpeechTool', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'speech-tool-'));
    process.env.DEFAULT_SPEECH_GENERATION_MODEL = 'gpt-4o-mini-tts';
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    delete process.env.DEFAULT_SPEECH_GENERATION_MODEL;
    vi.restoreAllMocks();
  });

  it('builds dynamic schema with generation_config', () => {
    const schema = GenerateSpeechTool.getArgumentSchema();
    const genConfig = schema.getParameter('generation_config');
    expect(genConfig).toBeDefined();
    expect(genConfig?.objectSchema?.parameters.length).toBeGreaterThan(0);
  });

  it('executes and downloads generated audio', async () => {
    const generateSpeechMock = vi.fn().mockResolvedValue({ audio_urls: ['http://example.com/audio.wav'] });
    vi.spyOn(AudioClientFactory, 'createAudioClient').mockReturnValue({
      generateSpeech: generateSpeechMock
    } as any);

    const tool = new GenerateSpeechTool();
    const context = { agentId: 'agent-1', workspace: { getBasePath: () => tempDir } };

    const result = await tool.execute(context, {
      prompt: 'hello',
      output_file_path: 'audio/out.wav'
    });

    const resolvedPath = path.join(tempDir, 'audio', 'out.wav');
    expect(result).toEqual({ file_path: resolvedPath });
    expect(downloadFileFromUrl).toHaveBeenCalledWith('http://example.com/audio.wav', resolvedPath);
  });
});
