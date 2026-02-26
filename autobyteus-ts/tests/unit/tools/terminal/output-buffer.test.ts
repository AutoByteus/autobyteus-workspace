import { describe, it, expect } from 'vitest';
import { OutputBuffer } from '../../../../src/tools/terminal/output-buffer.js';

describe('OutputBuffer', () => {
  it('appends data and returns full content', () => {
    const buffer = new OutputBuffer();
    buffer.append(Buffer.from('Hello\n'));
    buffer.append(Buffer.from('World\n'));

    expect(buffer.getAll()).toBe('Hello\nWorld\n');
  });

  it('ignores empty data', () => {
    const buffer = new OutputBuffer();
    buffer.append(Buffer.from(''));
    buffer.append(Buffer.from('test\n'));

    expect(buffer.getAll()).toBe('test\n');
  });

  it('returns last n lines', () => {
    const buffer = new OutputBuffer();
    for (let i = 0; i < 10; i += 1) {
      buffer.append(Buffer.from(`line ${i}\n`));
    }

    const result = buffer.getLines(3);
    expect(result).toContain('line 7\n');
    expect(result).toContain('line 8\n');
    expect(result).toContain('line 9\n');
    expect(result).not.toContain('line 0\n');
  });

  it('returns all lines when requesting more than available', () => {
    const buffer = new OutputBuffer();
    buffer.append(Buffer.from('line 1\n'));
    buffer.append(Buffer.from('line 2\n'));

    expect(buffer.getLines(100)).toBe('line 1\nline 2\n');
  });

  it('clears content and resets size', () => {
    const buffer = new OutputBuffer();
    buffer.append(Buffer.from('test content\n'));
    expect(buffer.size).toBeGreaterThan(0);

    buffer.clear();
    expect(buffer.size).toBe(0);
    expect(buffer.getAll()).toBe('');
  });

  it('tracks size in bytes', () => {
    const buffer = new OutputBuffer();
    buffer.append(Buffer.from('hello'));

    expect(buffer.size).toBe(5);
  });

  it('tracks line count', () => {
    const buffer = new OutputBuffer();
    buffer.append(Buffer.from('line 1\n'));
    buffer.append(Buffer.from('line 2\n'));
    buffer.append(Buffer.from('line 3\n'));

    expect(buffer.lineCount).toBe(3);
  });

  it('respects max_bytes limit by discarding old data', () => {
    const buffer = new OutputBuffer(50);

    for (let i = 0; i < 20; i += 1) {
      buffer.append(Buffer.from(`line ${String(i).padStart(2, '0')}\n`));
    }

    expect(buffer.size).toBeLessThanOrEqual(50);
    expect(buffer.getAll()).toContain('line 19\n');
  });

  it('handles unicode input', () => {
    const buffer = new OutputBuffer();
    buffer.append(Buffer.from('Hello 世界\n', 'utf8'));

    expect(buffer.getAll()).toContain('世界');
  });

  it('handles invalid utf-8 bytes without throwing', () => {
    const buffer = new OutputBuffer();
    buffer.append(Buffer.from([0xff, 0xfe, 0x20, 0x69, 0x6e, 0x76, 0x61, 0x6c, 0x69, 0x64]));

    expect(buffer.getAll().length).toBeGreaterThan(0);
  });

  it('handles concurrent-style appends', async () => {
    const buffer = new OutputBuffer();
    const tasks = Array.from({ length: 5 }, (_, idx) => {
      return Promise.resolve().then(() => {
        for (let i = 0; i < 100; i += 1) {
          buffer.append(Buffer.from(`thread${idx}-${i}\n`));
        }
      });
    });

    await Promise.all(tasks);
    expect(buffer.lineCount).toBe(500);
  });
});
