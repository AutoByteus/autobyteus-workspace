import { describe, expect, it } from 'vitest';
import { LONG_UNBROKEN_RUN_LENGTH, hasLongUnbrokenRun } from '../longUnbrokenRun';

// autobyteus-358 DS-007: only text with a run of at least 1,000 non-whitespace characters is shaped cheaply.
describe('hasLongUnbrokenRun', () => {
  it('is true from a run of exactly 1,000 non-whitespace characters, anywhere in the text', () => {
    expect(LONG_UNBROKEN_RUN_LENGTH).toBe(1000);
    expect(hasLongUnbrokenRun('y'.repeat(1000))).toBe(true);
    expect(hasLongUnbrokenRun(`intro text ${'QmFzZTY0'.repeat(200)} tail`)).toBe(true);
  });

  it('is false for shorter runs, prose and empty input, whatever the total length', () => {
    expect(hasLongUnbrokenRun('y'.repeat(999))).toBe(false);
    expect(hasLongUnbrokenRun(`${'y'.repeat(999)} ${'y'.repeat(999)}`)).toBe(false);
    expect(hasLongUnbrokenRun('a long message with ordinary words '.repeat(5000))).toBe(false);
    expect(hasLongUnbrokenRun('')).toBe(false);
    expect(hasLongUnbrokenRun(null)).toBe(false);
    expect(hasLongUnbrokenRun(undefined)).toBe(false);
  });

  it('treats tabs, newlines, no-break and ideographic spaces as breaks', () => {
    for (const space of ['\t', '\n', '\r', ' ', ' ', '　']) {
      expect(hasLongUnbrokenRun(`${'y'.repeat(600)}${space}${'y'.repeat(600)}`)).toBe(false);
    }
  });
});
