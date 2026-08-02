import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs/promises';
import type { FileHandle } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { createFileByteStream } from '../file-byte-stream';
import { createLocalFileResponse } from '../local-file-response';
import { buildLocalFileUrl, parseLocalFileUrl } from '../../../shared/localFileUrl';

const temporaryPaths: string[] = [];

const createTemporaryFile = async (
  name: string,
  contents: string | Uint8Array,
): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-protocol-'));
  temporaryPaths.push(root);
  const filePath = path.join(root, name);
  await fs.writeFile(filePath, contents);
  return filePath;
};

const readBytes = async (response: Response): Promise<number[]> => (
  Array.from(new Uint8Array(await response.arrayBuffer()))
);

afterEach(async () => {
  await Promise.all(temporaryPaths.splice(0).map((filePath) => (
    fs.rm(filePath, { recursive: true, force: true })
  )));
});

describe('local-file response policy', () => {
  it('serves a MIME-correct full response without changing its bytes', async () => {
    const fileBytes = Uint8Array.from([0, 1, 2, 3, 254, 255]);
    const filePath = await createTemporaryFile('sample video.mp4', fileBytes);

    const response = await createLocalFileResponse(new Request(buildLocalFileUrl(filePath)));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('video/mp4');
    expect(response.headers.get('content-length')).toBe(fileBytes.length.toString());
    expect(response.headers.get('accept-ranges')).toBe('bytes');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await readBytes(response)).toEqual(Array.from(fileBytes));
  });

  it('serves SVG bytes with the image/svg+xml MIME boundary', async () => {
    const fileBytes = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>');
    const filePath = await createTemporaryFile('diagram.SVG', fileBytes);

    const response = await createLocalFileResponse(new Request(buildLocalFileUrl(filePath)));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/svg+xml');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await readBytes(response)).toEqual(Array.from(fileBytes));
  });

  it('supports closed, open-ended, suffix, and end-clamped single ranges', async () => {
    const filePath = await createTemporaryFile('sample.bin', Uint8Array.from({ length: 10 }, (_, i) => i));
    const scenarios = [
      { range: 'bytes=2-5', contentRange: 'bytes 2-5/10', bytes: [2, 3, 4, 5] },
      { range: 'bytes=6-', contentRange: 'bytes 6-9/10', bytes: [6, 7, 8, 9] },
      { range: 'bytes=-3', contentRange: 'bytes 7-9/10', bytes: [7, 8, 9] },
      { range: 'bytes=8-99', contentRange: 'bytes 8-9/10', bytes: [8, 9] },
    ];

    for (const scenario of scenarios) {
      const response = await createLocalFileResponse(new Request(buildLocalFileUrl(filePath), {
        headers: { Range: scenario.range },
      }));

      expect(response.status).toBe(206);
      expect(response.headers.get('content-range')).toBe(scenario.contentRange);
      expect(response.headers.get('content-length')).toBe(scenario.bytes.length.toString());
      expect(response.headers.get('accept-ranges')).toBe('bytes');
      expect(await readBytes(response)).toEqual(scenario.bytes);
    }
  });

  it('returns headers without a body for full and ranged HEAD requests', async () => {
    const filePath = await createTemporaryFile('sample.pdf', 'abcdef');

    const fullResponse = await createLocalFileResponse(new Request(buildLocalFileUrl(filePath), {
      method: 'HEAD',
    }));
    const partialResponse = await createLocalFileResponse(new Request(buildLocalFileUrl(filePath), {
      method: 'HEAD',
      headers: { Range: 'bytes=1-3' },
    }));

    expect(fullResponse.status).toBe(200);
    expect(fullResponse.headers.get('content-type')).toBe('application/pdf');
    expect(fullResponse.headers.get('content-length')).toBe('6');
    expect(fullResponse.body).toBeNull();
    expect(partialResponse.status).toBe(206);
    expect(partialResponse.headers.get('content-range')).toBe('bytes 1-3/6');
    expect(partialResponse.headers.get('content-length')).toBe('3');
    expect(partialResponse.body).toBeNull();
  });

  it('returns 416 without bytes for malformed, multipart, and unsatisfiable ranges', async () => {
    const filePath = await createTemporaryFile('sample.mp4', '0123456789');
    const invalidRanges = [
      'items=0-1',
      'bytes=',
      'bytes=1-2,4-5',
      'bytes=10-',
      'bytes=7-2',
      'bytes=-0',
      'bytes=one-two',
      `bytes=${Number.MAX_SAFE_INTEGER}0-`,
    ];

    for (const range of invalidRanges) {
      const response = await createLocalFileResponse(new Request(buildLocalFileUrl(filePath), {
        headers: { Range: range },
      }));

      expect(response.status).toBe(416);
      expect(response.headers.get('content-range')).toBe('bytes */10');
      expect(response.body).toBeNull();
    }
  });

  it('serves a zero-length file fully but rejects every byte range', async () => {
    const filePath = await createTemporaryFile('empty.csv', '');

    const fullResponse = await createLocalFileResponse(new Request(buildLocalFileUrl(filePath)));
    const rangeResponse = await createLocalFileResponse(new Request(buildLocalFileUrl(filePath), {
      headers: { Range: 'bytes=0-' },
    }));

    expect(fullResponse.status).toBe(200);
    expect(fullResponse.headers.get('content-length')).toBe('0');
    expect(fullResponse.headers.get('content-type')).toBe('text/csv');
    expect(fullResponse.body).toBeNull();
    expect(rangeResponse.status).toBe(416);
    expect(rangeResponse.headers.get('content-range')).toBe('bytes */0');
    expect(rangeResponse.body).toBeNull();
  });

  it('rejects unsupported methods, malformed URLs, and invalid file paths without bytes', async () => {
    const filePath = await createTemporaryFile('sample.mp4', 'video');
    const directoryPath = path.dirname(filePath);
    const requests = [
      new Request(buildLocalFileUrl(filePath), { method: 'POST' }),
      new Request('https://example.com/video.mp4'),
      new Request('local-file:///%E0%A4%A'),
      new Request('local-file://relative/video.mp4'),
      new Request('local-file://wrong/tmp/video.mp4'),
      new Request(`${buildLocalFileUrl(filePath)}?download=1`),
      new Request(`${buildLocalFileUrl(filePath)}#fragment`),
      new Request(buildLocalFileUrl(directoryPath)),
      new Request(buildLocalFileUrl(path.join(directoryPath, 'missing.mp4'))),
    ];

    const responses = await Promise.all(requests.map((request) => createLocalFileResponse(request)));

    expect(responses[0].status).toBe(405);
    expect(responses[0].headers.get('allow')).toBe('GET, HEAD');
    for (const response of responses) {
      expect(response.body).toBeNull();
    }
    expect(responses.slice(1).map((response) => response.status)).toEqual([
      404, 404, 404, 404, 404, 404, 404, 404,
    ]);
  });

  it('preserves spaces, Unicode, percent signs, hashes, and Windows drive URL shape', async () => {
    const filePath = await createTemporaryFile('视频 100%#1.mp4', 'video');
    const fileUrl = buildLocalFileUrl(filePath);

    const response = await createLocalFileResponse(new Request(fileUrl));

    expect(parseLocalFileUrl(fileUrl, process.platform)).toBe(filePath);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('video');
    expect(parseLocalFileUrl('local-file://local/C:/Media/My%20Video%25%231.mp4', 'win32'))
      .toBe('C:/Media/My Video%#1.mp4');
  });

  it.skipIf(process.platform === 'win32')(
    'serves a real POSIX file whose filename contains a literal backslash',
    async () => {
      const filePath = await createTemporaryFile('video\\name.mp4', 'posix-video');
      const fileUrl = buildLocalFileUrl(filePath);

      const response = await createLocalFileResponse(new Request(fileUrl));

      expect(fileUrl).toContain('%5C');
      expect(parseLocalFileUrl(fileUrl, process.platform)).toBe(filePath);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('posix-video');
    },
  );
});

