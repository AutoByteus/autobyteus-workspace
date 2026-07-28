import {
  Prisma,
  type SecretEntry,
} from "@prisma/client";
import { BaseRepository } from "repository_prisma";
import type { SecretId } from "../domain/secret-id.js";
import type { EncryptedSecretEntryRecord } from "./secret-vault-persistence-types.js";

const toWriteData = (record: EncryptedSecretEntryRecord) => ({
  secretId: String(record.secretId),
  nonce: record.nonce,
  ciphertext: record.ciphertext,
  authenticationTag: record.authenticationTag,
});

const toEncryptedRecord = (
  record: SecretEntry,
  id: SecretId,
): EncryptedSecretEntryRecord => ({
  secretId: id,
  nonce: Buffer.from(record.nonce),
  ciphertext: Buffer.from(record.ciphertext),
  authenticationTag: Buffer.from(record.authenticationTag),
});

export class SecretEntryRepository extends BaseRepository.forModel(
  Prisma.ModelName.SecretEntry,
) {
  async hasEntry(id: SecretId): Promise<boolean> {
    return Boolean(await this.findUnique({
      where: { secretId: String(id) },
      select: { secretId: true },
    }));
  }

  async readEntry(id: SecretId): Promise<EncryptedSecretEntryRecord | null> {
    const record = await this.findUnique({
      where: { secretId: String(id) },
    });
    return record ? toEncryptedRecord(record, id) : null;
  }

  async countEntries(): Promise<number> {
    return this.count();
  }

  async saveEntry(record: EncryptedSecretEntryRecord): Promise<void> {
    await this.upsert({
      where: { secretId: String(record.secretId) },
      create: toWriteData(record),
      update: toWriteData(record),
    });
  }

  async createEntry(record: EncryptedSecretEntryRecord): Promise<void> {
    await this.create({ data: toWriteData(record) });
  }

  async updateEntry(record: EncryptedSecretEntryRecord): Promise<void> {
    await this.update({
      where: { secretId: String(record.secretId) },
      data: toWriteData(record),
    });
  }

  async removeEntry(id: SecretId): Promise<void> {
    await this.deleteMany({ where: { secretId: String(id) } });
  }

  async deleteEntry(id: SecretId): Promise<void> {
    await this.delete({ where: { secretId: String(id) } });
  }
}
