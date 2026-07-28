import { randomUUID } from "node:crypto";
import { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import {
  providerCredentialCatalog,
  type ProviderCredentialCatalog,
} from "../catalog/provider-credential-catalog.js";
import {
  decryptSecretEntry,
  encryptSecretEntry,
  SECRET_VAULT_NONCE_BYTES,
  SECRET_VAULT_TAG_BYTES,
} from "../crypto/secret-vault-crypto.js";
import type { SecretConsumerIdentity, SecretId } from "../domain/secret-id.js";
import {
  SecretVaultError,
  type SecretStorageState,
  type SecretVaultHealth,
} from "../domain/secret-vault-types.js";
import type {
  CustomProviderMigrationBatchReceipt,
  SecretVaultPrismaRepository,
} from "../persistence/secret-vault-prisma-repository.js";
import type {
  EncryptedSecretEntryRecord,
  SecretVaultBatchResult,
  SecretVaultMetadataRecord,
} from "../persistence/secret-vault-persistence-types.js";

export type SecretOperationEvent = {
  operation:
    | "SAVE"
    | "REMOVE"
    | "STATUS"
    | "RESOLVE"
    | "SAVE_BATCH"
    | "CREATE_MISSING_BATCH"
    | "COMPENSATE_UNPUBLISHED_BATCH";
  outcome: "SUCCEEDED" | "FAILED";
  correlationId: string;
};

export type SecretOperationEventSink = (event: SecretOperationEvent) => void;

export class SecretManagementService {
  constructor(
    private readonly repository: SecretVaultPrismaRepository,
    private readonly rootKey: Buffer | null,
    private readonly metadata: SecretVaultMetadataRecord | null,
    private health: SecretVaultHealth,
    private readonly catalog: ProviderCredentialCatalog = providerCredentialCatalog,
    private readonly eventSink: SecretOperationEventSink = () => undefined,
  ) {}

  async getHealth(): Promise<SecretVaultHealth> {
    return this.health;
  }

  async getStatusForConsumer(consumer: SecretConsumerIdentity): Promise<SecretStorageState> {
    const id = this.authorize(consumer);
    this.requireReady();
    return this.withEvent("STATUS", async () =>
      await this.repository.hasEntry(id) ? "CONFIGURED" : "MISSING");
  }

  async saveForConsumer(request: {
    consumer: SecretConsumerIdentity;
    value: SecretValue;
  }): Promise<void> {
    const id = this.authorize(request.consumer);
    const record = this.encrypt(id, request.value);
    try {
      await this.withEvent("SAVE", () => this.repository.saveEntry(record));
    } finally {
      this.clearEncrypted(record);
    }
  }

  async removeForConsumer(consumer: SecretConsumerIdentity): Promise<void> {
    const id = this.authorize(consumer);
    this.requireReady();
    await this.withEvent("REMOVE", () => this.repository.removeEntry(id));
  }

  async saveBatch(
    entries: ReadonlyArray<{ secretId: SecretId; input: SecretValue }>,
    overwrite: boolean,
  ): Promise<SecretVaultBatchResult> {
    this.requireReady();
    this.authorizeBatch(entries);
    const encrypted = entries.map((entry) => this.encrypt(entry.secretId, entry.input));
    try {
      return await this.withEvent(
        "SAVE_BATCH",
        () => this.repository.saveBatch(encrypted, overwrite, {
          encryptionDomainId: (this.metadata as SecretVaultMetadataRecord).encryptionDomainId,
          encryptionFormatVersion: (this.metadata as SecretVaultMetadataRecord).encryptionFormatVersion,
        }),
      );
    } finally {
      for (const record of encrypted) this.clearEncrypted(record);
    }
  }

  async createMissingBatchForCustomProviderMigration(
    entries: ReadonlyArray<{ secretId: SecretId; input: SecretValue }>,
  ): Promise<CustomProviderMigrationBatchReceipt> {
    this.requireReady();
    this.authorizeCustomProviderMigrationBatch(entries);
    const encrypted = entries.map((entry) => this.encrypt(entry.secretId, entry.input));
    try {
      return await this.withEvent(
        "CREATE_MISSING_BATCH",
        () => this.repository.createMissingBatchForCustomProviderMigration(
          encrypted,
          {
            encryptionDomainId: (this.metadata as SecretVaultMetadataRecord).encryptionDomainId,
            encryptionFormatVersion:
              (this.metadata as SecretVaultMetadataRecord).encryptionFormatVersion,
          },
        ),
      );
    } finally {
      for (const record of encrypted) this.clearEncrypted(record);
    }
  }

  async compensateUnpublishedCustomProviderBatch(
    receipt: CustomProviderMigrationBatchReceipt,
  ): Promise<void> {
    this.requireReady();
    await this.withEvent(
      "COMPENSATE_UNPUBLISHED_BATCH",
      () => this.repository.compensateUnpublishedCustomProviderBatch(receipt),
    );
  }

  async resolveForUse(consumer: SecretConsumerIdentity): Promise<SecretValue> {
    const id = this.authorize(consumer);
    this.requireReady();
    return this.withEvent("RESOLVE", async () => {
      const record = await this.repository.readEntry(id);
      if (!record) throw new SecretVaultError("NOT_FOUND", false, "SECRET_NOT_FOUND");
      if (
        record.nonce.length !== SECRET_VAULT_NONCE_BYTES
        || record.authenticationTag.length !== SECRET_VAULT_TAG_BYTES
      ) {
        this.markCorrupt();
      }
      let plaintext: Buffer;
      try {
        plaintext = decryptSecretEntry(
          this.rootKey as Buffer,
          (this.metadata as SecretVaultMetadataRecord).encryptionDomainId,
          id,
          {
            nonce: record.nonce,
            ciphertext: record.ciphertext,
            authenticationTag: record.authenticationTag,
          },
          (this.metadata as SecretVaultMetadataRecord).encryptionFormatVersion,
        );
      } catch (cause) {
        this.markCorrupt(cause);
      }
      try {
        return SecretValue.fromString(plaintext.toString("utf8"));
      } finally {
        plaintext.fill(0);
      }
    });
  }

  close(): void {
    this.rootKey?.fill(0);
  }

  private authorize(consumer: SecretConsumerIdentity): SecretId {
    try {
      return this.catalog.resolve(consumer);
    } catch (cause) {
      throw new SecretVaultError(
        "ACCESS_DENIED",
        false,
        "SECRET_CONSUMER_NOT_AUTHORIZED",
        { cause },
      );
    }
  }

  private authorizeBatch(
    entries: ReadonlyArray<{ secretId: SecretId }>,
  ): void {
    const ids = new Set<string>();
    for (const entry of entries) {
      if (!this.catalog.isKnownSecretId(entry.secretId) || ids.has(String(entry.secretId))) {
        throw new SecretVaultError("ACCESS_DENIED", false, "SECRET_CONSUMER_NOT_AUTHORIZED");
      }
      ids.add(String(entry.secretId));
    }
  }

  private authorizeCustomProviderMigrationBatch(
    entries: ReadonlyArray<{ secretId: SecretId }>,
  ): void {
    const ids = new Set<string>();
    for (const entry of entries) {
      const id = String(entry.secretId);
      if (
        !/^provider\.openai-compatible\.provider_[a-z0-9_-]+\.api-key$/.test(id)
        || ids.has(id)
      ) {
        throw new SecretVaultError("ACCESS_DENIED", false, "SECRET_CONSUMER_NOT_AUTHORIZED");
      }
      ids.add(id);
    }
  }

  private encrypt(id: SecretId, value: SecretValue): EncryptedSecretEntryRecord {
    this.requireReady();
    const plaintext = Buffer.from(value.revealToTrustedConsumer(), "utf8");
    try {
      const payload = encryptSecretEntry(
        this.rootKey as Buffer,
        (this.metadata as SecretVaultMetadataRecord).encryptionDomainId,
        id,
        plaintext,
        (this.metadata as SecretVaultMetadataRecord).encryptionFormatVersion,
      );
      return { secretId: id, ...payload };
    } finally {
      plaintext.fill(0);
    }
  }

  private requireReady(): void {
    if (this.health.state !== "READY" || !this.rootKey || !this.metadata) {
      throw new SecretVaultError(
        this.health.state === "LOCKED" ? "VAULT_LOCKED" : "VAULT_UNAVAILABLE",
        this.health.state === "UNAVAILABLE",
        "instructionCode" in this.health
          ? this.health.instructionCode
          : "SECRET_VAULT_UNAVAILABLE",
      );
    }
  }

  private markCorrupt(cause?: unknown): never {
    this.health = { state: "CORRUPT", instructionCode: "SECRET_VAULT_CORRUPT" };
    throw new SecretVaultError(
      "CORRUPT_STORED_VALUE",
      false,
      "SECRET_VAULT_CORRUPT",
      { cause },
    );
  }

  private clearEncrypted(record: EncryptedSecretEntryRecord): void {
    record.nonce.fill(0);
    record.ciphertext.fill(0);
    record.authenticationTag.fill(0);
  }

  private async withEvent<T>(
    operation: SecretOperationEvent["operation"],
    action: () => Promise<T>,
  ): Promise<T> {
    const correlationId = randomUUID();
    try {
      const result = await action();
      this.eventSink({ operation, outcome: "SUCCEEDED", correlationId });
      return result;
    } catch (error) {
      this.eventSink({ operation, outcome: "FAILED", correlationId });
      throw error;
    }
  }
}
