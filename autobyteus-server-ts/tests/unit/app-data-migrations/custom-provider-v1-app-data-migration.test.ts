import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CUSTOM_PROVIDER_V1_APP_DATA_MIGRATION_ID,
  CustomProviderV1AppDataMigration,
} from '../../../src/app-data-migrations/migrations/custom-provider-v1-app-data-migration.js';
import { CustomProviderV1MigrationFile } from '../../../src/app-data-migrations/migrations/custom-provider-v1-migration-file.js';

const secretRuntime = vi.hoisted(() => ({ requireService: vi.fn() }));

vi.mock('../../../src/secret-management/secret-vault-runtime.js', () => ({
  getSecretVaultRuntime: () => ({ requireService: secretRuntime.requireService }),
}));

const validV1 = {
  version: 1,
  providers: [{
    id: 'provider_alpha_uuid',
    name: 'Alpha Cloud',
    providerType: 'OPENAI_COMPATIBLE',
    baseUrl: 'https://alpha.synthetic.invalid/v1',
    apiKey: 'synthetic-inline-secret-canary',
  }],
};

describe('CustomProviderV1AppDataMigration', () => {
  let directory: string;
  let providerPath: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'custom-provider-v1-'));
    providerPath = path.join(directory, 'llm', 'custom-llm-providers.json');
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(directory, { recursive: true, force: true });
  });

  const writeProviderFile = async (value: unknown): Promise<Buffer> => {
    await fs.mkdir(path.dirname(providerPath), { recursive: true });
    const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
    await fs.writeFile(providerPath, bytes);
    return bytes;
  };

  it('retains the historical required migration identity', () => {
    expect(new CustomProviderV1AppDataMigration(directory)).toMatchObject({
      id: CUSTOM_PROVIDER_V1_APP_DATA_MIGRATION_ID,
      requiredOnStartup: true,
    });
  });

  it('treats missing, strict V2, and strict V3 as no-ops without vault access', async () => {
    const migration = new CustomProviderV1AppDataMigration(directory);
    await expect(migration.execute()).resolves.toMatchObject({
      status: 'SUCCEEDED',
      summary: { migratedCount: 0, failedCount: 0 },
    });

    for (const current of [
      { version: 2, providers: [] },
      { version: 3, providers: [] },
    ]) {
      const bytes = await writeProviderFile(current);
      await expect(migration.execute()).resolves.toMatchObject({
        status: 'SUCCEEDED',
        summary: { migratedCount: 0, failedCount: 0 },
      });
      expect(await fs.readFile(providerPath)).toEqual(bytes);
    }
    expect(secretRuntime.requireService).not.toHaveBeenCalled();
  });

  it('atomically stages valid V1 as owner-only secretless V2 and requires reconfiguration', async () => {
    await writeProviderFile(validV1);

    const result = await new CustomProviderV1AppDataMigration(directory).execute();

    expect(result).toMatchObject({
      status: 'SUCCEEDED_WITH_WARNINGS',
      summary: {
        migratedCount: 1,
        failedCount: 0,
        details: [{ message: 'CUSTOM_PROVIDER_V1_RECONFIGURATION_REQUIRED' }],
      },
    });
    const currentBytes = await fs.readFile(providerPath);
    expect(JSON.parse(currentBytes.toString('utf8'))).toEqual({
      version: 2,
      providers: [{
        id: 'provider_alpha_uuid',
        name: 'Alpha Cloud',
        providerType: 'OPENAI_COMPATIBLE',
        baseUrl: 'https://alpha.synthetic.invalid/v1',
      }],
    });
    expect(currentBytes.includes(Buffer.from('synthetic-inline-secret-canary'))).toBe(false);
    expect(JSON.stringify(result)).not.toContain('synthetic-inline-secret-canary');
    expect(secretRuntime.requireService).not.toHaveBeenCalled();
    expect(await fs.readdir(path.dirname(providerPath))).toEqual(['custom-llm-providers.json']);
    if (process.platform !== 'win32') {
      expect((await fs.stat(providerPath)).mode & 0o777).toBe(0o600);
    }
  });

  it('deletes invalid V1 data and returns a sanitized reconfiguration warning', async () => {
    await writeProviderFile({ ...validV1, providers: [{ ...validV1.providers[0], apiKey: '' }] });

    const result = await new CustomProviderV1AppDataMigration(directory).execute();

    expect(result).toMatchObject({
      status: 'SUCCEEDED_WITH_WARNINGS',
      summary: { skippedCount: 1, failedCount: 0 },
    });
    expect(JSON.stringify(result)).not.toContain('alpha.synthetic.invalid');
    await expect(fs.lstat(providerPath)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(secretRuntime.requireService).not.toHaveBeenCalled();
  });

  it('discards a failed stage and removes the original inline-secret file', async () => {
    await writeProviderFile(validV1);
    vi.spyOn(CustomProviderV1MigrationFile.prototype, 'syncStage')
      .mockRejectedValueOnce(new Error('synthetic stage failure'));

    const result = await new CustomProviderV1AppDataMigration(directory).execute();

    expect(result).toMatchObject({ status: 'SUCCEEDED_WITH_WARNINGS' });
    await expect(fs.lstat(providerPath)).rejects.toMatchObject({ code: 'ENOENT' });
    expect((await fs.readdir(path.dirname(providerPath))).some((name) => name.includes('v2-stage')))
      .toBe(false);
    expect(secretRuntime.requireService).not.toHaveBeenCalled();
  });

  it.skipIf(process.platform === 'win32')('removes an unsafe canonical symlink without reading its target', async () => {
    const target = path.join(directory, 'outside.json');
    await writeProviderFile(validV1);
    await fs.rename(providerPath, target);
    await fs.symlink(target, providerPath);

    await expect(new CustomProviderV1AppDataMigration(directory).execute()).resolves.toMatchObject({
      status: 'SUCCEEDED_WITH_WARNINGS',
    });
    await expect(fs.lstat(providerPath)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await fs.readFile(target, 'utf8')).toContain('synthetic-inline-secret-canary');
    expect(secretRuntime.requireService).not.toHaveBeenCalled();
  });
});
