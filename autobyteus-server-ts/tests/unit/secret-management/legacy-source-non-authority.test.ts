import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppConfig } from '../../../src/config/app-config.js';
import { appConfigProvider } from '../../../src/config/app-config-provider.js';
import { parseNonSecretEnvironment } from '../../../src/config/non-secret-environment-projection.js';
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

const DOTENV_LEADING_WHITESPACE_CASES = [
  { label: 'tab', prefix: '\u0009' },
  { label: 'line feed', prefix: '\u000A' },
  { label: 'vertical tab', prefix: '\u000B' },
  { label: 'form feed', prefix: '\u000C' },
  { label: 'carriage return', prefix: '\u000D' },
  { label: 'space', prefix: '\u0020' },
  { label: 'no-break space', prefix: '\u00A0' },
  { label: 'ogham space mark', prefix: '\u1680' },
  ...Array.from({ length: 11 }, (_, index) => ({
    label: `U+${(0x2000 + index).toString(16).toUpperCase()}`,
    prefix: String.fromCodePoint(0x2000 + index),
  })),
  { label: 'line separator', prefix: '\u2028' },
  { label: 'paragraph separator', prefix: '\u2029' },
  { label: 'narrow no-break space', prefix: '\u202F' },
  { label: 'medium mathematical space', prefix: '\u205F' },
  { label: 'ideographic space', prefix: '\u3000' },
  { label: 'UTF-8 BOM', prefix: '\uFEFF' },
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

  it('excludes mapped assignments by name before invoking the generic environment parser', () => {
    const canary = 'synthetic-name-first-canary';
    const source = [
      `OPENAI_API_KEY="${canary}`,
      'AUTOBYTEUS_SERVER_HOST=http://inside-excluded-value.invalid',
      '"',
      `export AUTOBYTEUS_API_KEY = '${canary}-second'`,
      'AUTOBYTEUS_SERVER_HOST=http://localhost:8000',
      'AUTOBYTEUS_LLM_SERVER_HOSTS=http://localhost:9000',
      '',
    ].join('\n');
    const genericParser = vi.fn((admitted: string) => dotenv.parse(admitted));

    const projected = parseNonSecretEnvironment(
      source,
      new Set<string>(LEGACY_SECRET_ALIASES),
      genericParser,
    );

    expect(genericParser).toHaveBeenCalledOnce();
    const admitted = genericParser.mock.calls[0]?.[0] ?? '';
    expect(admitted).not.toContain(canary);
    expect(admitted).not.toContain('OPENAI_API_KEY');
    expect(admitted).not.toContain('AUTOBYTEUS_API_KEY');
    expect(projected).toEqual({
      AUTOBYTEUS_SERVER_HOST: 'http://localhost:8000',
      AUTOBYTEUS_LLM_SERVER_HOSTS: 'http://localhost:9000',
    });
  });

  it.each(DOTENV_LEADING_WHITESPACE_CASES)(
    'excludes mapped assignments with dotenv-accepted leading $label before parsing or retention',
    async ({ prefix }) => {
      const canary = 'synthetic-leading-whitespace-canary';
      const source = [
        `${prefix}OPENAI_API_KEY=${canary}-direct`,
        `${prefix}export${prefix}AUTOBYTEUS_API_KEY=${canary}-exported`,
        'AUTOBYTEUS_SERVER_HOST=http://localhost:8000',
        '',
      ].join('\n');
      const genericParser = vi.fn((admitted: string) => dotenv.parse(admitted));

      const projected = parseNonSecretEnvironment(
        source,
        new Set<string>(LEGACY_SECRET_ALIASES),
        genericParser,
      );

      const admitted = genericParser.mock.calls[0]?.[0] ?? '';
      expect(admitted).not.toContain(canary);
      expect(admitted).not.toContain('OPENAI_API_KEY');
      expect(admitted).not.toContain('AUTOBYTEUS_API_KEY');
      expect(projected).toEqual({ AUTOBYTEUS_SERVER_HOST: 'http://localhost:8000' });

      await fs.writeFile(path.join(root, '.env'), source);
      const config = new AppConfig({ appDataDir: root });
      config.initialize();
      const retained = config.getConfigData();
      expect(retained).not.toHaveProperty('OPENAI_API_KEY');
      expect(retained).not.toHaveProperty('AUTOBYTEUS_API_KEY');
      expect(JSON.stringify(retained)).not.toContain(canary);
      expect(retained.AUTOBYTEUS_SERVER_HOST).toBe('http://localhost:8000');
    },
  );

  it('excludes the mapped dotenv colon-assignment form before parsing or retention', async () => {
    const canary = 'synthetic-colon-assignment-canary';
    const source = [
      `\uFEFFOPENAI_API_KEY:\u00A0${canary}`,
      'AUTOBYTEUS_SERVER_HOST=http://localhost:8000',
      '',
    ].join('\n');
    const genericParser = vi.fn((admitted: string) => dotenv.parse(admitted));

    const projected = parseNonSecretEnvironment(
      source,
      new Set<string>(LEGACY_SECRET_ALIASES),
      genericParser,
    );

    const admitted = genericParser.mock.calls[0]?.[0] ?? '';
    expect(admitted).not.toContain(canary);
    expect(admitted).not.toContain('OPENAI_API_KEY');
    expect(projected).toEqual({ AUTOBYTEUS_SERVER_HOST: 'http://localhost:8000' });

    await fs.writeFile(path.join(root, '.env'), source);
    const config = new AppConfig({ appDataDir: root });
    config.initialize();
    const retained = config.getConfigData();
    expect(retained).not.toHaveProperty('OPENAI_API_KEY');
    expect(JSON.stringify(retained)).not.toContain(canary);
    expect(retained.AUTOBYTEUS_SERVER_HOST).toBe('http://localhost:8000');
  });

  it('masks a complete dotenv multiline quoted assignment after newline and Unicode whitespace', async () => {
    const canary = 'synthetic-post-separator-canary';
    const acceptedEscapedQuote = '\\\\' + '"';
    const source = [
      'OPENAI_API_KEY=',
      `\u00A0"${canary}-first`,
      `accepted-${acceptedEscapedQuote}-continuation`,
      'AUTOBYTEUS_SERVER_HOST=http://inside-excluded-value.invalid',
      `${canary}-last"`,
      'AUTOBYTEUS_SERVER_HOST=http://localhost:8000',
      '',
    ].join('\n');
    const parsedFixture = dotenv.parse(source);
    expect(parsedFixture.OPENAI_API_KEY).toContain(
      'AUTOBYTEUS_SERVER_HOST=http://inside-excluded-value.invalid',
    );
    expect(parsedFixture.AUTOBYTEUS_SERVER_HOST).toBe('http://localhost:8000');
    const genericParser = vi.fn((admitted: string) => dotenv.parse(admitted));

    const projected = parseNonSecretEnvironment(
      source,
      new Set<string>(LEGACY_SECRET_ALIASES),
      genericParser,
    );

    const admitted = genericParser.mock.calls[0]?.[0] ?? '';
    expect(admitted).not.toContain(canary);
    expect(admitted).not.toContain('http://inside-excluded-value.invalid');
    expect(projected).toEqual({ AUTOBYTEUS_SERVER_HOST: 'http://localhost:8000' });

    const configPath = path.join(root, '.env');
    await fs.writeFile(configPath, source);
    const config = new AppConfig({ appDataDir: root });
    config.initialize();
    const retained = config.getConfigData();
    expect(retained).not.toHaveProperty('OPENAI_API_KEY');
    expect(JSON.stringify(retained)).not.toContain(canary);
    expect(JSON.stringify(retained)).not.toContain('http://inside-excluded-value.invalid');
    expect(retained.AUTOBYTEUS_SERVER_HOST).toBe('http://localhost:8000');
    expect(await fs.readFile(configPath, 'utf8')).toBe(source);
  });

  it('masks the complete dotenv colon-newline unquoted assignment', async () => {
    const insideValue = 'AUTOBYTEUS_SERVER_HOST=http://inside-excluded-value.invalid';
    const source = [
      'OPENAI_API_KEY:',
      insideValue,
      'AUTOBYTEUS_SERVER_HOST=http://localhost:8000',
      '',
    ].join('\n');
    expect(dotenv.parse(source)).toEqual({
      OPENAI_API_KEY: insideValue,
      AUTOBYTEUS_SERVER_HOST: 'http://localhost:8000',
    });
    const genericParser = vi.fn((admitted: string) => dotenv.parse(admitted));

    const projected = parseNonSecretEnvironment(
      source,
      new Set<string>(LEGACY_SECRET_ALIASES),
      genericParser,
    );

    const admitted = genericParser.mock.calls[0]?.[0] ?? '';
    expect(admitted).not.toContain(insideValue);
    expect(projected).toEqual({ AUTOBYTEUS_SERVER_HOST: 'http://localhost:8000' });

    await fs.writeFile(path.join(root, '.env'), source);
    const config = new AppConfig({ appDataDir: root });
    config.initialize();
    expect(config.getConfigData().AUTOBYTEUS_SERVER_HOST).toBe('http://localhost:8000');
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
