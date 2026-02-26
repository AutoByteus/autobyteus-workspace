import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  GenerateImageTool,
  EditImageTool,
  _getConfiguredModelIdentifier
} from '../../../../src/tools/multimedia/image-tools.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../../src/utils/parameter-schema.js';

const originalEnv = { ...process.env };

const makeContext = (basePath: string) => ({
  agentId: 'test-agent',
  workspace: {
    getBasePath: () => basePath
  }
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRateLimitError = (error: unknown): boolean => {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('RESOURCE_EXHAUSTED') || message.includes('"code":429') || message.includes('code":429');
};

const withVertexDisabled = async <T>(fn: () => Promise<T>): Promise<T> => {
  const vertexApiKey = process.env.VERTEX_AI_API_KEY;
  const vertexProject = process.env.VERTEX_AI_PROJECT;
  const vertexLocation = process.env.VERTEX_AI_LOCATION;
  delete process.env.VERTEX_AI_API_KEY;
  delete process.env.VERTEX_AI_PROJECT;
  delete process.env.VERTEX_AI_LOCATION;
  try {
    return await fn();
  } finally {
    if (vertexApiKey !== undefined) process.env.VERTEX_AI_API_KEY = vertexApiKey;
    if (vertexProject !== undefined) process.env.VERTEX_AI_PROJECT = vertexProject;
    if (vertexLocation !== undefined) process.env.VERTEX_AI_LOCATION = vertexLocation;
  }
};

const runWithGeminiFallback = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (!isRateLimitError(error)) {
      throw error;
    }
    await sleep(2000);
    return await withVertexDisabled(fn);
  }
};

const runWithGeminiRetries = async <T>(fn: () => Promise<T>): Promise<T> => {
  let lastError: unknown = null;
  // Attempt 1: current runtime
  try {
    return await runWithGeminiFallback(fn);
  } catch (error) {
    lastError = error;
  }
  if (!isRateLimitError(lastError)) {
    throw lastError;
  }
  // Attempt 2: wait and retry with Vertex disabled
  await sleep(5000);
  try {
    return await withVertexDisabled(fn);
  } catch (error) {
    lastError = error;
  }
  if (!isRateLimitError(lastError)) {
    throw lastError;
  }
  // Attempt 3: final retry after a longer delay
  await sleep(10000);
  return await withVertexDisabled(fn);
};

