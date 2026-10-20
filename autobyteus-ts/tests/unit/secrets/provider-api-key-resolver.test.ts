import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSyntheticTestVault } from '../../../../test-support/test-vault/synthetic-test-vault.js';
import { providerApiKeyResolver } from '../provider-api-key-resolver-test-helpers.js';

const SETTING = 'AUTOBYTEUS_TEST_VAULT';
const SYNTHETIC_DEEPSEEK = 'synthetic-deepseek-environment-value';

type ResolverModule = typeof import('../../../src/secrets/provider-api-key-resolver.js');

/** A fresh copy of the module, so `disableEnvironmentProviderApiKeySource` and the cache start clean. */
const freshResolverModule = async (): Promise<ResolverModule> => {
  vi.resetModules();
  return import('../../../src/secrets/provider-api-key-resolver.js');
};

const reveal = async (promise: Promise<{ revealToTrustedConsumer(): string }>) =>
  (await promise).revealToTrustedConsumer();

describe('provider API key resolution order: explicit, then AUTOBYTEUS_TEST_VAULT', () => {
  let root: string;
  let vaultDirectory: string;
  let previous: string | undefined;

  beforeEach(() => {
    previous = process.env[SETTING];
    delete process.env[SETTING];
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'environment-key-source-')));
    vaultDirectory = path.join(root, 'vault');
    createSyntheticTestVault(vaultDirectory, { 'provider.deepseek.api-key': SYNTHETIC_DEEPSEEK });
  });

  afterEach(() => {
    if (previous === undefined) delete process.env[SETTING];
    else process.env[SETTING] = previous;
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('uses the explicit resolver when one is given, even with the variable set', async () => {
    const { resolveProviderApiKeyResolver } = await freshResolverModule();
    process.env[SETTING] = vaultDirectory;
    const resolver = resolveProviderApiKeyResolver(providerApiKeyResolver('synthetic-explicit'));
    await expect(reveal(resolver.resolve('DEEPSEEK'))).resolves.toBe('synthetic-explicit');
  });

  it('fails with MissingApiKeyError for the provider when the variable is unset', async () => {
    const { resolveProviderApiKeyResolver } = await freshResolverModule();
    const failure = await resolveProviderApiKeyResolver().resolve('DEEPSEEK').catch((error: unknown) => error);
    expect(failure).toMatchObject({ kind: 'missing_api_key', providerId: 'DEEPSEEK' });
  });

  it('reads the key from the test vault the variable names, at the moment it is needed', async () => {
    const { resolveProviderApiKeyResolver } = await freshResolverModule();
    const resolver = resolveProviderApiKeyResolver();
    process.env[SETTING] = vaultDirectory;
    await expect(reveal(resolver.resolve('DEEPSEEK'))).resolves.toBe(SYNTHETIC_DEEPSEEK);
  });

  it('opens each vault once per process', async () => {
    const { resolveProviderApiKeyResolver } = await freshResolverModule();
    process.env[SETTING] = vaultDirectory;
    await expect(reveal(resolveProviderApiKeyResolver().resolve('DEEPSEEK'))).resolves.toBe(SYNTHETIC_DEEPSEEK);
    // The files are gone, but the vault opened for the first lookup still serves the second.
    fs.rmSync(vaultDirectory, { recursive: true, force: true });
    await expect(reveal(resolveProviderApiKeyResolver().resolve('DEEPSEEK'))).resolves.toBe(SYNTHETIC_DEEPSEEK);
  });

  it('reports a key the vault does not hold as a missing capability naming the secret and the setup command', async () => {
    const { resolveProviderApiKeyResolver } = await freshResolverModule();
    process.env[SETTING] = vaultDirectory;
    const failure = await resolveProviderApiKeyResolver().resolve('OPENAI').catch((error: unknown) => error);
    expect(failure).toMatchObject({ kind: 'missing_api_key', providerId: 'OPENAI' });
    expect(String((failure as Error).message)).toBe(
      `missing capability provider.openai.api-key for OPENAI (test vault ${vaultDirectory}); add it with pnpm test-vault setup`,
    );
  });

  it('names provider and slot for a provider without a vault entry (SECRET_PROVIDER_UNKNOWN)', async () => {
    const { resolveProviderApiKeyResolver } = await freshResolverModule();
    process.env[SETTING] = vaultDirectory;
    const failure = await resolveProviderApiKeyResolver().resolve('OLLAMA').catch((error: unknown) => error);
    expect(failure).toMatchObject({ code: 'PROVIDER_UNKNOWN', instructionCode: 'SECRET_PROVIDER_UNKNOWN' });
    expect(String((failure as Error).message)).toContain('provider OLLAMA (slot apiKey)');
  });

  it.each([
    ['a forbidden location', () => path.join(os.homedir(), '.autobyteus', 'never-created-test-vault'), 'TEST_VAULT_LOCATION_FORBIDDEN'],
    ['a missing vault', () => path.join(root, 'absent'), 'TEST_VAULT_NOT_FOUND'],
    ['a vault that is not READY', () => {
      fs.writeFileSync(path.join(vaultDirectory, 'test-vault.db.secret.key'), Buffer.alloc(32, 7), { mode: 0o600 });
      return vaultDirectory;
    }, 'TEST_VAULT_UNAVAILABLE'],
  ] as const)('fails for %s with its code, naming the provider', async (_label, directory, code) => {
    const { resolveProviderApiKeyResolver } = await freshResolverModule();
    process.env[SETTING] = directory();
    const failure = await resolveProviderApiKeyResolver().resolve('DEEPSEEK').catch((error: unknown) => error);
    expect(failure).toMatchObject({ code, instructionCode: code });
    expect(String((failure as Error).message)).toContain('(key for DEEPSEEK)');
    if (code === 'TEST_VAULT_NOT_FOUND') expect(String((failure as Error).message)).toContain('pnpm test-vault setup');
  });

  it('is off after disableEnvironmentProviderApiKeySource (applications that own a vault)', async () => {
    const { disableEnvironmentProviderApiKeySource, resolveProviderApiKeyResolver } = await freshResolverModule();
    process.env[SETTING] = vaultDirectory;
    disableEnvironmentProviderApiKeySource();
    const failure = await resolveProviderApiKeyResolver().resolve('DEEPSEEK').catch((error: unknown) => error);
    expect(failure).toMatchObject({ kind: 'missing_api_key', providerId: 'DEEPSEEK' });
  });

  it('lets a client built without a resolver use the test vault (no extra key code)', async () => {
    vi.resetModules();
    const { DeepSeekLLM } = await import('../../../src/llm/api/deepseek-llm.js');
    const { LLMModel } = await import('../../../src/llm/models.js');
    const { LLMProvider } = await import('../../../src/llm/providers.js');
    const { LLMConfig } = await import('../../../src/llm/utils/llm-config.js');
    process.env[SETTING] = vaultDirectory;
    const llm = new DeepSeekLLM(new LLMModel({
      name: 'deepseek-v4-flash',
      value: 'deepseek-v4-flash',
      canonicalName: 'deepseek-v4-flash',
      provider: LLMProvider.DEEPSEEK,
    }), new LLMConfig());
    try {
      const client = await (llm as unknown as { getClient(): Promise<{ apiKey: string }> }).getClient();
      expect(client.apiKey).toBe(SYNTHETIC_DEEPSEEK);
    } finally {
      await llm.cleanup();
    }
  });
});
