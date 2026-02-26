import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Readable } from 'node:stream';
import axios from 'axios';
import { downloadFileFromUrl } from '../../../src/utils/download-utils.js';

vi.mock('axios');

const SAMPLE_BYTES = Buffer.from('hello-world');
const DATA_URI = `data:application/octet-stream;base64,${SAMPLE_BYTES.toString('base64')}`;

describe('downloadFileFromUrl', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'download-utils-'));
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await fsPromises.rm(tempDir, { recursive: true, force: true });
  });

  it('writes data URI payloads', async () => {
    const target = path.join(tempDir, 'data.bin');
    await downloadFileFromUrl(DATA_URI, target);

    const data = await fsPromises.readFile(target);
    expect(data).toEqual(SAMPLE_BYTES);
  });

  it('copies local files', async () => {
    const source = path.join(tempDir, 'source.bin');
    const target = path.join(tempDir, 'copy.bin');
    await fsPromises.writeFile(source, SAMPLE_BYTES);

    await downloadFileFromUrl(source, target);

    const data = await fsPromises.readFile(target);
    expect(data).toEqual(SAMPLE_BYTES);
  });

  it('downloads via http using axios stream', async () => {
    const target = path.join(tempDir, 'remote.bin');
    const stream = Readable.from([SAMPLE_BYTES]);

    const mockedAxios = axios as any;
    mockedAxios.get.mockResolvedValue({ data: stream } as any);

    await downloadFileFromUrl('https://example.com/file.bin', target);

    const data = await fsPromises.readFile(target);
    expect(data).toEqual(SAMPLE_BYTES);
  });
});
