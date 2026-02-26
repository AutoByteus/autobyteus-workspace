import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import axios from 'axios';
import {
  isValidMediaPath,
  isBase64,
  fileToBase64,
  urlToBase64,
  mediaSourceToBase64,
  mediaSourceToDataUri
} from '../../../../src/llm/utils/media-payload-formatter.js';

vi.mock('axios');

const VALID_BASE64_IMAGE = 'R0lGODlhAQABAIAAAO/v7////yH5BAAHAP8ALAAAAAABAAEAAAICRAEAOw==';
const IMAGE_BYTES = Buffer.from(VALID_BASE64_IMAGE, 'base64');
const USER_PROVIDED_IMAGE_URL = 'https://127.0.0.1:51739/media/images/b132adbb-80e4-4faf-bd36-44d965d2e095.jpg';

describe('media_payload_formatter', () => {
  let tempDir: string;
  let imageFile: string;
  let audioFile: string;
  let videoFile: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'media-test-'));
    imageFile = path.join(tempDir, 'test.png');
    audioFile = path.join(tempDir, 'test.mp3');
    videoFile = path.join(tempDir, 'test.mp4');
    await fs.writeFile(imageFile, IMAGE_BYTES);
    await fs.writeFile(audioFile, Buffer.from('dummy audio content'));
    await fs.writeFile(videoFile, Buffer.from('dummy video content'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('isValidMediaPath detects valid media files', async () => {
    expect(await isValidMediaPath(imageFile)).toBe(true);
    expect(await isValidMediaPath(audioFile)).toBe(true);
    expect(await isValidMediaPath(videoFile)).toBe(true);
    expect(await isValidMediaPath('non_existent_file.jpg')).toBe(false);
    expect(await isValidMediaPath(tempDir)).toBe(false);

    const nonMediaFile = path.join(tempDir, 'test.txt');
    await fs.writeFile(nonMediaFile, 'hello');
    expect(await isValidMediaPath(nonMediaFile)).toBe(false);
  });

  it('isBase64 validates correctly', () => {
    expect(isBase64(VALID_BASE64_IMAGE)).toBe(true);
    expect(isBase64('this is not base64')).toBe(false);
    expect(isBase64(VALID_BASE64_IMAGE.slice(0, -1) + '!')).toBe(false);
    expect(isBase64(VALID_BASE64_IMAGE.slice(0, -1))).toBe(false);
  });

  it('fileToBase64 reads files', async () => {
    const result = await fileToBase64(imageFile);
    expect(result).toBe(VALID_BASE64_IMAGE);
    await expect(fileToBase64(path.join(tempDir, 'missing.png'))).rejects.toBeTruthy();
  });

  it('urlToBase64 downloads content', async () => {
    const mockedAxios = axios as any;
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url.includes('127.0.0.1')) {
        return { data: IMAGE_BYTES };
      }
      throw new Error('Not Found');
    });

    const result = await urlToBase64(USER_PROVIDED_IMAGE_URL);
    expect(result).toBe(VALID_BASE64_IMAGE);
    await expect(urlToBase64('https://example.com/notfound.jpg')).rejects.toBeTruthy();
  });

  it('mediaSourceToBase64 orchestrates', async () => {
    const mockedAxios = axios as any;
    mockedAxios.get.mockResolvedValue({ data: IMAGE_BYTES });

    const fromFile = await mediaSourceToBase64(imageFile);
    expect(fromFile).toBe(VALID_BASE64_IMAGE);

    const audioBase64 = Buffer.from('dummy audio content').toString('base64');
    const fromAudio = await mediaSourceToBase64(audioFile);
    expect(fromAudio).toBe(audioBase64);

    const fromUrl = await mediaSourceToBase64(USER_PROVIDED_IMAGE_URL);
    expect(fromUrl).toBe(VALID_BASE64_IMAGE);

    const fromBase64 = await mediaSourceToBase64(VALID_BASE64_IMAGE);
    expect(fromBase64).toBe(VALID_BASE64_IMAGE);

    const fromDataUri = await mediaSourceToBase64(`data:image/gif;base64,${VALID_BASE64_IMAGE}`);
    expect(fromDataUri).toBe(VALID_BASE64_IMAGE);

    await expect(mediaSourceToBase64('this is not a valid source')).rejects.toBeTruthy();
  });

  it('mediaSourceToDataUri returns data URI input unchanged', async () => {
    const dataUri = `data:image/gif;base64,${VALID_BASE64_IMAGE}`;
    const result = await mediaSourceToDataUri(dataUri);
    expect(result).toBe(dataUri);
  });

  it('mediaSourceToDataUri converts local files to data URI', async () => {
    const result = await mediaSourceToDataUri(imageFile);
    expect(result).toBe(`data:image/png;base64,${VALID_BASE64_IMAGE}`);
  });

  it('mediaSourceToDataUri converts remote URLs to data URI', async () => {
    const mockedAxios = axios as any;
    mockedAxios.get.mockResolvedValue({
      data: IMAGE_BYTES,
      headers: { 'content-type': 'image/jpeg; charset=utf-8' }
    });

    const result = await mediaSourceToDataUri(USER_PROVIDED_IMAGE_URL);
    expect(result).toBe(`data:image/jpeg;base64,${VALID_BASE64_IMAGE}`);
  });

  it('mediaSourceToDataUri wraps raw base64 input with default mime', async () => {
    const result = await mediaSourceToDataUri(VALID_BASE64_IMAGE);
    expect(result).toBe(`data:application/octet-stream;base64,${VALID_BASE64_IMAGE}`);
  });

  it('mediaSourceToDataUri accepts existing local files with uncommon extensions', async () => {
    const oddFile = path.join(tempDir, 'sample.custombin');
    await fs.writeFile(oddFile, IMAGE_BYTES);

    const result = await mediaSourceToDataUri(oddFile);
    expect(result).toBe(`data:application/octet-stream;base64,${VALID_BASE64_IMAGE}`);
  });
});
