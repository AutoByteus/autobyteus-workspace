import { describe, expect, it } from 'vitest';
import {
  contextFileMaxBytesFor,
  formatContextFileSizeLimit,
  parseContextFileSizeLimits,
} from '../contextFileSizeLimits';

const MB = 1024 * 1024;
const published = { otherFileMaxBytes: 25 * MB, audioVideoMaxBytes: 2048 * MB, audioVideoMimeTypes: ['video/mp4', 'audio/mpeg'] };

describe('context-file size limits (web)', () => {
  it('reads the published limits and refuses a malformed answer instead of guessing', () => {
    expect(parseContextFileSizeLimits(published)).toEqual(published);
    for (const bad of [null, {}, { ...published, otherFileMaxBytes: 0 }, { ...published, audioVideoMaxBytes: '1' },
      { ...published, audioVideoMimeTypes: 'video/mp4' }, { ...published, audioVideoMimeTypes: [1] }]) {
      expect(() => parseContextFileSizeLimits(bad)).toThrow();
    }
  });

  it('applies the audio/video limit by the file type the browser reports, and the other-file limit to everything else', () => {
    const limits = parseContextFileSizeLimits(published);
    expect(contextFileMaxBytesFor({ type: 'video/mp4' }, limits)).toBe(2048 * MB);
    expect(contextFileMaxBytesFor({ type: 'audio/mpeg' }, limits)).toBe(2048 * MB);
    for (const type of ['image/png', 'application/pdf', 'video/x-unlisted', '']) {
      expect(contextFileMaxBytesFor({ type }, limits)).toBe(25 * MB);
    }
  });

  it.each([
    [26214400, 'en', '25 MB'],
    [2147483648, 'en', '2 GB'],
    [1572864000, 'en', '1.5 GB'],
    [1048576, 'en', '1 MB'],
    [1048576000, 'en', '1,000 MB'],
    [10737418240, 'zh-CN', '10 GB'],
    [1572864000, 'zh-CN', '1.5 GB'],
  ])('formats %d bytes in %s as %s', (bytes, locale, expected) => {
    expect(formatContextFileSizeLimit(bytes, locale)).toBe(expected);
  });
});
