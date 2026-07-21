import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { SecretValue } from 'autobyteus-ts';
import { secretDefinitionId } from '../../../src/secret-management/domain/secret-binding.js';
import {
  LocalReadOnlySecretStorageBackend,
  LocalWritableSecretStorageBackend,
} from '../../../src/secret-management/backends/local/local-secret-storage-backend.js';
import { LocalSecretStoreResetService } from '../../../src/secret-management/backends/local/local-secret-store-reset-service.js';

const roots = new Set<string>();
const createConfig = async (name: string) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), `autobyteus-secret-${name}-`));
  roots.add(root);
  return {
    kind: 'local-store' as const,
    databasePath: path.join(root, 'secret-store.db'),
    keyPath: path.join(root, 'secret-store.key'),
    accessMode: 'READ_WRITE' as const,
  };
};

afterEach(async () => {
  await Promise.all([...roots].map((root) => fs.rm(root, { recursive: true, force: true })));
  roots.clear();
});

describe('Local secret storage backend', () => {
  it('creates a private authenticated pair and reopens it read-only', async () => {
    const config = await createConfig('pair');
    const definition = secretDefinitionId('provider.openai.api-key');
    const backend = await LocalWritableSecretStorageBackend.open(config);
    expect(await backend.health()).toEqual({ state: 'READY' });
    expect(await backend.getStatus(definition)).toEqual({ storageState: 'MISSING' });
    await backend.save(definition, SecretValue.fromString('synthetic-local-secret'));
    expect(await backend.getStatus(definition)).toEqual({ storageState: 'CONFIGURED' });
    await backend.checkpoint();
    await backend.close();

    if (process.platform !== 'win32') {
      expect((await fs.stat(config.databasePath)).mode & 0o077).toBe(0);
      expect((await fs.stat(config.keyPath)).mode & 0o077).toBe(0);
    }

    const readOnly = await LocalReadOnlySecretStorageBackend.open({
      ...config,
      accessMode: 'READ_ONLY',
    });
    expect(await readOnly.health()).toEqual({ state: 'READY' });
    expect((await readOnly.resolve(definition)).revealToTrustedConsumer())
      .toBe('synthetic-local-secret');
    expect(readOnly.lifecycle.kind).toBe('EXTERNALLY_MANAGED');
    await readOnly.close();
  });

  it('rejects a swapped key even when the target Store has no records', async () => {
    const first = await createConfig('first');
    const second = await createConfig('second');
    const firstBackend = await LocalWritableSecretStorageBackend.open(first);
    const secondBackend = await LocalWritableSecretStorageBackend.open(second);
    await firstBackend.close();
    await secondBackend.close();

    await fs.copyFile(second.keyPath, first.keyPath);
    const reopened = await LocalReadOnlySecretStorageBackend.open({
      ...first,
      accessMode: 'READ_ONLY',
    });
    expect(await reopened.health()).toEqual({
      state: 'CORRUPT',
      instructionCode: 'SECRET_BACKEND_CORRUPT',
    });
    await reopened.close();
  });

  it('does not create a missing Store in read-only mode', async () => {
    const config = await createConfig('missing');
    const backend = await LocalReadOnlySecretStorageBackend.open({
      ...config,
      accessMode: 'READ_ONLY',
    });
    expect(await backend.health()).toEqual({
      state: 'UNAVAILABLE',
      instructionCode: 'SECRET_BACKEND_UNAVAILABLE',
    });
    await expect(fs.stat(config.databasePath)).rejects.toMatchObject({ code: 'ENOENT' });
    await backend.close();
  });

  it('atomically replaces, idempotently removes, and preserves status across restart', async () => {
    const config = await createConfig('lifecycle');
    const definition = secretDefinitionId('provider.openai.api-key');
    const backend = await LocalWritableSecretStorageBackend.open(config);
    await backend.save(definition, SecretValue.fromString('synthetic-first-generation'));
    await backend.save(definition, SecretValue.fromString('synthetic-second-generation'));
    expect((await backend.resolve(definition)).revealToTrustedConsumer())
      .toBe('synthetic-second-generation');
    await backend.remove(definition);
    await backend.remove(definition);
    expect(await backend.getStatus(definition)).toEqual({ storageState: 'MISSING' });
    await backend.checkpoint();
    await backend.close();

    const reopened = await LocalWritableSecretStorageBackend.open(config);
    expect(await reopened.health()).toEqual({ state: 'READY' });
    expect(await reopened.getStatus(definition)).toEqual({ storageState: 'MISSING' });
    await reopened.close();
  });

  it('reports a partial pair as corrupt without replacing the surviving file', async () => {
    const config = await createConfig('partial-pair');
    const backend = await LocalWritableSecretStorageBackend.open(config);
    await backend.close();
    const survivingKey = await fs.readFile(config.keyPath);
    await fs.rm(config.databasePath);

    const reopened = await LocalWritableSecretStorageBackend.open(config);
    expect(await reopened.health()).toEqual({
      state: 'CORRUPT',
      instructionCode: 'SECRET_BACKEND_CORRUPT',
    });
    expect(await fs.readFile(config.keyPath)).toEqual(survivingKey);
    await expect(fs.stat(config.databasePath)).rejects.toMatchObject({ code: 'ENOENT' });
    await reopened.close();
  });

  it('reports tampered pair verifier data as corrupt', async () => {
    const config = await createConfig('tampered-verifier');
    const backend = await LocalWritableSecretStorageBackend.open(config);
    await backend.close();
    const database = new DatabaseSync(config.databasePath);
    database.prepare('UPDATE store_metadata SET pair_verifier_tag = ? WHERE singleton_id = 1')
      .run(Buffer.alloc(16, 0x7f));
    database.close();

    const reopened = await LocalReadOnlySecretStorageBackend.open({ ...config, accessMode: 'READ_ONLY' });
    expect(await reopened.health()).toEqual({
      state: 'CORRUPT',
      instructionCode: 'SECRET_BACKEND_CORRUPT',
    });
    await reopened.close();
  });

  it('reports unsupported Store format as incompatible without rewriting metadata', async () => {
    const config = await createConfig('incompatible');
    const backend = await LocalWritableSecretStorageBackend.open(config);
    await backend.close();
    const database = new DatabaseSync(config.databasePath);
    database.prepare('UPDATE store_metadata SET schema_version = 999 WHERE singleton_id = 1').run();
    database.close();

    const reopened = await LocalReadOnlySecretStorageBackend.open({ ...config, accessMode: 'READ_ONLY' });
    expect(await reopened.health()).toEqual({
      state: 'INCOMPATIBLE',
      instructionCode: 'SECRET_BACKEND_INCOMPATIBLE',
    });
    const verificationDatabase = new DatabaseSync(config.databasePath, { readOnly: true });
    const metadata = verificationDatabase
      .prepare('SELECT schema_version FROM store_metadata WHERE singleton_id = 1')
      .get() as { schema_version: number };
    expect(metadata.schema_version).toBe(999);
    verificationDatabase.close();
    await reopened.close();
  });

  it('transitions to corrupt after authenticated record tampering', async () => {
    const config = await createConfig('tampered-record');
    const definition = secretDefinitionId('provider.openai.api-key');
    const backend = await LocalWritableSecretStorageBackend.open(config);
    await backend.save(definition, SecretValue.fromString('synthetic-record-value'));
    await backend.checkpoint();
    await backend.close();
    const database = new DatabaseSync(config.databasePath);
    database.prepare('UPDATE secret_records SET ciphertext = ? WHERE definition_id = ?')
      .run(Buffer.from('tampered'), String(definition));
    database.close();

    const reopened = await LocalReadOnlySecretStorageBackend.open({ ...config, accessMode: 'READ_ONLY' });
    expect(await reopened.health()).toEqual({ state: 'READY' });
    await expect(reopened.resolve(definition)).rejects.toMatchObject({ code: 'CORRUPT_STORED_VALUE' });
    expect(await reopened.health()).toEqual({
      state: 'CORRUPT',
      instructionCode: 'SECRET_BACKEND_CORRUPT',
    });
    await reopened.close();
  });

  it('projects creation-lock contention as LOCKED', async () => {
    const config = await createConfig('locked');
    await fs.writeFile(`${config.databasePath}.create.lock`, 'owned-test-lock', { mode: 0o600 });
    const backend = await LocalWritableSecretStorageBackend.open(config);
    expect(await backend.health()).toEqual({
      state: 'LOCKED',
      instructionCode: 'SECRET_BACKEND_LOCKED',
    });
    await expect(fs.stat(config.databasePath)).rejects.toMatchObject({ code: 'ENOENT' });
    await backend.close();
  });

  it('supports concurrent local readers/writers and current-value reopen', async () => {
    const config = await createConfig('contention');
    const firstDefinition = secretDefinitionId('provider.openai.api-key');
    const secondDefinition = secretDefinitionId('provider.anthropic.api-key');
    const first = await LocalWritableSecretStorageBackend.open(config);
    const second = await LocalWritableSecretStorageBackend.open(config);
    await Promise.all([
      first.save(firstDefinition, SecretValue.fromString('synthetic-openai')),
      second.save(secondDefinition, SecretValue.fromString('synthetic-anthropic')),
    ]);
    await first.checkpoint();
    await first.close();
    await second.close();

    const reopened = await LocalReadOnlySecretStorageBackend.open({ ...config, accessMode: 'READ_ONLY' });
    expect(await reopened.getStatus(firstDefinition)).toEqual({ storageState: 'CONFIGURED' });
    expect(await reopened.getStatus(secondDefinition)).toEqual({ storageState: 'CONFIGURED' });
    await reopened.close();
  });

  it('requires exact reset confirmation and deletes only the selected pair', async () => {
    const config = await createConfig('reset');
    const other = await createConfig('reset-other');
    const backend = await LocalWritableSecretStorageBackend.open(config);
    const otherBackend = await LocalWritableSecretStorageBackend.open(other);
    await otherBackend.close();
    const reset = new LocalSecretStoreResetService(config, backend);
    await expect(reset.resetExact({
      databasePath: other.databasePath,
      keyPath: other.keyPath,
    })).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await reset.resetExact({ databasePath: config.databasePath, keyPath: config.keyPath });
    await expect(fs.stat(config.databasePath)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(config.keyPath)).rejects.toMatchObject({ code: 'ENOENT' });
    expect((await fs.stat(other.databasePath)).isFile()).toBe(true);
    expect((await fs.stat(other.keyPath)).isFile()).toBe(true);
  });
});
