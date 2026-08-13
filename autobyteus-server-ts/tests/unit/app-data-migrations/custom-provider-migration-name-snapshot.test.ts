import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import { CustomProviderMigrationNameSnapshotReader } from '../../../src/app-data-migrations/migrations/custom-provider-migration-name-snapshot.js';

const dirs: string[] = [];
const setup = async (value?: unknown): Promise<{ dir: string; reader: CustomProviderMigrationNameSnapshotReader }> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'provider-name-snapshot-'));
  dirs.push(dir);
  if (value !== undefined) {
    await fs.mkdir(path.join(dir, 'llm'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'llm', 'custom-llm-providers.json'),
      `${JSON.stringify(value)}\n`,
    );
  }
  return { dir, reader: new CustomProviderMigrationNameSnapshotReader(dir) };
};

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

const record = (id: string, name: string) => ({
  id,
  name,
  providerType: LLMProvider.OPENAI_COMPATIBLE,
  baseUrl: 'https://example.test/v1',
});

describe('CustomProviderMigrationNameSnapshotReader', () => {
  it('strictly projects only id/name from missing, V2, and V3 files', async () => {
    await expect((await setup()).reader.read()).resolves.toEqual([]);
    await expect((await setup({
      version: 2,
      providers: [record('provider_0123456789abcdef', 'Alibaba Cloud')],
    })).reader.read()).resolves.toEqual([
      { id: 'provider_0123456789abcdef', name: 'Alibaba Cloud' },
    ]);
    await expect((await setup({
      version: 3,
      providers: [record('provider_alibaba_cloud', 'Alibaba Cloud')],
    })).reader.read()).resolves.toEqual([
      { id: 'provider_alibaba_cloud', name: 'Alibaba Cloud' },
    ]);
  });

  it('rejects V1 and malformed or noncanonical V3 without a runtime fallback', async () => {
    await expect((await setup({ version: 1, providers: [] })).reader.read())
      .rejects.toThrow('CUSTOM_PROVIDER_MIGRATION_NAME_SNAPSHOT_INVALID');
    await expect((await setup({
      version: 3,
      providers: [record('provider_random', 'Alibaba Cloud')],
    })).reader.read()).rejects.toThrow('CUSTOM_PROVIDER_MIGRATION_NAME_SNAPSHOT_INVALID');
  });
});
