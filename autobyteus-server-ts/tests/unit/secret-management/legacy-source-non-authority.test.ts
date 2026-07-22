import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppConfig } from '../../../src/config/app-config.js';
import { appConfigProvider } from '../../../src/config/app-config-provider.js';
import {
  CustomLlmProviderStore,
  CustomLlmProviderStoreError,
} from '../../../src/llm-management/llm-providers/stores/custom-llm-provider-store.js';
import { LEGACY_SECRET_ALIASES } from '../../../src/secret-management/provisioning/legacy-secret-alias-map.js';

const MUTATED_ENVIRONMENT_KEYS = [
  'OPENAI_API_KEY',
  'AUTOBYTEUS_API_KEY',
  'AUTOBYTEUS_MEMORY_DIR',
  'AUTOBYTEUS_LLM_SERVER_HOSTS',
  'DATABASE_URL',
  'LOG_LEVEL',
] as const;

describe('legacy source non-authority', () => {
  let root: string;
  const originalParentValues = new Map<string, string | undefined>();

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'legacy-source-non-authority-'));
    for (const key of MUTATED_ENVIRONMENT_KEYS) {
      originalParentValues.set(key, process.env[key]);
      delete process.env[key];
    }
    process.env.OPENAI_API_KEY = 'synthetic-parent-openai';
    process.env.AUTOBYTEUS_API_KEY = 'synthetic-parent-autobyteus';
    appConfigProvider.resetForTests();
  });

  afterEach(async () => {
    appConfigProvider.resetForTests();
    for (const key of MUTATED_ENVIRONMENT_KEYS) {
      const previous = originalParentValues.get(key);
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
    originalParentValues.clear();
    await fs.rm(root, { recursive: true, force: true });
  });

  it('leaves canonical application bytes and parent aliases unchanged while projecting approved non-secret settings', async () => {
    const configPath = path.join(root, '.env');
    const source = Buffer.from([
      'AUTOBYTEUS_SERVER_HOST=http://localhost:8000',
      'APP_ENV=test',
      'DB_TYPE=sqlite',
      'export AUTOBYTEUS_LLM_SERVER_HOSTS = http://localhost:9000',
      ...LEGACY_SECRET_ALIASES.map((alias, index) => `${alias}=synthetic-file-${index}`),
      '',
    ].join('\r\n'));
    await fs.writeFile(configPath, source);

    const config = new AppConfig({ appDataDir: root });
    config.initialize();

    expect(await fs.readFile(configPath)).toEqual(source);
    expect(process.env.OPENAI_API_KEY).toBe('synthetic-parent-openai');
    expect(process.env.AUTOBYTEUS_API_KEY).toBe('synthetic-parent-autobyteus');
    for (const alias of LEGACY_SECRET_ALIASES) {
      expect(config.get(alias)).toBeUndefined();
      expect(config.get(alias, 'synthetic-default-must-not-authorize')).toBeUndefined();
      expect(config.getConfigData()).not.toHaveProperty(alias);
    }
    expect(config.get('AUTOBYTEUS_LLM_SERVER_HOSTS')).toBe('http://localhost:9000');

    config.set('AUTOBYTEUS_LLM_SERVER_HOSTS', 'http://localhost:9100');
    const afterNonSecretWrite = await fs.readFile(configPath, 'utf8');
    expect(afterNonSecretWrite).toBe(
      source.toString('utf8').replace(
        'export AUTOBYTEUS_LLM_SERVER_HOSTS = http://localhost:9000',
        'AUTOBYTEUS_LLM_SERVER_HOSTS=http://localhost:9100',
      ),
    );
  });

  it('leaves custom-provider v1 byte-for-byte unchanged and returns stable value-free reconfiguration guidance', async () => {
    const providerDirectory = path.join(root, 'llm');
    const providerPath = path.join(providerDirectory, 'custom-llm-providers.json');
    await fs.mkdir(providerDirectory, { recursive: true });
    const source = Buffer.from(JSON.stringify({
      version: 1,
      providers: [{
        id: 'provider_synthetic',
        name: 'Synthetic Legacy Provider',
        providerType: 'OPENAI_COMPATIBLE',
        baseUrl: 'https://synthetic.invalid/v1',
        apiKey: 'synthetic-legacy-provider-value',
      }],
    }, null, 2));
    await fs.writeFile(providerPath, source);
    appConfigProvider.initialize({ appDataDir: root });

    const error = await new CustomLlmProviderStore().listProviders().catch((caught) => caught);

    expect(error).toBeInstanceOf(CustomLlmProviderStoreError);
    expect(error.toJSON()).toEqual({ code: 'CUSTOM_PROVIDER_LEGACY_RECONFIGURATION_REQUIRED' });
    expect(JSON.stringify(error)).not.toContain('synthetic-legacy-provider-value');
    expect(await fs.readFile(providerPath)).toEqual(source);
    await expect(fs.stat(path.join(root, 'migrations'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(path.join(root, 'secret-store'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
