import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { GenerateImageTool, EditImageTool } from '../../../../src/tools/multimedia/image-tools.js';
import { ImageClientFactory } from '../../../../src/multimedia/image/image-client-factory.js';
import { downloadFileFromUrl } from '../../../../src/utils/download-utils.js';

vi.mock('../../../../src/utils/download-utils.js', () => ({
  downloadFileFromUrl: vi.fn()
}));

describe('Image tools', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'image-tool-'));
    process.env.DEFAULT_IMAGE_GENERATION_MODEL = 'gpt-image-1.5';
    process.env.DEFAULT_IMAGE_EDIT_MODEL = 'gpt-image-1.5';
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    delete process.env.DEFAULT_IMAGE_GENERATION_MODEL;
    delete process.env.DEFAULT_IMAGE_EDIT_MODEL;
    vi.restoreAllMocks();
  });

  it('generates image and downloads result', async () => {
    const generateImageMock = vi.fn().mockResolvedValue({ image_urls: ['http://example.com/image.png'] });
    vi.spyOn(ImageClientFactory, 'createImageClient').mockReturnValue({
      generateImage: generateImageMock
    } as any);

    const tool = new GenerateImageTool();
    const context = { agentId: 'agent-1', workspace: { getBasePath: () => tempDir } };

    const result = await tool.execute(context, {
      prompt: 'draw a cat',
      output_file_path: 'images/cat.png'
    });

    const resolvedPath = path.join(tempDir, 'images', 'cat.png');
    expect(result).toEqual({ file_path: resolvedPath });
    expect(downloadFileFromUrl).toHaveBeenCalledWith('http://example.com/image.png', resolvedPath);

    await tool.cleanup();
  });

  it('edits image and downloads result', async () => {
    const editImageMock = vi.fn().mockResolvedValue({ image_urls: ['http://example.com/edited.png'] });
    vi.spyOn(ImageClientFactory, 'createImageClient').mockReturnValue({
      editImage: editImageMock
    } as any);

    const tool = new EditImageTool();
    const context = { agentId: 'agent-2', workspace: { getBasePath: () => tempDir } };

    const result = await tool.execute(context, {
      prompt: 'edit',
      output_file_path: 'images/edited.png',
      input_images: 'http://example.com/source.png'
    });

    const resolvedPath = path.join(tempDir, 'images', 'edited.png');
    expect(result).toEqual({ file_path: resolvedPath });
    expect(downloadFileFromUrl).toHaveBeenCalledWith('http://example.com/edited.png', resolvedPath);

    await tool.cleanup();
  });
});
