import { describe, expect, it } from 'vitest';
import {
  createAbsoluteFilePathAction,
  findAbsoluteFilePathCodeCandidates,
  findAbsoluteFilePathCandidates,
  isAbsoluteFilePath,
  normalizeAbsoluteFilePath,
} from '../absoluteFilePathAction';

describe('absolute Event Monitor file path policy', () => {
  it('recognizes POSIX and Windows drive-absolute paths only', () => {
    expect(isAbsoluteFilePath('/Users/name/report.md')).toBe(true);
    expect(isAbsoluteFilePath('C:\\Users\\name\\report.md')).toBe(true);
    expect(isAbsoluteFilePath('docs/report.md')).toBe(false);
    expect(isAbsoluteFilePath('https://example.test/report.md')).toBe(false);
  });

  it('keeps punctuation outside the candidate', () => {
    expect(findAbsoluteFilePathCandidates('See /tmp/result.png, then continue.')).toEqual([
      expect.objectContaining({
        rawCandidate: '/tmp/result.png',
        normalizedCandidate: '/tmp/result.png',
      }),
    ]);
  });

  it('normalizes separators without authorizing the path', () => {
    expect(normalizeAbsoluteFilePath('C:\\Users\\name\\report.md')).toBe('C:/Users/name/report.md');
    expect(normalizeAbsoluteFilePath('http://example.test/report.md')).toBeNull();
  });

  it('keeps unambiguous literal-space code paths intact', () => {
    expect(findAbsoluteFilePathCodeCandidates('/tmp/my file.md\n[report](C:\\Work\\my report.md)')).toEqual([
      expect.objectContaining({
        rawCandidate: '/tmp/my file.md',
        normalizedCandidate: '/tmp/my file.md',
      }),
      expect.objectContaining({
        rawCandidate: 'C:\\Work\\my report.md',
        normalizedCandidate: 'C:/Work/my report.md',
      }),
    ]);
  });

  it('creates actions only for FileViewer-supported families and carries the type', () => {
    const supportedCases = [
      ['/tmp/readme.md', 'Text'],
      ['/tmp/screenshot.png', 'Image'],
      ['/tmp/recording.mp3', 'Audio'],
      ['/tmp/demo.mp4', 'Video'],
      ['/tmp/report.csv', 'Excel'],
      ['/tmp/manual.pdf', 'PDF'],
    ] as const;
    for (const [path, previewType] of supportedCases) {
      expect(createAbsoluteFilePathAction(
        `${previewType}-action`,
        { rawCandidate: path, normalizedCandidate: path },
        'prose',
      )).toEqual(expect.objectContaining({ previewType }));
    }
    expect(createAbsoluteFilePathAction(
      'archive-action',
      { rawCandidate: '/tmp/archive.zip', normalizedCandidate: '/tmp/archive.zip' },
      'prose',
    )).toBeNull();
    expect(createAbsoluteFilePathAction(
      'installer-action',
      { rawCandidate: '/tmp/AutoByteus.dmg', normalizedCandidate: '/tmp/AutoByteus.dmg' },
      'prose',
    )).toBeNull();
  });
});
