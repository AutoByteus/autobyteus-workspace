import type {
  Prisma,
  PrismaClient,
  SecretEncryptionMetadata,
  SecretEntry,
} from "@prisma/client";
import type { SecretId } from "../domain/secret-id.js";

export type SecretVaultMetadataRecord = {
  encryptionDomainId: Buffer;
  encryptionFormatVersion: number;
  verifierNonce: Buffer;
  verifierCiphertext: Buffer;
  verifierAuthenticationTag: Buffer;
};

export type EncryptedSecretEntryRecord = {
  secretId: SecretId;
  nonce: Buffer;
  ciphertext: Buffer;
  authenticationTag: Buffer;
};

export type SecretVaultBatchResult = {
  configuredCount: number;
  skippedCount: number;
  replacedCount: number;
};

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

type VaultTransactionClient = Pick<
  Prisma.TransactionClient,
  "secretEntry" | "secretEncryptionMetadata"
>;

export type SecretVaultInitializationRepository = Pick<
  SecretVaultPrismaRepository,
  "readMetadata" | "countEntries" | "createMetadata"
>;

const toMetadata = (record: SecretEncryptionMetadata): SecretVaultMetadataRecord => ({
  encryptionDomainId: Buffer.from(record.encryptionDomainId),
  encryptionFormatVersion: record.encryptionFormatVersion,
  verifierNonce: Buffer.from(record.verifierNonce),
  verifierCiphertext: Buffer.from(record.verifierCiphertext),
  verifierAuthenticationTag: Buffer.from(record.verifierAuthenticationTag),
});

