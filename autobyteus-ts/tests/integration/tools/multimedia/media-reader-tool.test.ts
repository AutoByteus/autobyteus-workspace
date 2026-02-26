import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ReadMediaFile } from '../../../../src/tools/multimedia/media-reader-tool.js';
import { ContextFile } from '../../../../src/agent/message/context-file.js';
import { ContextFileType } from '../../../../src/agent/message/context-file-type.js';

const IMAGE_BYTES = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==', 'base64');

describe('ReadMediaFile tool (integration)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'read-media-int-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('reads media file with workspace-relative path', async () => {
    const imagePath = path.join(tempDir, 'test_image.png');
    await fs.writeFile(imagePath, IMAGE_BYTES);

    const tool = new ReadMediaFile();
    const context = {
      agentId: 'test-agent-123',
      workspace: {
        getBasePath: () => tempDir
      }
    };

    const result = await tool.execute(context, { file_path: 'test_image.png' });

    expect(result).toBeInstanceOf(ContextFile);
    expect(result.uri).toBe(imagePath);
    expect(result.fileName).toBe('test_image.png');
    expect(result.fileType).toBe(ContextFileType.IMAGE);
  });

  it('reads media file with absolute path', async () => {
    const imagePath = path.join(tempDir, 'test_image.png');
    await fs.writeFile(imagePath, IMAGE_BYTES);

    const tool = new ReadMediaFile();
    const context = {
      agentId: 'test-agent-123',
      workspace: {
        getBasePath: () => tempDir
      }
    };

    const result = await tool.execute(context, { file_path: imagePath });

    expect(result).toBeInstanceOf(ContextFile);
    expect(result.uri).toBe(imagePath);
    expect(result.fileName).toBe('test_image.png');
    expect(result.fileType).toBe(ContextFileType.IMAGE);
  });

  it('throws for non-existent file', async () => {
    const tool = new ReadMediaFile();
    const context = {
      agentId: 'test-agent-123',
      workspace: {
        getBasePath: () => tempDir
      }
    };

    await expect(tool.execute(context, { file_path: 'non_existent_file.jpg' }))
      .rejects
      .toThrow('does not exist');
  });

  it('blocks path traversal outside workspace', async () => {
    const tool = new ReadMediaFile();
    const context = {
      agentId: 'test-agent-123',
      workspace: {
        getBasePath: () => tempDir
      }
    };

    await expect(tool.execute(context, { file_path: '../some_other_file.txt' }))
      .rejects
      .toThrow('attempts to access files outside the agent\'s workspace');
  });
});
