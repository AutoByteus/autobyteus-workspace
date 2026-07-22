import type { DatabaseSync } from 'node:sqlite';
import { SecretValue } from 'autobyteus-ts/secrets/secret-value.js';
import type { SecretDefinitionId } from '../../domain/secret-binding.js';
import { SecretStorageError } from '../../domain/secret-storage-types.js';
import { decryptSecretRecord, encryptSecretRecord } from './local-store-crypto.js';
import type { LocalStoreAccessMode } from './local-secret-store-initializer.js';

type SecretRecordRow = { nonce: Uint8Array; ciphertext: Uint8Array };

export type LocalEncryptedSecretBatchEntry = {
  definitionId: SecretDefinitionId;
  value: SecretValue;
  action: 'CREATE' | 'REPLACE';
};

export class LocalSecretStoreBatchPreconditionError extends Error {
  constructor() {
    super('LOCAL_SECRET_STORE_BATCH_PRECONDITION_CHANGED');
    this.name = 'LocalSecretStoreBatchPreconditionError';
  }
}

const isBusy = (error: unknown): boolean =>
  /busy|locked/i.test(String((error as Error | undefined)?.message ?? ''));

const mapSqliteError = (error: unknown): SecretStorageError => isBusy(error)
  ? new SecretStorageError('BACKEND_LOCKED', true, 'SECRET_BACKEND_LOCKED', { cause: error })
  : new SecretStorageError('BACKEND_UNAVAILABLE', true, 'SECRET_BACKEND_UNAVAILABLE', { cause: error });

export class LocalEncryptedSecretRepository {
  #closed = false;

  constructor(
    private readonly database: DatabaseSync,
    private readonly rootKey: Buffer,
    private readonly accessMode: LocalStoreAccessMode,
    private readonly onCorrupt: () => void,
  ) {}

  getStatus(definitionId: SecretDefinitionId): { storageState: 'MISSING' | 'CONFIGURED' } {
    this.assertOpen();
    try {
      const row = this.database.prepare(
        'SELECT 1 AS configured FROM secret_records WHERE definition_id = ?',
      ).get(String(definitionId));
      return { storageState: row ? 'CONFIGURED' : 'MISSING' };
    } catch (error) {
      throw mapSqliteError(error);
    }
  }

  resolve(definitionId: SecretDefinitionId): SecretValue {
    this.assertOpen();
    let row: SecretRecordRow | undefined;
    try {
      row = this.database.prepare(
        'SELECT nonce, ciphertext FROM secret_records WHERE definition_id = ?',
      ).get(String(definitionId)) as SecretRecordRow | undefined;
    } catch (error) {
      throw mapSqliteError(error);
    }
    if (!row) throw new SecretStorageError('NOT_FOUND', false, 'SECRET_NOT_FOUND');

    const encodedCiphertext = Buffer.from(row.ciphertext);
    if (encodedCiphertext.length <= 16 || Buffer.from(row.nonce).length !== 12) {
      this.markCorrupt();
    }
    const ciphertext = encodedCiphertext.subarray(0, -16);
    const tag = encodedCiphertext.subarray(-16);
    let plaintext: Buffer;
    try {
      plaintext = decryptSecretRecord(this.rootKey, definitionId, {
        nonce: Buffer.from(row.nonce),
        ciphertext,
        tag,
      });
    } catch (cause) {
      this.markCorrupt(cause);
    }
    try {
      return SecretValue.fromString(plaintext.toString('utf8'));
    } finally {
      plaintext.fill(0);
    }
  }

  save(definitionId: SecretDefinitionId, value: SecretValue): void {
    this.assertWritable();
    const plaintext = Buffer.from(value.revealToTrustedConsumer(), 'utf8');
    try {
      const encrypted = encryptSecretRecord(this.rootKey, definitionId, plaintext);
      const encodedCiphertext = Buffer.concat([encrypted.ciphertext, encrypted.tag]);
      this.transaction(() => {
        this.database.prepare(`
          INSERT INTO secret_records (definition_id, nonce, ciphertext)
          VALUES (?, ?, ?)
          ON CONFLICT(definition_id) DO UPDATE SET
            nonce = excluded.nonce,
            ciphertext = excluded.ciphertext
        `).run(String(definitionId), encrypted.nonce, encodedCiphertext);
      });
    } finally {
      plaintext.fill(0);
    }
  }

  provisionBatchExact(entries: readonly LocalEncryptedSecretBatchEntry[]): {
    configuredCount: number;
    replacedCount: number;
  } {
    this.assertWritable();
    const statusStatement = this.database.prepare(
      'SELECT 1 AS configured FROM secret_records WHERE definition_id = ?',
    );
    const writeStatement = this.database.prepare(`
      INSERT INTO secret_records (definition_id, nonce, ciphertext)
      VALUES (?, ?, ?)
      ON CONFLICT(definition_id) DO UPDATE SET
        nonce = excluded.nonce,
        ciphertext = excluded.ciphertext
    `);
    this.transaction(() => {
      for (const entry of entries) {
        const configured = Boolean(statusStatement.get(String(entry.definitionId)));
        if ((entry.action === 'CREATE' && configured) || (entry.action === 'REPLACE' && !configured)) {
          throw new LocalSecretStoreBatchPreconditionError();
        }
      }
      for (const entry of entries) {
        const plaintext = Buffer.from(entry.value.revealToTrustedConsumer(), 'utf8');
        try {
          const encrypted = encryptSecretRecord(this.rootKey, entry.definitionId, plaintext);
          writeStatement.run(
            String(entry.definitionId),
            encrypted.nonce,
            Buffer.concat([encrypted.ciphertext, encrypted.tag]),
          );
        } finally {
          plaintext.fill(0);
        }
      }
    });
    return {
      configuredCount: entries.filter((entry) => entry.action === 'CREATE').length,
      replacedCount: entries.filter((entry) => entry.action === 'REPLACE').length,
    };
  }

  remove(definitionId: SecretDefinitionId): void {
    this.assertWritable();
    this.transaction(() => {
      this.database.prepare('DELETE FROM secret_records WHERE definition_id = ?').run(String(definitionId));
    });
  }

  checkpoint(): void {
    this.assertWritable();
    try {
      this.database.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch (error) {
      throw mapSqliteError(error);
    }
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    try {
      this.database.close();
    } finally {
      this.rootKey.fill(0);
    }
  }

  private transaction(action: () => void): void {
    try {
      this.database.exec('BEGIN IMMEDIATE;');
      action();
      this.database.exec('COMMIT;');
    } catch (error) {
      try {
        this.database.exec('ROLLBACK;');
      } catch {
        // The transaction may not have begun; preserve only the value-free mapped cause.
      }
      if (error instanceof LocalSecretStoreBatchPreconditionError) throw error;
      throw mapSqliteError(error);
    }
  }

  private assertOpen(): void {
    if (this.#closed) {
      throw new SecretStorageError('BACKEND_UNAVAILABLE', false, 'SECRET_BACKEND_UNAVAILABLE');
    }
  }

  private assertWritable(): void {
    this.assertOpen();
    if (this.accessMode !== 'READ_WRITE') {
      throw new SecretStorageError('EXTERNALLY_MANAGED', false, 'SECRET_EXTERNALLY_MANAGED');
    }
  }

  private markCorrupt(cause?: unknown): never {
    this.onCorrupt();
    throw new SecretStorageError('CORRUPT_STORED_VALUE', false, 'SECRET_BACKEND_CORRUPT', { cause });
  }
}
