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

const INITIALIZATION_TRANSACTION_OPTIONS = {
  maxWait: 2_000,
  timeout: 10_000,
} satisfies RunInTransactionOptions;

const MUTATION_TRANSACTION_OPTIONS = {
  maxWait: 2_000,
  timeout: 5_000,
} satisfies RunInTransactionOptions;

export class CustomProviderMigrationBatchReceipt {
  readonly #opaque = true;

  release(): void {
    const state = migrationReceiptRecords.get(this);
    if (!state) return;
    migrationReceiptRecords.delete(this);
    for (const record of state.records) {
      record.nonce.fill(0);
      record.ciphertext.fill(0);
      record.authenticationTag.fill(0);
    }
  }
}

const migrationReceiptRecords = new WeakMap<
  CustomProviderMigrationBatchReceipt,
  {
    owner: object;
    records: EncryptedSecretEntryRecord[];
  }
>();

export type SecretVaultInitializationRepository = Pick<
  SecretVaultRepository,
  "readMetadata" | "countEntries" | "createMetadata"
>;

export class SecretVaultRepository {
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

  async createMissingBatchForCustomProviderMigration(
    records: ReadonlyArray<EncryptedSecretEntryRecord>,
    expectedMetadata: SecretVaultDomainIdentity,
  ): Promise<CustomProviderMigrationBatchReceipt> {
    await runInTransaction(async () => {
      await this.assertDomain(expectedMetadata);
      for (const record of records) {
        if (await this.entryRepository.hasEntry(record.secretId)) {
          throw new Error("CUSTOM_PROVIDER_MIGRATION_TARGET_NOT_MISSING");
        }
      }
      for (const record of records) {
        await this.entryRepository.createEntry(record);
      }
    }, MUTATION_TRANSACTION_OPTIONS);

    const receipt = new CustomProviderMigrationBatchReceipt();
    migrationReceiptRecords.set(receipt, {
      owner: this,
      records: records.map(cloneEncryptedRecord),
    });
    return receipt;
  }

  async compensateUnpublishedCustomProviderBatch(
    receipt: CustomProviderMigrationBatchReceipt,
  ): Promise<void> {
    const state = migrationReceiptRecords.get(receipt);
    if (!state || state.owner !== this) {
      throw new Error("CUSTOM_PROVIDER_MIGRATION_RECEIPT_INVALID");
    }

    await runInTransaction(async () => {
      for (const expected of state.records) {
        const current = await this.entryRepository.readEntry(expected.secretId);
        if (!current || !encryptedRecordMatches(current, expected)) {
          continue;
        }
        await this.entryRepository.deleteEntry(expected.secretId);
      }
    }, MUTATION_TRANSACTION_OPTIONS);

    receipt.release();
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

const cloneEncryptedRecord = (
  record: EncryptedSecretEntryRecord,
): EncryptedSecretEntryRecord => ({
  secretId: record.secretId,
  nonce: Buffer.from(record.nonce),
  ciphertext: Buffer.from(record.ciphertext),
  authenticationTag: Buffer.from(record.authenticationTag),
});

const encryptedRecordMatches = (
  current: EncryptedSecretEntryRecord,
  expected: EncryptedSecretEntryRecord,
): boolean => current.nonce.equals(expected.nonce)
  && current.ciphertext.equals(expected.ciphertext)
  && current.authenticationTag.equals(expected.authenticationTag);
