import { describe, expect, it } from 'vitest';
import {
  joinDiscoveryEndpointPath,
  normalizeDiscoveryEndpointIdentity,
  tryNormalizeDiscoveryEndpointIdentity,
} from '../../../src/llm/discovery-endpoint-identity.js';

describe('discovery endpoint identity', () => {
  it('normalizes the full adapter base while preserving path and query identity', () => {
    expect(normalizeDiscoveryEndpointIdentity(
      ' HTTPS://Example.COM:443/root/../models/?region=eu#ignored ',
    )).toBe('https://example.com/models/?region=eu');
    expect(normalizeDiscoveryEndpointIdentity('http://Example.COM:11434/'))
      .toBe('http://example.com:11434');
  });

  it('rejects credential-bearing, relative, and empty endpoints', () => {
    expect(() => normalizeDiscoveryEndpointIdentity('https://user:secret@example.com'))
      .toThrow('DISCOVERY_ENDPOINT_CREDENTIALS_NOT_ALLOWED');
    expect(tryNormalizeDiscoveryEndpointIdentity('localhost:11434')).toBeNull();
    expect(tryNormalizeDiscoveryEndpointIdentity('')).toBeNull();
  });

  it('appends adapter resources without discarding the full base identity', () => {
    expect(joinDiscoveryEndpointPath(
      'https://EXAMPLE.com:443/base/v2/?tenant=acme#ignored',
      '/models/llm',
    )).toBe('https://example.com/base/v2/models/llm?tenant=acme');
  });
});
