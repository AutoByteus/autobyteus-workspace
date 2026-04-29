import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { OpenAIImageClient } from '../../../../../src/multimedia/image/api/openai-image-client.js';
import { ImageModel } from '../../../../../src/multimedia/image/image-model.js';
import { MultimediaProvider } from '../../../../../src/multimedia/providers.js';
import { MultimediaConfig } from '../../../../../src/multimedia/utils/multimedia-config.js';

const mockGenerate = vi.hoisted(() => vi.fn());
const mockEdit = vi.hoisted(() => vi.fn());
const mockToFile = vi.hoisted(() =>
  vi.fn(async (_value: unknown, name?: string | null, options?: { type?: string }) => ({
    __mockFile: true,
    name,
    type: options?.type
  }))
);

vi.mock('openai', () => {
  const OpenAI = vi.fn();
  OpenAI.prototype.images = {
    generate: mockGenerate,
    edit: mockEdit
  };
  return { default: OpenAI, toFile: mockToFile };
});

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAAEklEQVR4nGP8z4APMOGVHbHSAEEsAROxCnMTAAAAAElFTkSuQmCC',
  'base64'
);

const buildClient = (
  modelValue: string,
  config = new MultimediaConfig({ size: '1024x1024' })
) => {
  const model = new ImageModel({
    name: modelValue,
    value: modelValue,
    provider: MultimediaProvider.OPENAI,
    clientClass: OpenAIImageClient
  });
  return new OpenAIImageClient(model, config);
};

describe('OpenAIImageClient', () => {
  let tempDir: string;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openai-image-client-unit-'));
    mockGenerate.mockReset();
    mockEdit.mockReset();
    mockEdit.mockResolvedValue({
      data: [{ b64_json: 'edited-image-data' }]
    });
    mockToFile.mockClear();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns image URLs from generate', async () => {
    mockGenerate.mockResolvedValue({
      data: [{ url: 'https://example.com/image.png', revised_prompt: 'rev' }]
    });

    const client = buildClient('gpt-image-2');
    const response = await client.generateImage('a prompt');

    expect(response.image_urls).toEqual(['https://example.com/image.png']);
    expect(response.revised_prompt).toBe('rev');
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-image-2',
        prompt: 'a prompt',
        n: 1,
        size: '1024x1024'
      })
    );
  });

  it('returns data URIs from base64 generate responses', async () => {
    mockGenerate.mockResolvedValue({ data: [{ b64_json: 'abcd' }] });

    const client = buildClient(
      'gpt-image-2',
      new MultimediaConfig({ size: '1024x1024', output_format: 'webp' })
    );
    const response = await client.generateImage('a prompt');

    expect(response.image_urls).toEqual(['data:image/webp;base64,abcd']);
  });

  it('returns image URLs from edit responses while using local file paths', async () => {
    mockEdit.mockResolvedValue({ data: [{ url: 'https://example.com/edited.png' }] });
    const inputPath = path.join(tempDir, 'input.png');
    fs.writeFileSync(inputPath, tinyPng);

    const client = buildClient('gpt-image-2');
    const response = await client.editImage('edit prompt', [inputPath]);

    expect(response.image_urls).toEqual(['https://example.com/edited.png']);
  });

  it('uses the current SDK file-array edit payload for GPT Image models', async () => {
    const inputPath = path.join(tempDir, 'input.png');
    const maskPath = path.join(tempDir, 'mask.png');
    fs.writeFileSync(inputPath, tinyPng);
    fs.writeFileSync(maskPath, tinyPng);

    const client = buildClient('gpt-image-2');
    const response = await client.editImage('Add a red star.', [inputPath], maskPath, {
      quality: 'low'
    });

    expect(response.image_urls[0]).toBe('data:image/png;base64,edited-image-data');
    expect(mockEdit).toHaveBeenCalledTimes(1);
    const request = mockEdit.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(request).toMatchObject({
      model: 'gpt-image-2',
      prompt: 'Add a red star.',
      n: 1,
      size: '1024x1024',
      quality: 'low'
    });
    expect(Array.isArray(request.image)).toBe(true);
    expect(request.image).toEqual([{ __mockFile: true, name: 'input.png', type: 'image/png' }]);
    expect(request.mask).toEqual({ __mockFile: true, name: 'mask.png', type: 'image/png' });
  });

  it('keeps the single-file edit payload for non-GPT-image models such as DALL-E 2', async () => {
    const inputPath = path.join(tempDir, 'input.png');
    fs.writeFileSync(inputPath, tinyPng);

    const client = buildClient('dall-e-2');
    await client.editImage('Change the background.', [inputPath], null, {
      quality: 'low',
      output_format: 'webp',
      output_compression: '80'
    });

    const request = mockEdit.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(request.model).toBe('dall-e-2');
    expect(Array.isArray(request.image)).toBe(false);
    expect(request.image).toEqual({ __mockFile: true, name: 'input.png', type: 'image/png' });
    expect(request).not.toHaveProperty('quality');
    expect(request).not.toHaveProperty('output_format');
    expect(request).not.toHaveProperty('output_compression');
  });
});
