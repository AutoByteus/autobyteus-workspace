import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runLegacySecretCutoverMigration } from '../../../src/secret-management/migration/legacy-secret-cutover-migration.js';

const roots = new Set<string>();
const createRoot = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-cutover-'));
  roots.add(root);
  await fs.mkdir(path.join(root, 'llm'), { recursive: true });
  return root;
};

afterEach(async () => {
  await Promise.all([...roots].map((root) => fs.rm(root, { recursive: true, force: true })));
  roots.clear();
});

describe('legacy secret cutover migration', () => {
  it('preserves non-secret configuration and provider metadata while requiring reprovision', async () => {
    const root = await createRoot();
    await fs.writeFile(path.join(root, '.env'), [
      'AUTOBYTEUS_SERVER_HOST=http://localhost:8000',
      'OPENAI_API_KEY=synthetic-legacy-value',
      'LOG_LEVEL=INFO',
    ].join('\n'));
    await fs.writeFile(path.join(root, 'llm', 'custom-llm-providers.json'), JSON.stringify({
      version: 1,
      providers: [{
        id: 'provider_fixture',
        name: 'Fixture',
        providerType: 'OPENAI_COMPATIBLE',
        baseUrl: 'https://fixture.invalid/v1',
        apiKey: 'synthetic-legacy-value',
      }],
    }));

    const ledger = runLegacySecretCutoverMigration(root);
    const environment = await fs.readFile(path.join(root, '.env'), 'utf8');
    const providers = JSON.parse(await fs.readFile(
      path.join(root, 'llm', 'custom-llm-providers.json'), 'utf8',
    ));

    expect(environment).toContain('AUTOBYTEUS_SERVER_HOST=http://localhost:8000');
    expect(environment).toContain('LOG_LEVEL=INFO');
    expect(environment).not.toContain('OPENAI_API_KEY');
    expect(providers).toEqual({
      version: 2,
      providers: [{
        id: 'provider_fixture',
        name: 'Fixture',
        providerType: 'OPENAI_COMPATIBLE',
        baseUrl: 'https://fixture.invalid/v1',
      }],
    });
    expect(ledger.reprovisionDefinitionIds).toEqual([
      'provider.openai-compatible.provider_fixture.api-key',
      'provider.openai.api-key',
    ]);
  });

  it('fails closed and leaves malformed custom-provider source untouched', async () => {
    const root = await createRoot();
    const providerFile = path.join(root, 'llm', 'custom-llm-providers.json');
    await fs.writeFile(path.join(root, '.env'), 'AUTOBYTEUS_SERVER_HOST=http://localhost:8000\n');
    await fs.writeFile(providerFile, '{ malformed');

    expect(() => runLegacySecretCutoverMigration(root))
      .toThrow('SECRET_CUSTODY_MIGRATION_INVALID_SOURCE');
    await expect(fs.readFile(providerFile, 'utf8')).resolves.toBe('{ malformed');
  });
});
