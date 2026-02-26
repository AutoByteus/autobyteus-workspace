import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import axios from 'axios';
import { loadImageFromUrl } from '../../../../src/multimedia/utils/api-utils.js';

vi.mock('axios');

const IMAGE_BYTES = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==', 'base64');

describe('loadImageFromUrl', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'api-utils-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('loads image data from http url', async () => {
    const mockedAxios = axios as any;
    mockedAxios.get.mockResolvedValue({ data: IMAGE_BYTES });

    const result = await loadImageFromUrl('https://example.com/image.png');
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result).toEqual(IMAGE_BYTES);
  });

  it('loads image data from local path', async () => {
    const imagePath = path.join(tempDir, 'local.png');
    await fs.writeFile(imagePath, IMAGE_BYTES);

    const result = await loadImageFromUrl(imagePath);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result).toEqual(IMAGE_BYTES);
  });

  it('throws for missing file path', async () => {
    await expect(loadImageFromUrl(path.join(tempDir, 'missing.png'))).rejects.toBeTruthy();
  });
});
