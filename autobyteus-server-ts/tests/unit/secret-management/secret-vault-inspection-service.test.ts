import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveApplicationDatabaseLocation } from '../../../src/config/application-database-location.js';
import {
  createVaultVerifier,
  SECRET_VAULT_ENCRYPTION_FORMAT_VERSION,
} from '../../../src/secret-management/crypto/secret-vault-crypto.js';
import { secretId } from '../../../src/secret-management/domain/secret-id.js';
import { SecretVaultInspectionService } from '../../../src/secret-management/services/secret-vault-inspection-service.js';

const TABLES = `
  CREATE TABLE secret_entries (
    secret_id TEXT NOT NULL PRIMARY KEY,
    nonce BLOB NOT NULL,
    ciphertext BLOB NOT NULL,
    authentication_tag BLOB NOT NULL
  );
  CREATE TABLE secret_encryption_metadata (
    singleton_id INTEGER NOT NULL PRIMARY KEY,
    encryption_domain_id BLOB NOT NULL,
    encryption_format_version INTEGER NOT NULL,
    verifier_nonce BLOB NOT NULL,
    verifier_ciphertext BLOB NOT NULL,
    verifier_authentication_tag BLOB NOT NULL
  );
`;

type Snapshot = {
  files: string[];
  databaseBytes?: Buffer;
  databaseMode?: number;
  keyBytes?: Buffer;
  keyMode?: number;
};

describe('SecretVaultInspectionService', () => {
  let directory: string;
  let location: ReturnType<typeof resolveApplicationDatabaseLocation>;
  const ids = [secretId('provider.openai.api-key'), secretId('search.serper.api-key')];

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'secret-vault-inspection-'));
    if (process.platform !== 'win32') await fs.chmod(directory, 0o700);
    location = resolveApplicationDatabaseLocation('file:application.db', directory);
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  const snapshot = async (): Promise<Snapshot> => {
    const files = (await fs.readdir(directory)).sort();
    const result: Snapshot = { files };
    try {
      result.databaseBytes = await fs.readFile(location.databasePath);
      result.databaseMode = (await fs.stat(location.databasePath)).mode & 0o777;
    } catch {}
    try {
      result.keyBytes = await fs.readFile(location.rootKeyPath);
      result.keyMode = (await fs.stat(location.rootKeyPath)).mode & 0o777;
    } catch {}
    return result;
  };

  const createReadyVault = async (configuredIds: string[] = []): Promise<void> => {
    const rootKey = randomBytes(32);
    const domain = randomBytes(16);
    const verifier = createVaultVerifier(rootKey, domain);
    await fs.writeFile(location.rootKeyPath, rootKey, { mode: 0o600 });
    if (process.platform !== 'win32') await fs.chmod(location.rootKeyPath, 0o600);
    rootKey.fill(0);
    const database = new DatabaseSync(location.databasePath);
    try {
      database.exec(`${TABLES} PRAGMA journal_mode=DELETE;`);
      database.prepare(`
        INSERT INTO secret_encryption_metadata (
          singleton_id, encryption_domain_id, encryption_format_version,
          verifier_nonce, verifier_ciphertext, verifier_authentication_tag
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        1,
        domain,
        SECRET_VAULT_ENCRYPTION_FORMAT_VERSION,
        verifier.nonce,
        verifier.ciphertext,
        verifier.authenticationTag,
      );
      for (const configuredId of configuredIds) {
        database.prepare(`
          INSERT INTO secret_entries (secret_id, nonce, ciphertext, authentication_tag)
          VALUES (?, ?, ?, ?)
        `).run(configuredId, randomBytes(12), Buffer.from('ciphertext'), randomBytes(16));
      }
    } finally {
      database.close();
      domain.fill(0);
      verifier.nonce.fill(0);
      verifier.ciphertext.fill(0);
      verifier.authenticationTag.fill(0);
    }
  };

  it('classifies an absent pair without creating any path', async () => {
    const before = await snapshot();
    const result = await new SecretVaultInspectionService(location)
      .inspectImportTarget(ids, false);

    expect(result).toMatchObject({
      targetIdentity: location.databasePath,
      targetState: 'INITIALIZATION_REQUIRED',
      counts: { create: 2, skipConfigured: 0, replace: 0, blocked: 0 },
    });
    expect(await snapshot()).toEqual(before);
  });

  it('classifies a pre-feature database read-only and byte-for-byte unchanged', async () => {
    const database = new DatabaseSync(location.databasePath);
    database.exec('CREATE TABLE ordinary_application_data (id TEXT PRIMARY KEY); PRAGMA journal_mode=DELETE;');
    database.close();
    const before = await snapshot();

    const result = await new SecretVaultInspectionService(location)
      .inspectImportTarget(ids, false);

    expect(result.targetState).toBe('INITIALIZATION_REQUIRED');
    expect(result.entries.every((entry) => entry.plannedAction === 'CREATE')).toBe(true);
    expect(await snapshot()).toEqual(before);
  });

  it('classifies a ready target and preserves database, key, mode, and sidecars', async () => {
    await createReadyVault(['provider.openai.api-key']);
    const before = await snapshot();

    const noOverwrite = await new SecretVaultInspectionService(location)
      .inspectImportTarget(ids, false);
    const overwrite = await new SecretVaultInspectionService(location)
      .inspectImportTarget(ids, true);

    expect(noOverwrite).toMatchObject({
      targetState: 'READY',
      entries: [
        {
          secretId: 'provider.openai.api-key',
          observedStatus: 'CONFIGURED',
          plannedAction: 'SKIP_CONFIGURED',
        },
        {
          secretId: 'search.serper.api-key',
          observedStatus: 'MISSING',
          plannedAction: 'CREATE',
        },
      ],
    });
    expect(overwrite.entries[0]?.plannedAction).toBe('REPLACE');
    expect(await snapshot()).toEqual(before);
  });

  it('returns closed value-free classifications without repair or mutation', async () => {
    await createReadyVault();
    await fs.rm(location.rootKeyPath);
    const beforeLocked = await snapshot();
    const locked = await new SecretVaultInspectionService(location)
      .inspectImportTarget(ids, false);
    expect(locked).toMatchObject({
      targetState: 'LOCKED',
      instructionCode: 'SECRET_VAULT_LOCKED',
      counts: { blocked: 2 },
    });
    expect(locked.entries.every((entry) =>
      entry.observedStatus === 'UNAVAILABLE' && entry.plannedAction === 'BLOCKED')).toBe(true);
    expect(await snapshot()).toEqual(beforeLocked);

    await fs.rm(location.databasePath);
    const corruptDatabase = new DatabaseSync(location.databasePath);
    corruptDatabase.exec('CREATE TABLE secret_entries (secret_id TEXT PRIMARY KEY);');
    corruptDatabase.close();
    const beforeCorrupt = await snapshot();
    const corrupt = await new SecretVaultInspectionService(location)
      .inspectImportTarget(ids, false);
    expect(corrupt).toMatchObject({
      targetState: 'CORRUPT',
      instructionCode: 'SECRET_VAULT_CORRUPT',
      counts: { blocked: 2 },
    });
    expect(await snapshot()).toEqual(beforeCorrupt);
  });
});
