import { describe, expect, it, vi } from 'vitest';
import { SecretValue } from 'autobyteus-ts';
import { SecretManagementProviderApiKeyResolver } from '../../../src/secret-management/resolution/secret-management-provider-api-key-resolver.js';

describe('SecretManagementProviderApiKeyResolver', () => {
  it.each([
    [{ kind: 'llm' }, 'GEMINI', 'geminiAiStudioApiKey', {
      kind: 'llm', providerId: 'GEMINI', credentialSlot: 'geminiAiStudioApiKey',
    }],
    [{ kind: 'llmMetadata' }, 'GEMINI', 'geminiAiStudioApiKey', {
      kind: 'llmMetadata', providerId: 'GEMINI', credentialSlot: 'geminiAiStudioApiKey',
    }],
    [{ kind: 'media', mediaKind: 'image' }, 'OPENAI', 'apiKey', {
      kind: 'media', mediaKind: 'image', providerId: 'OPENAI', credentialSlot: 'apiKey',
    }],
  ] as const)('binds only the adapter subject at resolution time', async (
    subject,
    providerId,
    slot,
    expectedConsumer,
  ) => {
    const expected = SecretValue.fromString('synthetic-resolved-key');
    const resolveForUse = vi.fn().mockResolvedValue(expected);
    const resolver = new SecretManagementProviderApiKeyResolver(
      subject,
      () => ({ resolveForUse }) as never,
    );

    await expect(resolver.resolve(providerId, slot)).resolves.toBe(expected);
    expect(resolveForUse).toHaveBeenCalledWith(expectedConsumer);
  });

  it('has no status, raw SecretId, or fallback resolution surface', () => {
    const resolver = new SecretManagementProviderApiKeyResolver(
      { kind: 'llm' },
      () => ({ resolveForUse: vi.fn() }) as never,
    );
    expect(Object.getOwnPropertyNames(Object.getPrototypeOf(resolver)).sort()).toEqual([
      'constructor',
      'consumer',
      'resolve',
    ]);
  });
});
