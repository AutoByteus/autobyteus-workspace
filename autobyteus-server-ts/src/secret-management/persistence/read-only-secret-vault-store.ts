import type { DatabaseSync } from "node:sqlite";
import type { SecretId } from "../domain/secret-id.js";
import { SecretVaultError } from "../domain/secret-vault-types.js";
import type {
  EncryptedSecretEntryRecord,
  SecretVaultBatchResult,
  SecretVaultMetadataRecord,
} from "./secret-vault-persistence-types.js";
import {
  hasRequiredSecretVaultColumns,
  openReadOnlyVaultDatabase,
  presentSecretVaultTables,
  SECRET_VAULT_METADATA_ROWS_QUERY,
  type SecretVaultMetadataRow,
} from "./secret-vault-sqlite-schema.js";
import type { SecretVaultStore } from "./secret-vault-store.js";

type EntryRow = {
  nonce: Uint8Array;
  ciphertext: Uint8Array;
  authentication_tag: Uint8Array;
};

const corrupt = (cause?: unknown): SecretVaultError =>
  new SecretVaultError("CORRUPT_VAULT", false, "SECRET_VAULT_CORRUPT", { cause });

const readOnly = (): SecretVaultError =>
  new SecretVaultError("READ_ONLY", false, "SECRET_VAULT_READ_ONLY");

/**
 * A vault database opened strictly read-only through `node:sqlite`
 * (`readOnly` + `query_only`), independent of the process's Prisma database.
 * It reads only the two secret tables, so it never migrates or writes the file;
 * every write fails with `SECRET_VAULT_READ_ONLY`.
 */
export class ReadOnlySecretVaultStore implements SecretVaultStore {
  private constructor(private readonly database: DatabaseSync) {}

  /** Opens the file and checks that both vault tables have the required columns. */
  static open(databasePath: string): ReadOnlySecretVaultStore {
    let database: DatabaseSync;
    try {
      database = openReadOnlyVaultDatabase(databasePath);
    } catch (cause) {
      throw new SecretVaultError("VAULT_UNAVAILABLE", true, "SECRET_VAULT_UNAVAILABLE", { cause });
    }
    try {
      const tables = presentSecretVaultTables(database);
      if (
        !tables.has("secret_entries")
        || !tables.has("secret_encryption_metadata")
        || !hasRequiredSecretVaultColumns(database, "secret_entries")
        || !hasRequiredSecretVaultColumns(database, "secret_encryption_metadata")
      ) {
        throw corrupt();
      }
    } catch (error) {
      database.close();
      throw error instanceof SecretVaultError ? error : corrupt(error);
    }
    return new ReadOnlySecretVaultStore(database);
  }

  async readMetadata(): Promise<SecretVaultMetadataRecord | null> {
    const rows = this.database.prepare(SECRET_VAULT_METADATA_ROWS_QUERY)
      .all() as SecretVaultMetadataRow[];
    if (rows.length === 0) return null;
    if (rows.length !== 1 || rows[0].singleton_id !== 1) throw corrupt();
    const row = rows[0];
    return {
      encryptionDomainId: Buffer.from(row.encryption_domain_id),
      encryptionFormatVersion: row.encryption_format_version,
      verifierNonce: Buffer.from(row.verifier_nonce),
      verifierCiphertext: Buffer.from(row.verifier_ciphertext),
      verifierAuthenticationTag: Buffer.from(row.verifier_authentication_tag),
    };
  }

  async countEntries(): Promise<number> {
    return Number(
      (this.database.prepare("SELECT COUNT(*) AS count FROM secret_entries").get() as {
        count: number;
      }).count,
    );
  }

  async hasEntry(id: SecretId): Promise<boolean> {
    return Boolean(
      this.database.prepare("SELECT 1 AS configured FROM secret_entries WHERE secret_id = ? LIMIT 1")
        .get(String(id)),
    );
  }

  async readEntry(id: SecretId): Promise<EncryptedSecretEntryRecord | null> {
    const row = this.database.prepare(
      "SELECT nonce, ciphertext, authentication_tag FROM secret_entries WHERE secret_id = ? LIMIT 1",
    ).get(String(id)) as EntryRow | undefined;
    if (!row) return null;
    return {
      secretId: id,
      nonce: Buffer.from(row.nonce),
      ciphertext: Buffer.from(row.ciphertext),
      authenticationTag: Buffer.from(row.authentication_tag),
    };
  }

  async saveEntry(): Promise<void> {
    throw readOnly();
  }

  async removeEntry(): Promise<void> {
    throw readOnly();
  }

  async saveBatch(): Promise<SecretVaultBatchResult> {
    throw readOnly();
  }

  close(): void {
    this.database.close();
  }
}
