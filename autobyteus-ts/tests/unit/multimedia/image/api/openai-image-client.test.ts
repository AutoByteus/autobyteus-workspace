import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { OpenAIImageClient } from '../../../../../src/multimedia/image/api/openai-image-client.js';
import { MultimediaConfig } from '../../../../../src/multimedia/utils/multimedia-config.js';

const generateMock = vi.fn();
const editMock = vi.fn();

vi.mock('openai', () => {
  return {
    default: class {
      images = { generate: generateMock, edit: editMock };
      constructor() {
        // no-op
      }
    }
  };
});

describe('OpenAIImageClient', () => {
  let tempDir: string;

  beforeEach(async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    generateMock.mockReset();
    editMock.mockReset();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openai-image-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns image URLs from generate', async () => {
    generateMock.mockResolvedValue({ data: [{ url: 'https://example.com/image.png', revised_prompt: 'rev' }] });

    const model = { name: 'test-model', value: 'gpt-image-1.5' } as any;
    const client = new OpenAIImageClient(model, new MultimediaConfig());

    const response = await client.generateImage('a prompt');
    expect(response.image_urls).toEqual(['https://example.com/image.png']);
    expect(response.revised_prompt).toBe('rev');
  });

  it('returns data URIs from base64 responses', async () => {
    generateMock.mockResolvedValue({ data: [{ b64_json: 'abcd' }] });

    const model = { name: 'test-model', value: 'gpt-image-1.5' } as any;
    const client = new OpenAIImageClient(model, new MultimediaConfig({ output_format: 'png' }));

    const response = await client.generateImage('a prompt');
    expect(response.image_urls[0]).toContain('data:image/png;base64,abcd');
  });

  it('edits image using local file path', async () => {
    editMock.mockResolvedValue({ data: [{ url: 'https://example.com/edited.png' }] });

    const imagePath = path.join(tempDir, 'source.png');
    await fs.writeFile(imagePath, Buffer.from('fake'));

    const model = { name: 'test-model', value: 'gpt-image-1.5' } as any;
    const client = new OpenAIImageClient(model, new MultimediaConfig());

    const response = await client.editImage('edit prompt', [imagePath]);
    expect(response.image_urls).toEqual(['https://example.com/edited.png']);
  });
});
