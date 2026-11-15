import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';
import {
  INLINE_MEDIA_MAX_BYTES,
  sanitizeMediaInputMessages,
} from '../../../../src/llm/utils/media-input-sanitizer.js';

const ALL = { image: 'supported', audio: 'supported', video: 'supported' } as never;
const MiB = 1024 * 1024;
const PNG_1PX = 'R0lGODlhAQABAIAAAO/v7////yH5BAAHAP8ALAAAAAABAAEAAAICRAEAOw==';

describe('media input sanitizer: inline size cap (AC-011)', () => {
  let dir: string;
  beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), 'media-sanitizer-')); });
  afterEach(async () => { vi.restoreAllMocks(); await fs.rm(dir, { recursive: true, force: true }); });

  const sparse = async (name: string, bytes: number): Promise<string> => {
    const file = path.join(dir, name);
    await fs.writeFile(file, '');
    await fs.truncate(file, bytes);
    return file;
  };
  const sanitize = (message: Message) => sanitizeMediaInputMessages([message], ALL);

  it('caps inline media at 25 MiB', () => {
    expect(INLINE_MEDIA_MAX_BYTES).toBe(25 * MiB);
  });

  it('keeps a local video at exactly 25 MiB and omits one byte more with a too_large diagnostic', async () => {
    const atLimit = await sparse('exact.mp4', 25 * MiB);
    const over = await sparse('over.mp4', 25 * MiB + 1);
    const result = await sanitize(new Message(MessageRole.USER, { content: 'see', video_urls: [atLimit, over] }));
    expect(result.outboundMessages[0]!.video_urls).toEqual([atLimit]);
    expect(result.diagnostics).toEqual([{
      mediaType: 'video',
      reason: 'too_large',
      message: expect.stringContaining('larger than 25 MB and was not sent inline'),
    }]);
    expect(result.outboundMessages[0]!.content).toBe('see');
  });

  it('applies the cap to local audio and to local images, and never reads an oversized image', async () => {
    const readFile = vi.spyOn(fs, 'readFile');
    const audio = await sparse('talk.mp3', 26 * MiB);
    const image = await sparse('photo.png', 26 * MiB);
    const result = await sanitize(new Message(MessageRole.USER, { content: '', audio_urls: [audio], image_urls: [image] }));
    expect(result.outboundMessages[0]!.audio_urls).toEqual([]);
    expect(result.outboundMessages[0]!.image_urls).toEqual([]);
    expect(result.diagnostics.map((d) => `${d.mediaType}:${d.reason}`).sort()).toEqual(['audio:too_large', 'image:too_large']);
    expect(result.removedImageCount).toBe(1);
    expect(readFile).not.toHaveBeenCalled();
  });

  it('leaves non-local sources untouched: URLs, data URIs and raw base64 are not sized or read here', async () => {
    const url = 'https://example.com/clip.mp4';
    const dataUri = `data:video/mp4;base64,${Buffer.alloc(30 * MiB, 1).toString('base64').slice(0, 64)}`;
    const result = await sanitize(new Message(MessageRole.USER, { content: '', video_urls: [url, dataUri], image_urls: [PNG_1PX] }));
    expect(result.outboundMessages[0]!.video_urls).toEqual([url, dataUri]);
    expect(result.outboundMessages[0]!.image_urls).toEqual([PNG_1PX]);
    expect(result.diagnostics).toEqual([]);
  });

  it('keeps media at or below the cap exactly as before, and a missing path falls through to the existing handling', async () => {
    const small = await sparse('small.mp4', 1 * MiB);
    const png = path.join(dir, 'ok.png');
    await fs.writeFile(png, Buffer.from(PNG_1PX, 'base64'));
    const missing = path.join(dir, 'missing.png');
    const result = await sanitize(new Message(MessageRole.USER, { content: '', video_urls: [small], image_urls: [png, missing] }));
    expect(result.outboundMessages[0]!.video_urls).toEqual([small]);
    expect(result.outboundMessages[0]!.image_urls).toEqual([png]);
    expect(result.diagnostics.map((d) => d.reason)).toEqual(['invalid']);
  });

  it('does not size media a model cannot take (the unsupported diagnostic is the only one)', async () => {
    const over = await sparse('over.mp4', 26 * MiB);
    const result = await sanitizeMediaInputMessages(
      [new Message(MessageRole.USER, { content: '', video_urls: [over] })],
      { image: 'supported', audio: 'supported', video: 'unsupported' } as never,
    );
    expect(result.diagnostics.map((d) => d.reason)).toEqual(['unsupported']);
  });
});
