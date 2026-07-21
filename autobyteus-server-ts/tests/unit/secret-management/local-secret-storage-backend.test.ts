import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SecretValue } from 'autobyteus-ts';
import { secretDefinitionId } from '../../../src/secret-management/domain/secret-binding.js';
import {
  LocalReadOnlySecretStorageBackend,
  LocalWritableSecretStorageBackend,
} from '../../../src/secret-management/backends/local/local-secret-storage-backend.js';

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
});
