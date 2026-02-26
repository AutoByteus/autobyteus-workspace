import { describe, it, expect } from 'vitest';
import { stripAnsiCodes } from '../../../../src/tools/terminal/ansi-utils.js';

describe('stripAnsiCodes', () => {
  it('removes color escape sequences', () => {
    const input = '\x1b[31mRed text\x1b[0m';
    expect(stripAnsiCodes(input)).toBe('Red text');
  });

  it('removes mixed escape sequences', () => {
    const input = 'Hello\x1b[1;32m World\x1b[0m';
    expect(stripAnsiCodes(input)).toBe('Hello World');
  });

  it('returns empty string when input is empty', () => {
    expect(stripAnsiCodes('')).toBe('');
  });

  it('handles non-ansi content', () => {
    const input = 'plain text';
    expect(stripAnsiCodes(input)).toBe(input);
  });
});
