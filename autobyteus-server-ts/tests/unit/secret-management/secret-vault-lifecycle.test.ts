import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { PrismaClient } from '@prisma/client';
import { SecretValue } from 'autobyteus-ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveApplicationDatabaseLocation } from '../../../src/config/application-database-location.js';
import { SecretVaultBootstrap } from '../../../src/secret-management/bootstrap/secret-vault-bootstrap.js';
import { secretId } from '../../../src/secret-management/domain/secret-id.js';
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

describe('one-database secret vault lifecycle', () => {
  let directory: string;
  let databasePath: string;
  let prisma: PrismaClient;
  let service: SecretManagementService;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'secret-vault-lifecycle-'));
    if (process.platform !== 'win32') await fs.chmod(directory, 0o700);
    const location = resolveApplicationDatabaseLocation('file:application.db', directory);
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

  it.skipIf(process.platform === 'win32')(
    'fails closed before repository access when the database permissions are unsafe',
    async () => {
      await fs.chmod(databasePath, 0o660);
      const repository = new SecretVaultPrismaRepository(prisma);
      await expect(
        new SecretVaultBootstrap(
          resolveApplicationDatabaseLocation('file:application.db', directory),
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
