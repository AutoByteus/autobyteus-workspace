import { describe, expect, it, vi } from 'vitest';
import { MissingApiKeyError, SecretValue } from 'autobyteus-ts';
import { SecretManagementProviderApiKeyResolver } from '../../../src/secret-management/resolution/secret-management-provider-api-key-resolver.js';
import { SecretVaultError } from '../../../src/secret-management/domain/secret-vault-types.js';

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

  it('maps a missing or blank vault value to the stable provider setup error', async () => {
    const notFoundResolver = new SecretManagementProviderApiKeyResolver(
      { kind: 'llm' },
      () => ({
        resolveForUse: vi.fn().mockRejectedValue(
          new SecretVaultError('NOT_FOUND', false, 'SECRET_NOT_FOUND'),
        ),
      }) as never,
    );
    await expect(notFoundResolver.resolve('GEMINI')).rejects.toMatchObject({
      kind: 'missing_api_key',
      message: 'API key not provided for GEMINI. Configure the GEMINI API key before sending a request.',
    });

    const blankResolver = new SecretManagementProviderApiKeyResolver(
      { kind: 'llm' },
      () => ({ resolveForUse: vi.fn().mockResolvedValue(SecretValue.fromString('  ')) }) as never,
    );
    await expect(blankResolver.resolve('GEMINI')).rejects.toBeInstanceOf(MissingApiKeyError);
  });

  it('preserves non-missing vault failures', async () => {
    const vaultError = new SecretVaultError('ACCESS_DENIED', false, 'SECRET_ACCESS_DENIED');
    const resolver = new SecretManagementProviderApiKeyResolver(
      { kind: 'llm' },
      () => ({ resolveForUse: vi.fn().mockRejectedValue(vaultError) }) as never,
    );

    await expect(resolver.resolve('GEMINI')).rejects.toBe(vaultError);
  });
});
