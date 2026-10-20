import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openVerifiedTestVault, type VerifiedTestVault } from '../../../../src/secrets/vault/open-test-vault.js';
import { readSecretEntry } from '../../../../src/secrets/vault/read-secret-entry.js';
import { secretId } from '../../../../src/secrets/vault/secret-id.js';
import { createSyntheticTestVault } from '../../../../../test-support/test-vault/synthetic-test-vault.js';

const SYNTHETIC = 'synthetic-read-secret-entry-value';
const DEEPSEEK = secretId('provider.deepseek.api-key');

describe('readSecretEntry error contract', () => {
  let root: string;
  let databasePath: string;
  let vault: VerifiedTestVault | null = null;

  const tamper = (sql: string): void => {
    const database = new DatabaseSync(databasePath);
    database.exec(sql);
    database.close();
  };

  beforeEach(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'read-secret-entry-')));
    databasePath = createSyntheticTestVault(path.join(root, 'vault'), { [DEEPSEEK]: SYNTHETIC }).databasePath;
  });

  afterEach(() => {
    vault?.close();
    vault = null;
    fs.rmSync(root, { recursive: true, force: true });
  });

  const read = async (id = DEEPSEEK) => {
    vault = await openVerifiedTestVault(path.join(root, 'vault'));
    return readSecretEntry(vault.store, vault.rootKey, vault.metadata, id);
  };

  it('decrypts a stored entry', async () => {
    await expect(read().then((value) => value.revealToTrustedConsumer())).resolves.toBe(SYNTHETIC);
  });

  it('reports an absent entry as NOT_FOUND / SECRET_NOT_FOUND', async () => {
    await expect(read(secretId('provider.openai.api-key')))
      .rejects.toMatchObject({ code: 'NOT_FOUND', instructionCode: 'SECRET_NOT_FOUND' });
  });

  it.each([
    ['a nonce of the wrong length', "UPDATE secret_entries SET nonce = X'00'"],
    ['a tag of the wrong length', "UPDATE secret_entries SET authentication_tag = X'00'"],
    ['a ciphertext that fails authentication', "UPDATE secret_entries SET ciphertext = X'00112233'"],
  ])('reports %s as CORRUPT_VAULT / SECRET_VAULT_CORRUPT', async (_label, sql) => {
    tamper(sql);
    await expect(read()).rejects.toMatchObject({ code: 'CORRUPT_VAULT', instructionCode: 'SECRET_VAULT_CORRUPT' });
  });
});