describe('Image tools integration', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'image-tools-int-'));
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('reads configured model identifier with fallback', () => {
    process.env.TEST_IMAGE_MODEL = 'test-model';
    expect(_getConfiguredModelIdentifier('TEST_IMAGE_MODEL', 'fallback')).toBe('test-model');
    delete process.env.TEST_IMAGE_MODEL;
    expect(_getConfiguredModelIdentifier('TEST_IMAGE_MODEL', 'fallback-model')).toBe('fallback-model');
  });

  it('throws when configured model identifier is missing and no fallback provided', () => {
    delete process.env.TEST_IMAGE_MODEL;
    expect(() => _getConfiguredModelIdentifier('TEST_IMAGE_MODEL')).toThrow('environment variable is not set');
  });

  it('generates dynamic schema for gpt-image-1.5', () => {
    process.env.DEFAULT_IMAGE_GENERATION_MODEL = 'gpt-image-1.5';
    process.env.DEFAULT_IMAGE_EDIT_MODEL = 'gpt-image-1.5';

    const schema = GenerateImageTool.getArgumentSchema();
    expect(schema).toBeInstanceOf(ParameterSchema);

    const params = { ...Object.fromEntries(schema.parameters.map((p) => [p.name, p])) };
    expect(params.prompt).toBeDefined();
    expect(params.input_images).toBeDefined();
    expect(params.generation_config).toBeDefined();

    const configParam = params.generation_config as ParameterDefinition;
    expect(configParam.type).toBe(ParameterType.OBJECT);
    expect(configParam.objectSchema).toBeInstanceOf(ParameterSchema);

    const objectSchema = configParam.objectSchema as ParameterSchema;
    const sizeParam = objectSchema.getParameter('size');
    const qualityParam = objectSchema.getParameter('quality');

    expect(sizeParam).toBeInstanceOf(ParameterDefinition);
    expect(sizeParam?.defaultValue).toBe('1024x1024');
    expect(sizeParam?.enumValues).toContain('1792x1024');

    expect(qualityParam).toBeInstanceOf(ParameterDefinition);
    expect(qualityParam?.defaultValue).toBe('auto');
    expect(qualityParam?.enumValues).toContain('high');
  });

  it('generates an image and saves it to disk', async () => {
    const tool = new GenerateImageTool();
    const context = makeContext(tempDir);

    const result = await runWithGeminiRetries(() => tool.execute(context, {
      prompt: 'A majestic lion standing on a rock at sunset, cartoon style',
      generation_config: {},
      output_file_path: 'lion.png'
    }));

    expect(result).toHaveProperty('file_path');
    const savedPath = result.file_path as string;
    const stats = await fs.stat(savedPath);
    expect(stats.isFile()).toBe(true);
    expect(path.basename(savedPath)).toBe('lion.png');

    await tool.cleanup();
  }, 120000);

  it('generates a reference image and uses it as input', async () => {
    const tool = new GenerateImageTool();
    const context = makeContext(tempDir);

    const baseResult = await runWithGeminiRetries(() => tool.execute(context, {
      prompt: 'A simple black and white ink drawing of a smiling robot head.',
      generation_config: {},
      output_file_path: 'base.png'
    }));

    const referencePath = baseResult.file_path as string;

    const newResult = await runWithGeminiRetries(() => tool.execute(context, {
      prompt: 'A full-color comic book style image of a friendly robot, in the same art style as the reference image.',
      input_images: referencePath,
      generation_config: {},
      output_file_path: 'new.png'
    }));

    const newPath = newResult.file_path as string;
    expect(newPath).not.toBe(referencePath);
    const stats = await fs.stat(newPath);
    expect(stats.isFile()).toBe(true);

    await tool.cleanup();
  }, 180000);

  it('edits a generated image', async () => {
    const generateTool = new GenerateImageTool();
    const context = makeContext(tempDir);

    const generatedResult = await runWithGeminiRetries(() => generateTool.execute(context, {
      prompt: 'A simple monarch butterfly on a white background, cartoon style',
      generation_config: {},
      output_file_path: 'butterfly.png'
    }));

    const editTool = new EditImageTool();
    const editedResult = await runWithGeminiRetries(() => editTool.execute(context, {
      prompt: "Add a tiny party hat on the butterfly's head",
      input_images: generatedResult.file_path,
      generation_config: {},
      output_file_path: 'butterfly_hat.png'
    }));

    const editedPath = editedResult.file_path as string;
    expect(editedPath).not.toBe(generatedResult.file_path);
    const stats = await fs.stat(editedPath);
    expect(stats.isFile()).toBe(true);

    await generateTool.cleanup();
    await editTool.cleanup();
  }, 180000);

  it('edits a remote reference image', async () => {
    const editTool = new EditImageTool();
    const context = makeContext(tempDir);
    const remoteImageUrl = process.env.AUTOBYTEUS_REMOTE_IMAGE_URL
      ?? 'http://192.168.2.124:29695/rest/files/images/nice_image.png';

    const result = await runWithGeminiRetries(() => editTool.execute(context, {
      prompt: "Add the word 'Serenity' in white text across the center of the stone.",
      input_images: remoteImageUrl,
      generation_config: {},
      output_file_path: 'stone_text.png'
    }));

    const editedPath = result.file_path as string;
    const stats = await fs.stat(editedPath);
    expect(stats.isFile()).toBe(true);

    await editTool.cleanup();
  }, 180000);
});
