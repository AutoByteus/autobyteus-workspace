import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { PrismaClient } from '@prisma/client';
import { SecretValue } from 'autobyteus-ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppDataMigrationRegistry } from '../../../src/app-data-migrations/app-data-migration-registry.js';
import {
  CUSTOM_PROVIDER_V1_APP_DATA_MIGRATION_ID,
  CustomProviderV1AppDataMigration,
} from '../../../src/app-data-migrations/migrations/custom-provider-v1-app-data-migration.js';
import { ApplicationDatabaseLocation } from '../../../src/config/application-database-location.js';
import { SecretVaultBootstrap } from '../../../src/secret-management/bootstrap/secret-vault-bootstrap.js';
import {
  customProviderSecretId,
} from '../../../src/secret-management/domain/secret-id.js';
import { SecretVaultPrismaRepository } from '../../../src/secret-management/persistence/secret-vault-prisma-repository.js';
import { SecretManagementService } from '../../../src/secret-management/services/secret-management-service.js';

const TABLES = `
  CREATE TABLE secret_entries (
    secret_id TEXT NOT NULL PRIMARY KEY,
    nonce BLOB NOT NULL CHECK (length(nonce) = 12),
    ciphertext BLOB NOT NULL,
    authentication_tag BLOB NOT NULL CHECK (length(authentication_tag) = 16)
  );
  CREATE TABLE secret_encryption_metadata (
    singleton_id INTEGER NOT NULL PRIMARY KEY CHECK (singleton_id = 1),
    encryption_domain_id BLOB NOT NULL UNIQUE CHECK (length(encryption_domain_id) = 16),
    encryption_format_version INTEGER NOT NULL,
    verifier_nonce BLOB NOT NULL CHECK (length(verifier_nonce) = 12),
    verifier_ciphertext BLOB NOT NULL,
    verifier_authentication_tag BLOB NOT NULL CHECK (length(verifier_authentication_tag) = 16)
  );
`;

const v1File = (providers = [{
  id: 'provider_alpha',
  name: 'Alpha',
  providerType: 'OPENAI_COMPATIBLE',
  baseUrl: 'https://alpha.synthetic.invalid/v1',
  apiKey: 'synthetic-alpha-canary',
}]) => ({
  version: 1,
  providers,
});