export class SecretVaultPrismaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async readMetadata(): Promise<SecretVaultMetadataRecord | null> {
    return this.readMetadataFrom(this.prisma);
  }

  async countEntries(): Promise<number> {
    return this.countEntriesFrom(this.prisma);
  }

  async createMetadata(record: SecretVaultMetadataRecord): Promise<void> {
    await this.createMetadataWith(this.prisma, record);
  }

  async withInitializationLock<T>(
    operation: (repository: SecretVaultInitializationRepository) => Promise<T>,
  ): Promise<T> {
    // Prisma's SQLite interactive transaction owns the process-bound database lock
    // before this callback runs. Do not issue a no-op write merely to acquire it:
    // established verification must leave the database byte-for-byte unchanged.
    return this.prisma.$transaction(async (transaction) => {
      const lockedRepository: SecretVaultInitializationRepository = {
        readMetadata: () => this.readMetadataFrom(transaction),
        countEntries: () => this.countEntriesFrom(transaction),
        createMetadata: (record) => this.createMetadataWith(transaction, record),
      };
      return operation(lockedRepository);
    }, { maxWait: 2_000, timeout: 10_000 });
  }

  private async readMetadataFrom(
    client: Pick<VaultTransactionClient, "secretEncryptionMetadata">,
  ): Promise<SecretVaultMetadataRecord | null> {
    const rows = await client.secretEncryptionMetadata.findMany({ take: 2 });
    if (rows.length === 0) return null;
    if (rows.length !== 1 || rows[0]?.singletonId !== 1) {
      throw new Error("SECRET_VAULT_METADATA_INVALID");
    }
    return toMetadata(rows[0]);
  }

  private async countEntriesFrom(
    client: Pick<VaultTransactionClient, "secretEntry">,
  ): Promise<number> {
    return client.secretEntry.count();
  }

  private async createMetadataWith(
    client: Pick<VaultTransactionClient, "secretEncryptionMetadata">,
    record: SecretVaultMetadataRecord,
  ): Promise<void> {
    await client.secretEncryptionMetadata.create({
      data: {
        singletonId: 1,
        encryptionDomainId: record.encryptionDomainId,
        encryptionFormatVersion: record.encryptionFormatVersion,
        verifierNonce: record.verifierNonce,
        verifierCiphertext: record.verifierCiphertext,
        verifierAuthenticationTag: record.verifierAuthenticationTag,
      },
    });
  }

  async hasEntry(id: SecretId): Promise<boolean> {
    return Boolean(await this.prisma.secretEntry.findUnique({
      where: { secretId: String(id) },
      select: { secretId: true },
    }));
  }

  async readEntry(id: SecretId): Promise<EncryptedSecretEntryRecord | null> {
    const record = await this.prisma.secretEntry.findUnique({ where: { secretId: String(id) } });
    return record ? this.toEncryptedRecord(record, id) : null;
  }

  async saveEntry(record: EncryptedSecretEntryRecord): Promise<void> {
    await this.prisma.secretEntry.upsert({
      where: { secretId: String(record.secretId) },
      create: this.toWriteData(record),
      update: this.toWriteData(record),
    });
  }

  async removeEntry(id: SecretId): Promise<void> {
    await this.prisma.secretEntry.deleteMany({ where: { secretId: String(id) } });
  }

  async saveBatch(
    records: ReadonlyArray<EncryptedSecretEntryRecord>,
    overwrite: boolean,
    expectedMetadata: Pick<
      SecretVaultMetadataRecord,
      "encryptionDomainId" | "encryptionFormatVersion"
    >,
  ): Promise<SecretVaultBatchResult> {
    return this.prisma.$transaction(async (transaction) => {
      await this.assertDomainInTransaction(transaction, expectedMetadata);
      let configuredCount = 0;
      let skippedCount = 0;
      let replacedCount = 0;
      for (const record of records) {
        const configured = await this.hasEntryInTransaction(transaction, record.secretId);
        if (configured && !overwrite) {
          skippedCount += 1;
          continue;
        }
        if (configured) {
          await transaction.secretEntry.update({
            where: { secretId: String(record.secretId) },
            data: this.toWriteData(record),
          });
          replacedCount += 1;
        } else {
          await transaction.secretEntry.create({ data: this.toWriteData(record) });
          configuredCount += 1;
        }
      }
      return { configuredCount, skippedCount, replacedCount };
    }, { maxWait: 2_000, timeout: 5_000 });
  }

  async createMissingBatchForCustomProviderMigration(
    records: ReadonlyArray<EncryptedSecretEntryRecord>,
    expectedMetadata: Pick<
      SecretVaultMetadataRecord,
      "encryptionDomainId" | "encryptionFormatVersion"
    >,
  ): Promise<CustomProviderMigrationBatchReceipt> {
    await this.prisma.$transaction(async (transaction) => {
      await this.assertDomainInTransaction(transaction, expectedMetadata);
      for (const record of records) {
        if (await this.hasEntryInTransaction(transaction, record.secretId)) {
          throw new Error("CUSTOM_PROVIDER_MIGRATION_TARGET_NOT_MISSING");
        }
      }
      for (const record of records) {
        await transaction.secretEntry.create({ data: this.toWriteData(record) });
      }
    }, { maxWait: 2_000, timeout: 5_000 });

    const receipt = new CustomProviderMigrationBatchReceipt();
    migrationReceiptRecords.set(receipt, {
      owner: this,
      records: records.map((record) => this.cloneEncryptedRecord(record)),
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

    await this.prisma.$transaction(async (transaction) => {
      for (const expected of state.records) {
        const current = await transaction.secretEntry.findUnique({
          where: { secretId: String(expected.secretId) },
        });
        if (!current || !this.encryptedRecordMatches(current, expected)) {
          continue;
        }
        await transaction.secretEntry.delete({
          where: { secretId: String(expected.secretId) },
        });
      }
    }, { maxWait: 2_000, timeout: 5_000 });

    receipt.release();
  }

  private async assertDomainInTransaction(
    transaction: VaultTransactionClient,
    expected: Pick<SecretVaultMetadataRecord, "encryptionDomainId" | "encryptionFormatVersion">,
  ): Promise<void> {
    const metadata = await transaction.secretEncryptionMetadata.findUnique({
      where: { singletonId: 1 },
      select: { encryptionDomainId: true, encryptionFormatVersion: true },
    });
    if (
      !metadata
      || metadata.encryptionFormatVersion !== expected.encryptionFormatVersion
      || !Buffer.from(metadata.encryptionDomainId).equals(expected.encryptionDomainId)
    ) {
      throw new Error("SECRET_VAULT_DOMAIN_CHANGED");
    }
  }

  private async hasEntryInTransaction(
    transaction: VaultTransactionClient,
    id: SecretId,
  ): Promise<boolean> {
    return Boolean(await transaction.secretEntry.findUnique({
      where: { secretId: String(id) },
      select: { secretId: true },
    }));
  }

  private toWriteData(record: EncryptedSecretEntryRecord) {
    return {
      secretId: String(record.secretId),
      nonce: record.nonce,
      ciphertext: record.ciphertext,
      authenticationTag: record.authenticationTag,
    };
  }

  private toEncryptedRecord(record: SecretEntry, id: SecretId): EncryptedSecretEntryRecord {
    return {
      secretId: id,
      nonce: Buffer.from(record.nonce),
      ciphertext: Buffer.from(record.ciphertext),
      authenticationTag: Buffer.from(record.authenticationTag),
    };
  }

  private cloneEncryptedRecord(
    record: EncryptedSecretEntryRecord,
  ): EncryptedSecretEntryRecord {
    return {
      secretId: record.secretId,
      nonce: Buffer.from(record.nonce),
      ciphertext: Buffer.from(record.ciphertext),
      authenticationTag: Buffer.from(record.authenticationTag),
    };
  }

  private encryptedRecordMatches(
    current: SecretEntry,
    expected: EncryptedSecretEntryRecord,
  ): boolean {
    return Buffer.from(current.nonce).equals(expected.nonce)
      && Buffer.from(current.ciphertext).equals(expected.ciphertext)
      && Buffer.from(current.authenticationTag).equals(expected.authenticationTag);
  }

}
