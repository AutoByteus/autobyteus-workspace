import { describe, expect, it } from 'vitest';
import { joinAutobyteusUrl } from '../../../src/clients/autobyteus-client-utils.js';

describe('joinAutobyteusUrl', () => {
  it('preserves the normalized discovery base path and query when appending a resource', () => {
    expect(joinAutobyteusUrl(
      'https://gateway.example.invalid/base/v2?tenant=acme',
      '/models/llm',
    )).toBe('https://gateway.example.invalid/base/v2/models/llm?tenant=acme');
  });

  it('keeps root-base behavior unchanged', () => {
    expect(joinAutobyteusUrl('https://gateway.example.invalid', '/models/image'))
      .toBe('https://gateway.example.invalid/models/image');
  });
});
