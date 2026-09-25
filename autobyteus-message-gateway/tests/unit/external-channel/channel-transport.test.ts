import { describe, it, expect } from 'vitest';
import { ExternalChannelParseError } from '../../../src/external-channel/errors.js';
import { ExternalChannelTransport, parseExternalChannelTransport } from '../../../src/external-channel/channel-transport.js';

describe('ExternalChannelTransport', () => {
  it('parses known transport values', () => {
    expect(parseExternalChannelTransport('BUSINESS_API')).toBe(ExternalChannelTransport.BUSINESS_API);
    expect(parseExternalChannelTransport('PERSONAL_SESSION')).toBe(ExternalChannelTransport.PERSONAL_SESSION);
  });

  it('throws on invalid transport', () => {
    expect(() => parseExternalChannelTransport('UNKNOWN')).toThrowError(ExternalChannelParseError);
    try {
      parseExternalChannelTransport('UNKNOWN');
    } catch (error) {
      expect((error as ExternalChannelParseError).code).toBe('INVALID_TRANSPORT');
    }
  });
});
