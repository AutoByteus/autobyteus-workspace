import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ImageGenerationResponse } from '../../../../../src/multimedia/index.js';
import { ImageClientFactory } from '../../../../../src/multimedia/image/image-client-factory.js';

const hasVertexApiKey = Boolean(process.env.VERTEX_AI_API_KEY);
const hasVertex = hasVertexApiKey || Boolean(process.env.VERTEX_AI_PROJECT && process.env.VERTEX_AI_LOCATION);
const hasApiKey = Boolean(process.env.GEMINI_API_KEY);
const runIntegration = hasVertex || hasApiKey ? describe : describe.skip;
const LOCAL_SERVER_BASE_URL = process.env.AUTOBYTEUS_MEDIA_LOCAL_BASE_URL ?? 'http://192.168.2.124:29695';
const runInputImageTest = hasVertex ? it.skip : it;

const DATA_URI_RE = /^data:(?<mime>[^;]+);base64,(?<data>.+)$/;

function extensionFromMime(mimeType?: string | null): string {
  if (!mimeType) return 'bin';
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  return 'bin';
}

async function imageBytesFromUri(imageUri: string): Promise<{ bytes: Buffer; mime: string | null }> {
  const match = DATA_URI_RE.exec(imageUri);
  if (match?.groups?.data) {
    const mime = match.groups.mime ?? null;
    const bytes = Buffer.from(match.groups.data, 'base64');
    return { bytes, mime };
  }

  const response = await fetch(imageUri);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const mime = response.headers.get('content-type');
  return { bytes: Buffer.from(arrayBuffer), mime };
}

async function saveImageToTemp(imageUri: string, tmpDir: string, name: string): Promise<string> {
  const { bytes, mime } = await imageBytesFromUri(imageUri);
  expect(bytes.length).toBeGreaterThan(0);
  const extension = extensionFromMime(mime);
  const outputPath = path.join(tmpDir, `${name}.${extension}`);
  await fs.writeFile(outputPath, bytes);
  return outputPath;
}

runIntegration('GeminiImageClient integration', () => {
  it(
    'generates an image with gemini-3-pro-image-preview',
    { timeout: 60000 },
    async () => {
      const client = ImageClientFactory.createImageClient('gemini-3-pro-image-preview');
      const response = await client.generateImage('A watercolor painting of a lighthouse at dusk');

    expect(response).toBeInstanceOf(ImageGenerationResponse);
    expect(response.image_urls.length).toBeGreaterThan(0);
    const first = response.image_urls[0];
    expect(typeof first).toBe('string');
    expect(first.startsWith('data:') || first.includes('://')).toBe(true);

      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gemini-image-'));
      const savedPath = await saveImageToTemp(first, tempDir, 'gemini_generate_image');
      const stats = await fs.stat(savedPath);
      expect(stats.size).toBeGreaterThan(0);
    }
  );

  runInputImageTest(
    'accepts input images when generating',
    { timeout: 60000 },
    async () => {
      const client = ImageClientFactory.createImageClient('gemini-3-pro-image-preview');
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gemini-image-input-'));
      const inputUrl = `${LOCAL_SERVER_BASE_URL}/rest/files/images/nice_image.png`;

      const response = await client.generateImage('Add stars to the night sky', [inputUrl]);
      expect(response).toBeInstanceOf(ImageGenerationResponse);
      expect(response.image_urls.length).toBeGreaterThan(0);
      const savedPath = await saveImageToTemp(response.image_urls[0], tempDir, 'gemini_generate_image_with_inputs');
      const stats = await fs.stat(savedPath);
      expect(stats.size).toBeGreaterThan(0);
    }
  );
});
