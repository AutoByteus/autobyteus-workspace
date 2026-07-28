import {
  Prisma,
  type SecretEncryptionMetadata,
} from "@prisma/client";
import { BaseRepository } from "repository_prisma";
import type {
  SecretVaultDomainIdentity,
  SecretVaultMetadataRecord,
} from "./secret-vault-persistence-types.js";

const toMetadata = (
  record: SecretEncryptionMetadata,
): SecretVaultMetadataRecord => ({
  encryptionDomainId: Buffer.from(record.encryptionDomainId),
  encryptionFormatVersion: record.encryptionFormatVersion,
  verifierNonce: Buffer.from(record.verifierNonce),
  verifierCiphertext: Buffer.from(record.verifierCiphertext),
  verifierAuthenticationTag: Buffer.from(record.verifierAuthenticationTag),
});

export class SecretEncryptionMetadataPrismaRepository extends BaseRepository.forModel(
  Prisma.ModelName.SecretEncryptionMetadata,
) {
  async readMetadata(): Promise<SecretVaultMetadataRecord | null> {
    const rows = await this.findMany({ take: 2 });
    if (rows.length === 0) {
      return null;
    }
    if (rows.length !== 1 || rows[0]?.singletonId !== 1) {
      throw new Error("SECRET_VAULT_METADATA_INVALID");
    }
    return toMetadata(rows[0]);
  }

  async readDomainIdentity(): Promise<SecretVaultDomainIdentity | null> {
    const metadata = await this.findUnique({
      where: { singletonId: 1 },
      select: {
        encryptionDomainId: true,
        encryptionFormatVersion: true,
      },
    });
    return metadata
      ? {
          encryptionDomainId: Buffer.from(metadata.encryptionDomainId),
          encryptionFormatVersion: metadata.encryptionFormatVersion,
        }
      : null;
  }

  async createMetadata(record: SecretVaultMetadataRecord): Promise<void> {
    await this.create({
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
}
