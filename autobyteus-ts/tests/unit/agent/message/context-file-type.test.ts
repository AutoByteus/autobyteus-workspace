import { describe, it, expect } from 'vitest';
import { ContextFileType } from '../../../../src/agent/message/context-file-type.js';

describe('ContextFileType', () => {
  it('infers type from file path', () => {
    expect(ContextFileType.fromPath('notes.txt')).toBe(ContextFileType.TEXT);
    expect(ContextFileType.fromPath('README.md')).toBe(ContextFileType.MARKDOWN);
    expect(ContextFileType.fromPath('report.PDF')).toBe(ContextFileType.PDF);
  });

  it('infers type from URL', () => {
    expect(ContextFileType.fromPath('https://example.com/file.json')).toBe(ContextFileType.JSON);
    expect(ContextFileType.fromPath('https://example.com/index.html')).toBe(ContextFileType.HTML);
  });

  it('returns UNKNOWN for unrecognized extensions', () => {
    expect(ContextFileType.fromPath('archive.bin')).toBe(ContextFileType.UNKNOWN);
  });

  it('returns readable text types', () => {
    const readable = ContextFileType.getReadableTextTypes();
    expect(readable).toContain(ContextFileType.TEXT);
    expect(readable).toContain(ContextFileType.JSON);
    expect(readable).toContain(ContextFileType.PYTHON);
  });
});
