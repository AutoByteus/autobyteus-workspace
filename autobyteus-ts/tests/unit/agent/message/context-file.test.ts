import { describe, it, expect } from 'vitest';
import { ContextFile } from '../../../../src/agent/message/context-file.js';
import { ContextFileType } from '../../../../src/agent/message/context-file-type.js';

describe('ContextFile', () => {
  it('infers fileName and fileType when not provided', () => {
    const file = new ContextFile('https://example.com/docs/report.pdf');
    expect(file.fileName).toBe('report.pdf');
    expect(file.fileType).toBe(ContextFileType.PDF);
  });

  it('respects provided fileName and fileType', () => {
    const file = new ContextFile('notes.txt', ContextFileType.TEXT, 'custom.txt');
    expect(file.fileName).toBe('custom.txt');
    expect(file.fileType).toBe(ContextFileType.TEXT);
  });

  it('serializes and deserializes via toDict/fromDict', () => {
    const file = new ContextFile('notes.md');
    const data = file.toDict();
    expect(data.file_type).toBe(ContextFileType.MARKDOWN);

    const restored = ContextFile.fromDict(data);
    expect(restored.uri).toBe('notes.md');
    expect(restored.fileType).toBe(ContextFileType.MARKDOWN);
  });

  it('defaults to UNKNOWN for invalid fileType in fromDict', () => {
    const restored = ContextFile.fromDict({
      uri: 'file.bin',
      file_type: 'not-a-type',
      file_name: 'file.bin',
      metadata: {}
    });
    expect(restored.fileType).toBe(ContextFileType.UNKNOWN);
  });

  it('throws when uri is invalid', () => {
    expect(() => ContextFile.fromDict({ file_type: 'text' } as any)).toThrow();
  });
});
