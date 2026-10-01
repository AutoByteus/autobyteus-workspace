import { describe, it, expect } from 'vitest';
import { ExternalChannelParseError } from '../../../src/external-channel/errors.js';
import { ExternalChannelProvider, parseExternalChannelProvider } from '../../../src/external-channel/provider.js';

describe('ExternalChannelProvider', () => {
  it('parses known providers', () => {
    expect(parseExternalChannelProvider('WHATSAPP')).toBe(ExternalChannelProvider.WHATSAPP);
    expect(parseExternalChannelProvider('WECOM')).toBe(ExternalChannelProvider.WECOM);
    expect(parseExternalChannelProvider('WECHAT')).toBe(ExternalChannelProvider.WECHAT);
    expect(parseExternalChannelProvider('DISCORD')).toBe(ExternalChannelProvider.DISCORD);
    expect(parseExternalChannelProvider('TELEGRAM')).toBe(ExternalChannelProvider.TELEGRAM);
  });

  it('throws on invalid provider', () => {
    expect(() => parseExternalChannelProvider('SLACK')).toThrowError(ExternalChannelParseError);

    try {
      parseExternalChannelProvider('SLACK');
    } catch (error) {
      expect((error as ExternalChannelParseError).code).toBe('INVALID_PROVIDER');
    }
  });
});
