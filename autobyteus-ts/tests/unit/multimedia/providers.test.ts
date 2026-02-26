import { describe, it, expect } from 'vitest';
import { MultimediaProvider } from '../../../src/multimedia/providers.js';

describe('MultimediaProvider', () => {
  it('exposes expected provider values', () => {
    expect(MultimediaProvider.OPENAI).toBe('OPENAI');
    expect(MultimediaProvider.GEMINI).toBe('GEMINI');
    expect(MultimediaProvider.QWEN).toBe('QWEN');
    expect(MultimediaProvider.AUTOBYTEUS).toBe('AUTOBYTEUS');
  });
});