describe('CustomProviderV1AppDataMigration', () => {
  let directory: string;
  let providerDirectory: string;
  let providerPath: string;
  let prisma: PrismaClient;
  let service: SecretManagementService;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'custom-provider-v1-migration-'));
    if (process.platform !== 'win32') await fs.chmod(directory, 0o700);
    providerDirectory = path.join(directory, 'llm');
    providerPath = path.join(providerDirectory, 'custom-llm-providers.json');
    const location = ApplicationDatabaseLocation.fromConfiguredFileUrl(
      'file:application.db',
      directory,
    );
    const database = new DatabaseSync(location.databasePath);
    database.exec(TABLES);
    database.close();
    prisma = new PrismaClient({ datasources: { db: { url: location.databaseUrl } } });
    const repository = new SecretVaultPrismaRepository(prisma);
    const bootstrap = await new SecretVaultBootstrap(location, repository).initializeOrVerify();
    service = new SecretManagementService(
      repository,
      bootstrap.rootKey,
      bootstrap.metadata,
      bootstrap.health,
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    service.close();
    await prisma.$disconnect();
    await fs.rm(directory, { recursive: true, force: true });
  });

  const writeV1 = async (value = v1File()): Promise<Buffer> => {
    await fs.mkdir(providerDirectory, { recursive: true });
    const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
    await fs.writeFile(providerPath, bytes);
    return bytes;
  };

  const migration = () => new CustomProviderV1AppDataMigration(directory, () => service);

  it('is registered as the first required startup app-data migration', () => {
    const definitions = new AppDataMigrationRegistry().listDefinitions();
    expect(definitions[0]).toBeInstanceOf(CustomProviderV1AppDataMigration);
    expect(definitions[0]).toMatchObject({
      id: CUSTOM_PROVIDER_V1_APP_DATA_MIGRATION_ID,
      requiredOnStartup: true,
    });
  });

  it('treats missing and current v2 files as idempotent no-ops without vault access', async () => {
    const getSecretOwner = vi.fn(() => service);
    await expect(new CustomProviderV1AppDataMigration(
      directory,
      getSecretOwner,
    ).execute()).resolves.toMatchObject({
      status: 'SUCCEEDED',
      summary: { migratedCount: 0, failedCount: 0 },
    });

    await fs.mkdir(providerDirectory, { recursive: true });
    const current = Buffer.from('{"version":2,"providers":[]}\n');
    await fs.writeFile(providerPath, current);
    await expect(new CustomProviderV1AppDataMigration(
      directory,
      getSecretOwner,
    ).execute()).resolves.toMatchObject({
      status: 'SUCCEEDED',
      summary: { migratedCount: 0, failedCount: 0 },
    });
    expect(await fs.readFile(providerPath)).toEqual(current);
    expect(getSecretOwner).not.toHaveBeenCalled();
  });

  it('migrates every valid provider atomically and publishes owner-only secret-free v2', async () => {
    await writeV1(v1File([
      {
        id: 'provider_alpha',
        name: 'Alpha',
        providerType: 'OPENAI_COMPATIBLE',
        baseUrl: 'https://alpha.synthetic.invalid/v1',
        apiKey: 'synthetic-alpha-canary',
      },
      {
        id: 'provider_beta',
        name: 'Beta',
        providerType: 'OPENAI_COMPATIBLE',
        baseUrl: 'https://beta.synthetic.invalid/v1',
        apiKey: 'synthetic-beta-canary',
      },
    ]));

    const result = await migration().execute();
    expect(result).toMatchObject({
      status: 'SUCCEEDED',
      summary: { migratedCount: 1, failedCount: 0 },
    });
    expect(JSON.stringify(result)).not.toContain('synthetic-alpha-canary');
    expect(JSON.stringify(result)).not.toContain('synthetic-beta-canary');

    const currentBytes = await fs.readFile(providerPath);
    expect(JSON.parse(currentBytes.toString('utf8'))).toEqual({
      version: 2,
      providers: [
        {
          id: 'provider_alpha',
          name: 'Alpha',
          providerType: 'OPENAI_COMPATIBLE',
          baseUrl: 'https://alpha.synthetic.invalid/v1',
        },
        {
          id: 'provider_beta',
          name: 'Beta',
          providerType: 'OPENAI_COMPATIBLE',
          baseUrl: 'https://beta.synthetic.invalid/v1',
        },
      ],
    });
    expect(currentBytes.includes(Buffer.from('synthetic-alpha-canary'))).toBe(false);
    expect(currentBytes.includes(Buffer.from('synthetic-beta-canary'))).toBe(false);
    if (process.platform !== 'win32') {
      expect((await fs.stat(providerPath)).mode & 0o777).toBe(0o600);
    }
    await expect(service.resolveForUse({
      kind: 'llm',
      providerId: 'provider_alpha',
      credentialSlot: 'apiKey',
    }).then((value) => value.revealToTrustedConsumer())).resolves.toBe(
      'synthetic-alpha-canary',
    );
    await expect(service.resolveForUse({
      kind: 'llm',
      providerId: 'provider_beta',
      credentialSlot: 'apiKey',
    }).then((value) => value.revealToTrustedConsumer())).resolves.toBe(
      'synthetic-beta-canary',
    );
    expect((await fs.readdir(providerDirectory)).sort()).toEqual([
      'custom-llm-providers.json',
    ]);
  });

  it('serializes live migration owners so only one batch can publish', async () => {
    const source = await writeV1();
    const originalCreate = service.createMissingBatchForCustomProviderMigration.bind(service);
    let entered!: () => void;
    let release!: () => void;
    const enteredPromise = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const releasePromise = new Promise<void>((resolve) => {
      release = resolve;
    });
    const createBatch = vi.spyOn(
      service,
      'createMissingBatchForCustomProviderMigration',
    ).mockImplementation(async (entries) => {
      entered();
      await releasePromise;
      return originalCreate(entries);
    });

    const first = migration().execute();
    await enteredPromise;
    const second = migration().execute();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(createBatch).toHaveBeenCalledTimes(1);
    expect(await fs.readFile(providerPath)).toEqual(source);
    release();

    await expect(first).resolves.toMatchObject({ status: 'SUCCEEDED' });
    await expect(second).resolves.toMatchObject({
      status: 'SUCCEEDED',
      summary: { migratedCount: 0 },
    });
    expect(createBatch).toHaveBeenCalledTimes(1);
  });

  it('recovers a fixed-path lock owned by a terminated process', async () => {
    await writeV1();
    await fs.writeFile(`${providerPath}.lock`, '99999999\n', { mode: 0o600 });

    await expect(migration().execute()).resolves.toMatchObject({
      status: 'SUCCEEDED',
      summary: { migratedCount: 1 },
    });
    await expect(fs.lstat(`${providerPath}.lock`)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('deletes invalid or duplicate v1 without touching the vault', async () => {
    await writeV1(v1File([
      {
        id: 'provider_duplicate',
        name: 'Duplicate',
        providerType: 'OPENAI_COMPATIBLE',
        baseUrl: 'https://first.synthetic.invalid/v1',
        apiKey: 'synthetic-first-canary',
      },
      {
        id: 'provider_duplicate',
        name: 'Other',
        providerType: 'OPENAI_COMPATIBLE',
        baseUrl: 'https://second.synthetic.invalid/v1',
        apiKey: 'synthetic-second-canary',
      },
    ]));
    const createBatch = vi.spyOn(service, 'createMissingBatchForCustomProviderMigration');

    await expect(migration().execute()).resolves.toMatchObject({
      status: 'SUCCEEDED_WITH_WARNINGS',
      summary: { migratedCount: 0, skippedCount: 1, failedCount: 0 },
    });

    expect(createBatch).not.toHaveBeenCalled();
    await expect(fs.lstat(providerPath)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(service.getStatusForConsumer({
      kind: 'llm',
      providerId: 'provider_duplicate',
      credentialSlot: 'apiKey',
    })).resolves.toBe('MISSING');
  });

  it.skipIf(process.platform === 'win32')(
    'removes an unsafe canonical symlink without reading or changing its target',
    async () => {
      await fs.mkdir(providerDirectory, { recursive: true });
      const externalPath = path.join(directory, 'external-provider-data.json');
      const external = Buffer.from(JSON.stringify(v1File()));
      await fs.writeFile(externalPath, external);
      await fs.symlink(externalPath, providerPath);
      const createBatch = vi.spyOn(service, 'createMissingBatchForCustomProviderMigration');

      await expect(migration().execute()).resolves.toMatchObject({
        status: 'SUCCEEDED_WITH_WARNINGS',
      });

      expect(createBatch).not.toHaveBeenCalled();
      await expect(fs.lstat(providerPath)).rejects.toMatchObject({ code: 'ENOENT' });
      expect(await fs.readFile(externalPath)).toEqual(external);
    },
  );

  it('treats an interrupted committed batch as a collision and never deletes it', async () => {
    const source = await writeV1();
    await service.createMissingBatchForCustomProviderMigration([{
      secretId: customProviderSecretId('provider_alpha'),
      input: SecretValue.fromString('synthetic-interrupted-canary'),
    }]);

    await expect(migration().execute()).resolves.toMatchObject({
      status: 'SUCCEEDED_WITH_WARNINGS',
      summary: { failedCount: 0 },
    });

    await expect(fs.lstat(providerPath)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(service.resolveForUse({
      kind: 'llm',
      providerId: 'provider_alpha',
      credentialSlot: 'apiKey',
    }).then((value) => value.revealToTrustedConsumer())).resolves.toBe(
      'synthetic-interrupted-canary',
    );
    expect(source.includes(Buffer.from('synthetic-alpha-canary'))).toBe(true);
  });

  it('compensates the exact new batch when atomic v2 publication fails', async () => {
    await writeV1();
    const originalRename = fs.rename.bind(fs);
    vi.spyOn(fs, 'rename').mockImplementation(async (from, to) => {
      if (String(from).endsWith('.v2-stage') && String(to) === providerPath) {
        throw Object.assign(new Error('synthetic publish rejection'), { code: 'EIO' });
      }
      return originalRename(from, to);
    });

    await expect(migration().execute()).resolves.toMatchObject({
      status: 'SUCCEEDED_WITH_WARNINGS',
      summary: { failedCount: 0 },
    });

    await expect(fs.lstat(providerPath)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(service.getStatusForConsumer({
      kind: 'llm',
      providerId: 'provider_alpha',
      credentialSlot: 'apiKey',
    })).resolves.toBe('MISSING');
    expect(await fs.readdir(providerDirectory)).toEqual([]);
  });

  it('deletes v1 after stage failure without calling the database owner', async () => {
    await writeV1();
    const originalOpen = fs.open.bind(fs);
    vi.spyOn(fs, 'open').mockImplementation(async (file, flags, mode) => {
      if (String(file).endsWith('.v2-stage')) {
        throw Object.assign(new Error('synthetic stage rejection'), { code: 'EIO' });
      }
      return originalOpen(file, flags, mode);
    });
    const createBatch = vi.spyOn(service, 'createMissingBatchForCustomProviderMigration');

    await expect(migration().execute()).resolves.toMatchObject({
      status: 'SUCCEEDED_WITH_WARNINGS',
      summary: { failedCount: 0 },
    });
    expect(createBatch).not.toHaveBeenCalled();
    await expect(fs.lstat(providerPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rolls back the entire vault batch and deletes v1 after a database write failure', async () => {
    await writeV1(v1File([
      {
        id: 'provider_alpha',
        name: 'Alpha',
        providerType: 'OPENAI_COMPATIBLE',
        baseUrl: 'https://alpha.synthetic.invalid/v1',
        apiKey: 'synthetic-alpha-canary',
      },
      {
        id: 'provider_beta',
        name: 'Beta',
        providerType: 'OPENAI_COMPATIBLE',
        baseUrl: 'https://beta.synthetic.invalid/v1',
        apiKey: 'synthetic-beta-canary',
      },
    ]));
    const database = new DatabaseSync(
      ApplicationDatabaseLocation.fromConfiguredFileUrl(
        'file:application.db',
        directory,
      ).databasePath,
    );
    database.exec(`
      CREATE TRIGGER reject_custom_beta_migration
      BEFORE INSERT ON secret_entries
      WHEN NEW.secret_id = 'provider.openai-compatible.provider_beta.api-key'
      BEGIN
        SELECT RAISE(ABORT, 'synthetic rejected migration write');
      END;
    `);
    database.close();

    await expect(migration().execute()).resolves.toMatchObject({
      status: 'SUCCEEDED_WITH_WARNINGS',
      summary: { migratedCount: 0, skippedCount: 1, failedCount: 0 },
    });

    await expect(fs.lstat(providerPath)).rejects.toMatchObject({ code: 'ENOENT' });
    for (const providerId of ['provider_alpha', 'provider_beta']) {
      await expect(service.getStatusForConsumer({
        kind: 'llm',
        providerId,
        credentialSlot: 'apiKey',
      })).resolves.toBe('MISSING');
    }
  });

  it('leaves v1 byte-identical and reports FAILED when reset deletion is unavailable', async () => {
    const source = await writeV1({ version: 1, providers: 'invalid' } as never);
    const originalUnlink = fs.unlink.bind(fs);
    vi.spyOn(fs, 'unlink').mockImplementation(async (file) => {
      if (String(file) === providerPath) {
        throw Object.assign(new Error('synthetic deletion rejection'), { code: 'EACCES' });
      }
      return originalUnlink(file);
    });

    const result = await migration().execute();

    expect(result).toMatchObject({
      status: 'FAILED',
      errorMessage: 'CUSTOM_PROVIDER_V1_RESET_UNAVAILABLE',
      summary: { failedCount: 1 },
    });
    expect(JSON.stringify(result)).not.toContain('synthetic-alpha-canary');
    expect(await fs.readFile(providerPath)).toEqual(source);
    expect((await fs.readdir(providerDirectory)).sort()).toEqual([
      'custom-llm-providers.json',
    ]);
  });
});
