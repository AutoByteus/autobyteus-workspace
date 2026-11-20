import { describe, expect, it } from 'vitest';
import { readResponseBlobWithProgress, type DownloadProgress } from '../responseBlobProgress';

const streamed = (parts: string[], headers: Record<string, string>): Response => new Response(new ReadableStream({
  start(controller) {
    for (const part of parts) controller.enqueue(new TextEncoder().encode(part));
    controller.close();
  },
}), { headers });

describe('readResponseBlobWithProgress (autobyteus-572 D-1)', () => {
  it('reports each part against the declared length and returns the whole file with its type', async () => {
    const seen: DownloadProgress[] = [];
    const blob = await readResponseBlobWithProgress(
      streamed(['abc', 'defg', 'h'], { 'content-length': '8', 'content-type': 'video/mp4' }),
      (progress) => seen.push(progress),
    );
    expect(seen).toEqual([{ loaded: 0, total: 8 }, { loaded: 3, total: 8 }, { loaded: 7, total: 8 }, { loaded: 8, total: 8 }]);
    expect(blob.type).toBe('video/mp4');
    expect(await blob.text()).toBe('abcdefgh');
  });

  it('reports a null total when the reply declares no length', async () => {
    const seen: DownloadProgress[] = [];
    await readResponseBlobWithProgress(streamed(['ab', 'c'], { 'content-type': 'audio/mpeg' }), (progress) => seen.push(progress));
    expect(seen.at(-1)).toEqual({ loaded: 3, total: null });
    expect(seen.every((progress) => progress.total === null)).toBe(true);
  });

  it('reads a reply without a body whole, as before', async () => {
    const seen: DownloadProgress[] = [];
    const response = { headers: new Headers({ 'content-length': '4' }), body: null,
      blob: async () => new Blob(['wxyz'], { type: 'image/png' }) } as unknown as Response;
    const blob = await readResponseBlobWithProgress(response, (progress) => seen.push(progress));
    expect(await blob.text()).toBe('wxyz');
    expect(seen).toEqual([{ loaded: 4, total: 4 }]);
  });
});
