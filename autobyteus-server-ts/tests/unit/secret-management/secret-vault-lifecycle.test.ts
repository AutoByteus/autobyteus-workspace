import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { PrismaClient } from '@prisma/client';
import { SecretValue } from 'autobyteus-ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationDatabaseLocation } from '../../../src/config/application-database-location.js';
import { SecretVaultBootstrap } from '../../../src/secret-management/bootstrap/secret-vault-bootstrap.js';
import {
  customProviderSecretId,
  secretId,
} from '../../../src/secret-management/domain/secret-id.js';
import { SecretVaultPrismaRepository } from '../../../src/secret-management/persistence/secret-vault-prisma-repository.js';
import { SecretRootKeyFile } from '../../../src/secret-management/root-key/secret-root-key-file.js';
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

type FileSnapshot = {
  mode: number;
  uid: number;
  gid: number;
  size: number;
  mtimeMs: number;
  ctimeMs: number;
  bytes: Buffer;
} | null;

const snapshotFile = async (filePath: string): Promise<FileSnapshot> => {
  try {
    const stat = await fs.lstat(filePath);
    return {
      mode: stat.mode,
      uid: stat.uid,
      gid: stat.gid,
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      ctimeMs: stat.ctimeMs,
      bytes: await fs.readFile(filePath),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
};

const snapshotDatabaseFamily = async (databasePath: string) => Object.fromEntries(
  await Promise.all(['', '-wal', '-shm', '-journal'].map(async (suffix) => [
    suffix || 'database',
    await snapshotFile(`${databasePath}${suffix}`),
  ])),
);

describe('one-database secret vault lifecycle', () => {
  let directory: string;
  let databasePath: string;
  let prisma: PrismaClient;
  let service: SecretManagementService;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'secret-vault-lifecycle-'));
    if (process.platform !== 'win32') await fs.chmod(directory, 0o700);
    const location = ApplicationDatabaseLocation.fromConfiguredFileUrl('file:application.db', directory);
    databasePath = location.databasePath;
    const database = new DatabaseSync(databasePath);
    database.exec(TABLES);
    database.close();

    prisma = new PrismaClient({ datasources: { db: { url: location.databaseUrl } } });
    const repository = new SecretVaultPrismaRepository(prisma);
    const bootstrap = await new SecretVaultBootstrap(location, repository).initializeOrVerify();
    expect(bootstrap.health).toEqual({ state: 'READY' });
    service = new SecretManagementService(
      repository,
      bootstrap.rootKey,
      bootstrap.metadata,
      bootstrap.health,
    );
  });

  afterEach(async () => {
    service?.close();
    await prisma?.$disconnect();
    await fs.rm(directory, { recursive: true, force: true });
  });

  it('saves, reports status, resolves only for use, and removes idempotently', async () => {
    const consumer = { kind: 'llm', providerId: 'OPENAI', credentialSlot: 'apiKey' } as const;
    await expect(service.getStatusForConsumer(consumer)).resolves.toBe('MISSING');
    await service.saveForConsumer({
      consumer,
      value: SecretValue.fromString('synthetic-openai'),
    });
    await expect(service.getStatusForConsumer(consumer)).resolves.toBe('CONFIGURED');
    await expect(service.resolveForUse(consumer).then((value) =>
      value.revealToTrustedConsumer())).resolves.toBe('synthetic-openai');
    await service.removeForConsumer(consumer);
    await service.removeForConsumer(consumer);
    await expect(service.getStatusForConsumer(consumer)).resolves.toBe('MISSING');
  });

  it('applies no-overwrite and explicit-overwrite decisions inside one transaction', async () => {
    const openai = { kind: 'llm', providerId: 'OPENAI', credentialSlot: 'apiKey' } as const;
    const serper = { kind: 'search', providerId: 'serper', credentialSlot: 'apiKey' } as const;
    await service.saveForConsumer({
      consumer: openai,
      value: SecretValue.fromString('synthetic-original'),
    });

    await expect(service.saveBatch([
      {
        secretId: secretId('provider.openai.api-key'),
        input: SecretValue.fromString('synthetic-skipped'),
      },
      {
        secretId: secretId('search.serper.api-key'),
        input: SecretValue.fromString('synthetic-serper'),
      },
    ], false)).resolves.toEqual({
      configuredCount: 1,
      skippedCount: 1,
      replacedCount: 0,
    });
    await expect(service.resolveForUse(openai).then((value) =>
      value.revealToTrustedConsumer())).resolves.toBe('synthetic-original');
    await expect(service.resolveForUse(serper).then((value) =>
      value.revealToTrustedConsumer())).resolves.toBe('synthetic-serper');

    await expect(service.saveBatch([
      {
        secretId: secretId('provider.openai.api-key'),
        input: SecretValue.fromString('synthetic-replacement'),
      },
    ], true)).resolves.toEqual({
      configuredCount: 0,
      skippedCount: 0,
      replacedCount: 1,
    });
    await expect(service.resolveForUse(openai).then((value) =>
      value.revealToTrustedConsumer())).resolves.toBe('synthetic-replacement');
  });

  it('rolls back the full batch on a later write failure', async () => {
    const database = new DatabaseSync(databasePath);
    database.exec(`
      CREATE TRIGGER reject_serper
      BEFORE INSERT ON secret_entries
      WHEN NEW.secret_id = 'search.serper.api-key'
      BEGIN
        SELECT RAISE(ABORT, 'synthetic rejected write');
      END;
    `);
    database.close();

    await expect(service.saveBatch([
      {
        secretId: secretId('provider.openai.api-key'),
        input: SecretValue.fromString('synthetic-openai'),
      },
      {
        secretId: secretId('search.serper.api-key'),
        input: SecretValue.fromString('synthetic-serper'),
      },
    ], false)).rejects.toThrow();
    await expect(service.getStatusForConsumer({
      kind: 'llm', providerId: 'OPENAI', credentialSlot: 'apiKey',
    })).resolves.toBe('MISSING');
  });

  it('rejects an unauthorized raw batch SecretId', async () => {
    await expect(service.saveBatch([{
      secretId: secretId('arbitrary.unowned.secret'),
      input: SecretValue.fromString('synthetic-value'),
    }], false)).rejects.toMatchObject({
      code: 'ACCESS_DENIED',
      instructionCode: 'SECRET_CONSUMER_NOT_AUTHORIZED',
    });
  });

  it('creates migration credentials only when every target is missing', async () => {
    const existing = {
      kind: 'llm',
      providerId: 'provider_existing',
      credentialSlot: 'apiKey',
    } as const;
    await service.saveForConsumer({
      consumer: existing,
      value: SecretValue.fromString('synthetic-existing'),
    });

    await expect(service.createMissingBatchForCustomProviderMigration([
      {
        secretId: customProviderSecretId('provider_existing'),
        input: SecretValue.fromString('synthetic-must-not-replace'),
      },
      {
        secretId: customProviderSecretId('provider_new'),
        input: SecretValue.fromString('synthetic-must-not-create'),
      },
    ])).rejects.toThrow('CUSTOM_PROVIDER_MIGRATION_TARGET_NOT_MISSING');

    await expect(service.resolveForUse(existing).then((value) =>
      value.revealToTrustedConsumer())).resolves.toBe('synthetic-existing');
    await expect(service.getStatusForConsumer({
      kind: 'llm',
      providerId: 'provider_new',
      credentialSlot: 'apiKey',
    })).resolves.toBe('MISSING');
  });

  it('keeps the migration batch restricted to custom-provider secret IDs', async () => {
    await expect(service.createMissingBatchForCustomProviderMigration([{
      secretId: secretId('provider.openai.api-key'),
      input: SecretValue.fromString('synthetic-not-custom'),
    }])).rejects.toMatchObject({
      code: 'ACCESS_DENIED',
      instructionCode: 'SECRET_CONSUMER_NOT_AUTHORIZED',
    });
  });

  it('rolls back every create-only migration row when one insert fails', async () => {
    const database = new DatabaseSync(databasePath);
    database.exec(`
      CREATE TRIGGER reject_custom_beta
      BEFORE INSERT ON secret_entries
      WHEN NEW.secret_id = 'provider.openai-compatible.provider_beta.api-key'
      BEGIN
        SELECT RAISE(ABORT, 'synthetic rejected migration write');
      END;
    `);
    database.close();

    await expect(service.createMissingBatchForCustomProviderMigration([
      {
        secretId: customProviderSecretId('provider_alpha'),
        input: SecretValue.fromString('synthetic-alpha'),
      },
      {
        secretId: customProviderSecretId('provider_beta'),
        input: SecretValue.fromString('synthetic-beta'),
      },
    ])).rejects.toThrow();

    for (const providerId of ['provider_alpha', 'provider_beta']) {
      await expect(service.getStatusForConsumer({
        kind: 'llm',
        providerId,
        credentialSlot: 'apiKey',
      })).resolves.toBe('MISSING');
    }
  });

  it('compensates only unchanged rows from the same opaque migration receipt', async () => {
    const receipt = await service.createMissingBatchForCustomProviderMigration([
      {
        secretId: customProviderSecretId('provider_changed'),
        input: SecretValue.fromString('synthetic-original-changed'),
      },
      {
        secretId: customProviderSecretId('provider_unchanged'),
        input: SecretValue.fromString('synthetic-original-unchanged'),
      },
    ]);
    const changed = {
      kind: 'llm',
      providerId: 'provider_changed',
      credentialSlot: 'apiKey',
    } as const;
    await service.saveForConsumer({
      consumer: changed,
      value: SecretValue.fromString('synthetic-current'),
    });

    await service.compensateUnpublishedCustomProviderBatch(receipt);

    await expect(service.resolveForUse(changed).then((value) =>
      value.revealToTrustedConsumer())).resolves.toBe('synthetic-current');
    await expect(service.getStatusForConsumer({
      kind: 'llm',
      providerId: 'provider_unchanged',
      credentialSlot: 'apiKey',
    })).resolves.toBe('MISSING');
  });

  it.skipIf(process.platform === 'win32')(
    'fails closed before repository access when the database permissions are unsafe',
    async () => {
      await fs.chmod(databasePath, 0o660);
      const repository = new SecretVaultPrismaRepository(prisma);
      await expect(
        new SecretVaultBootstrap(
          ApplicationDatabaseLocation.fromConfiguredFileUrl('file:application.db', directory),
          repository,
        ).initializeOrVerify(),
      ).resolves.toMatchObject({
        health: {
          state: 'UNAVAILABLE',
          instructionCode: 'SECRET_VAULT_UNAVAILABLE',
        },
        rootKey: null,
        metadata: null,
      });
      await fs.chmod(databasePath, 0o600);
    },
  );
});

