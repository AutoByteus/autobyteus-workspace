import type { SecretId } from "../domain/secret-id.js";

export type SecretVaultMetadataRecord = {
  encryptionDomainId: Buffer;
  encryptionFormatVersion: number;
  verifierNonce: Buffer;
  verifierCiphertext: Buffer;
  verifierAuthenticationTag: Buffer;
};

export type SecretVaultDomainIdentity = Pick<
  SecretVaultMetadataRecord,
  "encryptionDomainId" | "encryptionFormatVersion"
>;

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
