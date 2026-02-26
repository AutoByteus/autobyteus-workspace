import { describe, it, expect } from 'vitest';
import { MultimediaRuntime } from '../../../src/multimedia/runtimes.js';

describe('MultimediaRuntime', () => {
  it('exposes expected runtime values', () => {
    expect(MultimediaRuntime.API).toBe('api');
    expect(MultimediaRuntime.AUTOBYTEUS).toBe('autobyteus');
  });
});