describe('secret vault initialization interruption safety', () => {
  const createFixture = async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'secret-vault-initialization-'));
    if (process.platform !== 'win32') await fs.chmod(directory, 0o700);
    const location = ApplicationDatabaseLocation.fromConfiguredFileUrl('file:application.db', directory);
    const database = new DatabaseSync(location.databasePath);
    database.exec(TABLES);
    database.close();
    const prisma = new PrismaClient({ datasources: { db: { url: location.databaseUrl } } });
    return {
      directory,
      location,
      prisma,
      repository: new SecretVaultPrismaRepository(prisma),
    };
  };

  it('resumes key-only first initialization despite a terminated initializer sentinel', async () => {
    const fixture = await createFixture();
    try {
      const rootKeyFile = new SecretRootKeyFile(fixture.location);
      const interruptedKey = await rootKeyFile.createExclusive();
      const expectedKey = Buffer.from(interruptedKey);
      interruptedKey.fill(0);
      await fs.writeFile(`${fixture.location.rootKeyPath}.initialize.lock`, 'terminated-owner', {
        mode: 0o600,
      });

      const result = await new SecretVaultBootstrap(
        fixture.location,
        fixture.repository,
      ).initializeOrVerify();

      expect(result.health).toEqual({ state: 'READY' });
      expect(result.rootKey).not.toBeNull();
      expect(result.rootKey?.equals(expectedKey)).toBe(true);
      expect(await fixture.repository.countEntries()).toBe(0);
      expect(await fixture.repository.readMetadata()).not.toBeNull();
      expect(await fs.readFile(fixture.location.rootKeyPath)).toEqual(expectedKey);
      result.rootKey?.fill(0);
      expectedKey.fill(0);
    } finally {
      await fixture.prisma.$disconnect();
      await fs.rm(fixture.directory, { recursive: true, force: true });
    }
  });

  it('serializes live initializers and publishes one key/domain pair', async () => {
    const fixture = await createFixture();
    const secondPrisma = new PrismaClient({
      datasources: { db: { url: fixture.location.databaseUrl } },
    });
    let releaseFirst!: () => void;
    let firstCreated!: () => void;
    const firstCreatedPromise = new Promise<void>((resolve) => {
      firstCreated = resolve;
    });
    const releaseFirstPromise = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const firstDelegate = new SecretRootKeyFile(fixture.location);
    const secondDelegate = new SecretRootKeyFile(fixture.location);
    const firstRootKeyFile = {
      inspectExisting: () => firstDelegate.inspectExisting(),
      createExclusive: async () => {
        const key = await firstDelegate.createExclusive();
        firstCreated();
        await releaseFirstPromise;
        return key;
      },
    } as unknown as SecretRootKeyFile;
    const secondInspect = vi.fn(() => secondDelegate.inspectExisting());
    const secondRootKeyFile = {
      inspectExisting: secondInspect,
      createExclusive: () => secondDelegate.createExclusive(),
    } as unknown as SecretRootKeyFile;

    try {
      const firstPromise = new SecretVaultBootstrap(
        fixture.location,
        fixture.repository,
        firstRootKeyFile,
      ).initializeOrVerify();
      await firstCreatedPromise;
      const secondPromise = new SecretVaultBootstrap(
        fixture.location,
        new SecretVaultPrismaRepository(secondPrisma),
        secondRootKeyFile,
      ).initializeOrVerify();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(secondInspect).not.toHaveBeenCalled();
      releaseFirst();

      const [first, second] = await Promise.all([firstPromise, secondPromise]);
      expect(first.health).toEqual({ state: 'READY' });
      expect(second.health).toEqual({ state: 'READY' });
      expect(first.rootKey?.equals(second.rootKey!)).toBe(true);
      expect(first.metadata?.encryptionDomainId.equals(
        second.metadata!.encryptionDomainId,
      )).toBe(true);
      expect(await fixture.repository.readMetadata()).not.toBeNull();
      first.rootKey?.fill(0);
      second.rootKey?.fill(0);
    } finally {
      releaseFirst();
      await secondPrisma.$disconnect();
      await fixture.prisma.$disconnect();
      await fs.rm(fixture.directory, { recursive: true, force: true });
    }
  });

  it('does not regenerate a missing key for an established metadata domain', async () => {
    const fixture = await createFixture();
    try {
      const first = await new SecretVaultBootstrap(
        fixture.location,
        fixture.repository,
      ).initializeOrVerify();
      expect(first.health).toEqual({ state: 'READY' });
      first.rootKey?.fill(0);
      await fs.unlink(fixture.location.rootKeyPath);

      const restarted = await new SecretVaultBootstrap(
        fixture.location,
        fixture.repository,
      ).initializeOrVerify();

      expect(restarted).toMatchObject({
        health: {
          state: 'LOCKED',
          instructionCode: 'SECRET_VAULT_LOCKED',
        },
        rootKey: null,
        metadata: null,
      });
      await expect(fs.lstat(fixture.location.rootKeyPath)).rejects.toMatchObject({
        code: 'ENOENT',
      });
      expect(await fixture.repository.readMetadata()).not.toBeNull();
    } finally {
      await fixture.prisma.$disconnect();
      await fs.rm(fixture.directory, { recursive: true, force: true });
    }
  });

  it('verifies an established vault without rewriting the database, key, or sidecars', async () => {
    const fixture = await createFixture();
    const observer = new DatabaseSync(fixture.location.databasePath, { readOnly: true });
    try {
      const initialized = await new SecretVaultBootstrap(
        fixture.location,
        fixture.repository,
      ).initializeOrVerify();
      expect(initialized.health).toEqual({ state: 'READY' });
      initialized.rootKey?.fill(0);

      const metadataBefore = await fixture.repository.readMetadata();
      const keyBefore = await snapshotFile(fixture.location.rootKeyPath);
      const filesBefore = await snapshotDatabaseFamily(fixture.location.databasePath);
      const dataVersionBefore = observer.prepare('PRAGMA data_version').get() as {
        data_version: number;
      };

      const restarted = await new SecretVaultBootstrap(
        fixture.location,
        fixture.repository,
      ).initializeOrVerify();

      const dataVersionAfter = observer.prepare('PRAGMA data_version').get() as {
        data_version: number;
      };
      expect(restarted.health).toEqual({ state: 'READY' });
      expect(restarted.metadata).toEqual(metadataBefore);
      expect(await fixture.repository.readMetadata()).toEqual(metadataBefore);
      expect(await snapshotFile(fixture.location.rootKeyPath)).toEqual(keyBefore);
      expect(await snapshotDatabaseFamily(fixture.location.databasePath)).toEqual(filesBefore);
      expect(dataVersionAfter.data_version).toBe(dataVersionBefore.data_version);
      restarted.rootKey?.fill(0);
      keyBefore?.bytes.fill(0);
    } finally {
      observer.close();
      await fixture.prisma.$disconnect();
      await fs.rm(fixture.directory, { recursive: true, force: true });
    }
  });
});
