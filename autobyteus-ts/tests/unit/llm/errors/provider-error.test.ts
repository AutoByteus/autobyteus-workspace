import { describe, expect, it } from 'vitest';
import { extractProviderErrorEvidence } from '../../../../src/llm/errors/provider-error.js';
import { MissingApiKeyError } from '../../../../src/secrets/provider-api-key-error.js';

describe('provider error evidence', () => {
  it('preserves safe provider message and metadata while redacting credentials', () => {
    const evidence = extractProviderErrorEvidence({
      message: 'Quota rejected for token=secret-value',
      status: 429,
      code: 'insufficient_quota',
      request_id: 'req-123',
      response: { headers: { 'x-request-id': 'header-id' } },
    });

    expect(evidence).toEqual({
      message: 'Quota rejected for token=<redacted>',
      providerStatus: 429,
      providerCode: 'insufficient_quota',
      providerRequestId: 'req-123',
    });
  });

  it('uses an explicit missing-key setup error without exposing a secret', () => {
    const error = new MissingApiKeyError('GEMINI');
    expect(error.kind).toBe('missing_api_key');
    expect(error.message).toBe('API key not provided for GEMINI. Configure the GEMINI API key before sending a request.');
    expect(error.message).not.toContain('secret');
  });
});
