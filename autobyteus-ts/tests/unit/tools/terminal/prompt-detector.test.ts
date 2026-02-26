import { describe, it, expect } from 'vitest';
import { PromptDetector } from '../../../../src/tools/terminal/prompt-detector.js';

describe('PromptDetector', () => {
  it('detects $ prompt', () => {
    const detector = new PromptDetector();

    expect(detector.check('user@host:~$ ')).toBe(true);
    expect(detector.check('/home/user $ ')).toBe(true);
    expect(detector.check('$ ')).toBe(true);
  });

  it('detects # prompt', () => {
    const detector = new PromptDetector();

    expect(detector.check('root@host:~# ')).toBe(true);
    expect(detector.check('# ')).toBe(true);
  });

  it('returns false when no prompt is present', () => {
    const detector = new PromptDetector();

    expect(detector.check('some output')).toBe(false);
    expect(detector.check('still running...')).toBe(false);
    expect(detector.check('')).toBe(false);
  });

  it('detects prompt after output', () => {
    const detector = new PromptDetector();

    const output = `total 4
` +
      `drwxr-xr-x 2 user user 4096 Jan  1 00:00 folder
` +
      `-rw-r--r-- 1 user user    0 Jan  1 00:00 file.txt
` +
      `user@host:~$ `;

    expect(detector.check(output)).toBe(true);
  });

  it('returns false for partial output without prompt', () => {
    const detector = new PromptDetector();

    const output = `Installing packages...
` +
      `[1/10] Installing package A
` +
      `[2/10] Installing package B`;

    expect(detector.check(output)).toBe(false);
  });

  it('supports custom patterns', () => {
    const detector = new PromptDetector('>>>\\s*$');

    expect(detector.check('>>> ')).toBe(true);
    expect(detector.check('$ ')).toBe(false);
  });

  it('updates pattern dynamically', () => {
    const detector = new PromptDetector();

    expect(detector.check('$ ')).toBe(true);
    expect(detector.check('>>> ')).toBe(false);

    detector.setPattern('>>>\\s*$');

    expect(detector.check('$ ')).toBe(false);
    expect(detector.check('>>> ')).toBe(true);
  });

  it('exposes current pattern', () => {
    const custom = 'custom\\s*$';
    const detector = new PromptDetector(custom);

    expect(detector.pattern).toBe(custom);
  });

  it('checks only last line for prompt', () => {
    const detector = new PromptDetector();

    const output_no_prompt = `$ ls
` +
      `file1
` +
      `file2
` +
      `still working`;
    expect(detector.check(output_no_prompt)).toBe(false);

    const output_with_prompt = `$ ls
` +
      `file1
` +
      `file2
` +
      `user@host:~$ `;
    expect(detector.check(output_with_prompt)).toBe(true);
  });

  it('handles trailing whitespace variations', () => {
    const detector = new PromptDetector();

    expect(detector.check('$')).toBe(true);
    expect(detector.check('$ ')).toBe(true);
    expect(detector.check('$  ')).toBe(true);
    expect(detector.check('$ \t')).toBe(true);
  });
});
