import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ReadMediaFile } from '../../../../src/tools/multimedia/media-reader-tool.js';
import { ContextFile } from '../../../../src/agent/message/context-file.js';
import { ContextFileType } from '../../../../src/agent/message/context-file-type.js';

const IMAGE_BYTES = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==', 'base64');
const SMALL_AUDIO_BYTES = Buffer.from('small-audio-fixture');
const SMALL_VIDEO_BYTES = Buffer.from('small-video-fixture');

describe('ReadMediaFile tool (unit)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'read-media-unit-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('resolves a relative path inside workspace', async () => {
    const imagePath = path.join(tempDir, 'test_image.png');
    await fs.writeFile(imagePath, IMAGE_BYTES);

    const tool = new ReadMediaFile();
    const context = {
      agentId: 'agent-1',
      workspaceRootPath: tempDir
    };

    const result = await tool.execute(context, { file_path: 'test_image.png' });

    expect(result).toBeInstanceOf(ContextFile);
    expect(result.uri).toBe(imagePath);
    expect(result.fileName).toBe('test_image.png');
    expect(result.fileType).toBe(ContextFileType.IMAGE);
  });

  it('returns typed context files for small workspace audio and video files', async () => {
    const audioPath = path.join(tempDir, 'sample.mp3');
    const videoPath = path.join(tempDir, 'clip.mp4');
    await fs.writeFile(audioPath, SMALL_AUDIO_BYTES);
    await fs.writeFile(videoPath, SMALL_VIDEO_BYTES);

    const tool = new ReadMediaFile();
    const context = {
      agentId: 'agent-1',
      workspaceRootPath: tempDir
    };

    const audioResult = await tool.execute(context, { file_path: 'sample.mp3' });
    const videoResult = await tool.execute(context, { file_path: 'clip.mp4' });

    expect(audioResult).toBeInstanceOf(ContextFile);
    expect(audioResult.uri).toBe(audioPath);
    expect(audioResult.fileName).toBe('sample.mp3');
    expect(audioResult.fileType).toBe(ContextFileType.AUDIO);

    expect(videoResult).toBeInstanceOf(ContextFile);
    expect(videoResult.uri).toBe(videoPath);
    expect(videoResult.fileName).toBe('clip.mp4');
    expect(videoResult.fileType).toBe(ContextFileType.VIDEO);
  });

  it('requires workspace for relative paths', async () => {
    const tool = new ReadMediaFile();
    const context = { agentId: 'agent-2', workspaceRootPath: null };

    await expect(tool.execute(context, { file_path: 'missing.png' }))
      .rejects
      .toThrow('workspace does not support file system path resolution');
  });
});
