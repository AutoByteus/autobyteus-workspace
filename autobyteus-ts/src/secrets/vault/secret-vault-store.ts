import type { SecretId } from "./secret-id.js";
import type {
  EncryptedSecretEntryRecord,
  SecretVaultBatchResult,
  SecretVaultDomainIdentity,
  SecretVaultMetadataRecord,
} from "./secret-vault-records.js";

/**
 * The encrypted-entry storage a `SecretManagementService` works on.
 *
 * Two stores implement it: the AutoByteus server's Prisma-backed application
 * vault inside its own database, and the read-only store
 * (`read-only-secret-vault-store.ts`) whose writes fail with
 * `SECRET_VAULT_READ_ONLY`.
 */
export interface SecretVaultStore {
  readMetadata(): Promise<SecretVaultMetadataRecord | null>;
  countEntries(): Promise<number>;
  hasEntry(id: SecretId): Promise<boolean>;
  readEntry(id: SecretId): Promise<EncryptedSecretEntryRecord | null>;
  saveEntry(record: EncryptedSecretEntryRecord): Promise<void>;
  removeEntry(id: SecretId): Promise<void>;
  saveBatch(
    records: ReadonlyArray<EncryptedSecretEntryRecord>,
    overwrite: boolean,
    expectedMetadata: SecretVaultDomainIdentity,
  ): Promise<SecretVaultBatchResult>;
}
