import { describe, expect, it } from 'vitest';
import {
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
});
