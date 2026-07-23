import { describe, expect, it, vi } from 'vitest';
import { SecretValue } from 'autobyteus-ts';
import { SecretStorageError } from '../../../src/secret-management/domain/secret-storage-types.js';
import { SecretManagementProviderApiKeyResolver } from '../../../src/secret-management/resolution/secret-management-provider-api-key-resolver.js';

describe('SecretManagementProviderApiKeyResolver', () => {
  it('binds the LLM subject and maps configured status without resolving a value', async () => {
    const getStatusForConsumer = vi.fn().mockResolvedValue({
      health: { state: 'READY' },
      secret: {
        storageState: 'CONFIGURED',
        lifecycle: { kind: 'WRITABLE' },
      },
    });
    const resolveForUse = vi.fn();
    const resolver = new SecretManagementProviderApiKeyResolver(
      { kind: 'llm' },
      () => ({ getStatusForConsumer, resolveForUse }) as never,
    );

    await expect(
      resolver.getStatus('GEMINI', 'geminiAiStudioApiKey'),
    ).resolves.toBe('CONFIGURED');
    expect(getStatusForConsumer).toHaveBeenCalledWith({
      kind: 'llm',
      providerId: 'GEMINI',
      credentialSlot: 'geminiAiStudioApiKey',
    });
    expect(resolveForUse).not.toHaveBeenCalled();
  });

  it('binds the exact media subject and returns the opaque resolved value', async () => {
    const expected = SecretValue.fromString('synthetic-media-key');
    const resolveForUse = vi.fn().mockResolvedValue(expected);
    const resolver = new SecretManagementProviderApiKeyResolver(
      { kind: 'media', mediaKind: 'image' },
      () => ({ resolveForUse }) as never,
    );

    await expect(resolver.resolve('OPENAI')).resolves.toBe(expected);
    expect(resolveForUse).toHaveBeenCalledWith({
      kind: 'media',
      mediaKind: 'image',
      providerId: 'OPENAI',
      credentialSlot: 'apiKey',
    });
  });

  it('binds metadata resolution to the llmMetadata subject', async () => {
    const expected = SecretValue.fromString('synthetic-metadata-key');
    const resolveForUse = vi.fn().mockResolvedValue(expected);
    const resolver = new SecretManagementProviderApiKeyResolver(
      { kind: 'llmMetadata' },
      () => ({ resolveForUse }) as never,
    );

    await expect(
      resolver.resolve('GEMINI', 'geminiAiStudioApiKey'),
    ).resolves.toBe(expected);
    expect(resolveForUse).toHaveBeenCalledWith({
      kind: 'llmMetadata',
      providerId: 'GEMINI',
      credentialSlot: 'geminiAiStudioApiKey',
    });
  });

  it.each([
    ['LOCKED', 'BACKEND_LOCKED'],
    ['UNAVAILABLE', 'BACKEND_UNAVAILABLE'],
    ['CORRUPT', 'CORRUPT_STORE'],
    ['INCOMPATIBLE', 'INCOMPATIBLE_STORE_FORMAT'],
  ] as const)('maps %s custody health to %s without a value channel', async (state, code) => {
    const instructionCode = {
      LOCKED: 'SECRET_BACKEND_LOCKED',
      UNAVAILABLE: 'SECRET_BACKEND_UNAVAILABLE',
      CORRUPT: 'SECRET_BACKEND_CORRUPT',
      INCOMPATIBLE: 'SECRET_BACKEND_INCOMPATIBLE',
    }[state];
    const resolver = new SecretManagementProviderApiKeyResolver(
      { kind: 'llm' },
      () => ({
        getStatusForConsumer: vi.fn().mockResolvedValue({
          health: { state, instructionCode },
          secret: null,
        }),
      }) as never,
    );

    const error = await resolver.getStatus('OPENAI').catch((cause) => cause);
    expect(error).toBeInstanceOf(SecretStorageError);
    expect(error).toMatchObject({ code, messageCode: instructionCode });
  });
});
