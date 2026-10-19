import {
  runInTransaction,
  type RunInTransactionOptions,
} from "repository_prisma";
import type { SecretId } from "../domain/secret-id.js";
import { SecretEncryptionMetadataRepository } from "./secret-encryption-metadata-repository.js";
import { SecretEntryRepository } from "./secret-entry-repository.js";
import type {
  EncryptedSecretEntryRecord,
  SecretVaultBatchResult,
  SecretVaultDomainIdentity,
  SecretVaultMetadataRecord,
} from "./secret-vault-persistence-types.js";
import type { SecretVaultStore } from "./secret-vault-store.js";

const INITIALIZATION_TRANSACTION_OPTIONS = {
  maxWait: 2_000,
  timeout: 10_000,
} satisfies RunInTransactionOptions;

const MUTATION_TRANSACTION_OPTIONS = {
  maxWait: 2_000,
  timeout: 5_000,
} satisfies RunInTransactionOptions;

export type SecretVaultInitializationRepository = Pick<
  SecretVaultRepository,
  "readMetadata" | "countEntries" | "createMetadata"
>;

/** The application vault: the two secret tables inside the server's own Prisma database. */
export class SecretVaultRepository implements SecretVaultStore {
  private readonly entryRepository = new SecretEntryRepository();
  private readonly metadataRepository = new SecretEncryptionMetadataRepository();

  async readMetadata(): Promise<SecretVaultMetadataRecord | null> {
    return this.metadataRepository.readMetadata();
  }

  async countEntries(): Promise<number> {
    return this.entryRepository.countEntries();
  }

  async createMetadata(record: SecretVaultMetadataRecord): Promise<void> {
    await this.metadataRepository.createMetadata(record);
  }

  async withInitializationLock<T>(
    operation: (repository: SecretVaultInitializationRepository) => Promise<T>,
  ): Promise<T> {
    // Prisma's SQLite interactive transaction owns the process-bound database lock
    // before this callback runs. Do not issue a no-op write merely to acquire it:
    // established verification must leave the database byte-for-byte unchanged.
    return runInTransaction(
      () => operation(this),
      INITIALIZATION_TRANSACTION_OPTIONS,
    );
  }

  async hasEntry(id: SecretId): Promise<boolean> {
    return this.entryRepository.hasEntry(id);
  }

  async readEntry(id: SecretId): Promise<EncryptedSecretEntryRecord | null> {
    return this.entryRepository.readEntry(id);
  }

  async saveEntry(record: EncryptedSecretEntryRecord): Promise<void> {
    await this.entryRepository.saveEntry(record);
  }

  async removeEntry(id: SecretId): Promise<void> {
    await this.entryRepository.removeEntry(id);
  }

  async saveBatch(
    records: ReadonlyArray<EncryptedSecretEntryRecord>,
    overwrite: boolean,
    expectedMetadata: SecretVaultDomainIdentity,
  ): Promise<SecretVaultBatchResult> {
    return runInTransaction(async () => {
      await this.assertDomain(expectedMetadata);
      let configuredCount = 0;
      let skippedCount = 0;
      let replacedCount = 0;
      for (const record of records) {
        const configured = await this.entryRepository.hasEntry(record.secretId);
        if (configured && !overwrite) {
          skippedCount += 1;
          continue;
        }
        if (configured) {
          await this.entryRepository.updateEntry(record);
          replacedCount += 1;
        } else {
          await this.entryRepository.createEntry(record);
          configuredCount += 1;
        }
      }
      return { configuredCount, skippedCount, replacedCount };
    }, MUTATION_TRANSACTION_OPTIONS);
  }

  private async assertDomain(expected: SecretVaultDomainIdentity): Promise<void> {
    const metadata = await this.metadataRepository.readDomainIdentity();
    if (
      !metadata
      || metadata.encryptionFormatVersion !== expected.encryptionFormatVersion
      || !metadata.encryptionDomainId.equals(expected.encryptionDomainId)
    ) {
      throw new Error("SECRET_VAULT_DOMAIN_CHANGED");
    }
  }
}