type FakeHandleHarness = {
  handle: FileHandle;
  read: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
};

const createFakeHandle = (
  source: Uint8Array,
  readFailure?: Error,
): FakeHandleHarness => {
  const close = vi.fn(async () => undefined);
  const read = vi.fn(async (
    target: Uint8Array,
    offset: number,
    length: number,
    position: number,
  ) => {
    if (readFailure) {
      throw readFailure;
    }
    const available = Math.max(Math.min(length, source.length - position), 0);
    target.set(source.subarray(position, position + available), offset);
    return { bytesRead: available, buffer: target };
  });

  return {
    handle: { read, close } as unknown as FileHandle,
    read,
    close,
  };
};

describe('local-file byte stream ownership', () => {
  it('reads only the selected byte window in bounded chunks and closes once', async () => {
    const source = Uint8Array.from({ length: 140_000 }, (_, index) => index % 251);
    const harness = createFakeHandle(source);
    const response = new Response(createFileByteStream(harness.handle, {
      start: 5_000,
      length: 130_000,
    }));

    const bytes = new Uint8Array(await response.arrayBuffer());

    expect(Array.from(bytes)).toEqual(Array.from(source.subarray(5_000, 135_000)));
    expect(harness.read.mock.calls.every((call) => call[2] <= 64 * 1024)).toBe(true);
    expect(harness.close).toHaveBeenCalledOnce();
  });

  it('closes the handle once when the consumer cancels', async () => {
    const source = new Uint8Array(200_000);
    const harness = createFakeHandle(source);
    const reader = createFileByteStream(harness.handle, {
      start: 0,
      length: source.length,
    }).getReader();

    const firstChunk = await reader.read();
    expect(firstChunk.done).toBe(false);
    await reader.cancel();

    expect(harness.close).toHaveBeenCalledOnce();
  });

  it('errors and closes once when a read fails or reaches an unexpected early EOF', async () => {
    const readFailureHarness = createFakeHandle(new Uint8Array(10), new Error('read failed'));
    const readFailureReader = createFileByteStream(readFailureHarness.handle, {
      start: 0,
      length: 10,
    }).getReader();
    await expect(readFailureReader.read()).rejects.toThrow('read failed');
    expect(readFailureHarness.close).toHaveBeenCalledOnce();

    const earlyEofHarness = createFakeHandle(new Uint8Array(2));
    const earlyEofReader = createFileByteStream(earlyEofHarness.handle, {
      start: 2,
      length: 1,
    }).getReader();
    await expect(earlyEofReader.read()).rejects.toThrow('Unexpected end of local file stream');
    expect(earlyEofHarness.close).toHaveBeenCalledOnce();
  });
});
