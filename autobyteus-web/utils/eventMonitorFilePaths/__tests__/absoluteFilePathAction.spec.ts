import { describe, expect, it } from 'vitest';
import {
  createAbsoluteFilePathAction,
  findAbsoluteFilePathCodeCandidates,
  findAbsoluteFilePathCandidates,
  isAbsoluteFilePath,
  normalizeAbsoluteFilePath,
  resolveEventMonitorMarkdownFileDestination,
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
    expect(normalizeAbsoluteFilePath('C:\\')).toBeNull();
  });

  it.each([
    ['file:///tmp/report.md', '/tmp/report.md'],
    ['FILE:///tmp/report.md', '/tmp/report.md'],
    ['file:///C:/Work/report.md', 'C:/Work/report.md'],
    ['file:///C%3A%5CWork%5Creport%20final.md', 'C:/Work/report final.md'],
  ])('resolves supported file URI %s to %s', (rawDestination, normalizedCandidate) => {
    expect(resolveEventMonitorMarkdownFileDestination(rawDestination)).toEqual({
      kind: 'valid',
      normalizedCandidate,
      previewType: 'Text',
      rawDestination,
    });
  });

  it('classifies an SVG file URI as an Image action candidate', () => {
    expect(resolveEventMonitorMarkdownFileDestination('file:///tmp/DIAGRAM.SVG')).toEqual({
      kind: 'valid',
      normalizedCandidate: '/tmp/DIAGRAM.SVG',
      previewType: 'Image',
      rawDestination: 'file:///tmp/DIAGRAM.SVG',
    });
  });

  it('preserves supported bare absolute-link resolution as a valid action candidate', () => {
    expect(resolveEventMonitorMarkdownFileDestination('/tmp/report%20final.md')).toEqual({
      kind: 'valid',
      normalizedCandidate: '/tmp/report final.md',
      previewType: 'Text',
    });
    expect(resolveEventMonitorMarkdownFileDestination('https://example.test/report.md')).toEqual({
      kind: 'not-file',
    });
  });

  it.each([
    '/tmp/archive.zip',
    '/tmp/installer.dmg',
    '/tmp/setup.pkg',
    '/tmp/application.app',
    '/tmp/payload.bin',
    '/tmp/unknown.custom',
    'C:\\tmp\\installer.dmg',
  ])('classifies unsupported bare absolute destination %s as inert', (rawDestination) => {
    expect(resolveEventMonitorMarkdownFileDestination(rawDestination)).toEqual({
      kind: 'invalid-file',
      rawDestination,
    });
  });

  it.each([
    'file:///Users/normy/.../report.md',
    'file:///tmp/../report.md',
    'file:///tmp/./report.md',
    'file:///tmp/…/report.md',
    'file:///tmp/archive.zip',
    'file://other-host/tmp/report.md',
    'file://localhost/tmp/report.md',
    'file:///tmp/report.md?download=1',
    'file:///tmp/report.md#section',
    'file:///tmp/report%ZZ.md',
    'file:///tmp/report%00.md',
    'file:///C:/',
    'file:///',
    'file:/tmp/report.md',
  ])('classifies invalid file URI %s as inert', (rawDestination) => {
    expect(resolveEventMonitorMarkdownFileDestination(rawDestination)).toEqual({
      kind: 'invalid-file',
      rawDestination,
    });
  });

  it.each([
    'file:///tmp/release..notes.md',
    'file:///tmp/release...notes.md',
  ])('keeps complete dotted file URI %s eligible', (rawDestination) => {
    expect(resolveEventMonitorMarkdownFileDestination(rawDestination)).toEqual(expect.objectContaining({
      kind: 'valid',
      normalizedCandidate: expect.stringContaining('release'),
      previewType: 'Text',
    }));
  });

  it.each([
    '/Users/normy/.../report.md',
    '/tmp/../report.md',
    '/tmp/./report.md',
    '/tmp/…/report.md',
    'C:\\Users\\normy\\...\\report.md',
    'C:\\tmp\\..\\report.md',
    'C:\\tmp\\.\\report.md',
    'C:\\tmp\\…\\report.md',
  ])('rejects incomplete path component %s', (candidate) => {
    expect(normalizeAbsoluteFilePath(candidate)).toBeNull();
  });

  it.each([
    '/Users/normy/release..notes.md',
    '/Users/normy/release...notes.md',
    'C:\\Users\\normy\\release..notes.md',
    'C:\\Users\\normy\\release...notes.md',
  ])('preserves complete filenames containing dots: %s', (candidate) => {
    expect(normalizeAbsoluteFilePath(candidate)).not.toBeNull();
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
      ['/tmp/preview.lua', 'Text'],
      ['/tmp/screenshot.png', 'Image'],
      ['/tmp/diagram.svg', 'Image'],
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
    expect(createAbsoluteFilePathAction(
      'incomplete-action',
      { rawCandidate: '/Users/normy/.../report.md', normalizedCandidate: '/Users/normy/.../report.md' },
      'markdown-link',
    )).toBeNull();
    expect(createAbsoluteFilePathAction(
      'uri-action',
      {
        rawCandidate: 'file:///tmp/report.md',
        rawDestination: 'file:///tmp/report.md',
        normalizedCandidate: '/tmp/report.md',
      },
      'markdown-link',
    )).toEqual(expect.objectContaining({
      rawDestination: 'file:///tmp/report.md',
      normalizedCandidate: '/tmp/report.md',
    }));
  });
});
