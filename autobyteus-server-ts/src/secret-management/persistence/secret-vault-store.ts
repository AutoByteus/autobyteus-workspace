import type { SecretId } from "../domain/secret-id.js";
import type {
  EncryptedSecretEntryRecord,
  SecretVaultBatchResult,
  SecretVaultDomainIdentity,
  SecretVaultMetadataRecord,
} from "./secret-vault-persistence-types.js";

/**
 * The encrypted-entry storage a `SecretManagementService` works on.
 *
 * Two stores implement it: the Prisma-backed application vault inside the
 * server's own database, and the read-only test vault store whose writes fail
 * with `SECRET_VAULT_READ_ONLY`.
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
