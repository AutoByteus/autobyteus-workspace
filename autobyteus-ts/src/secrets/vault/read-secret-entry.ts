import { SecretValue } from "../secret-value.js";
import {
  decryptSecretEntry,
  SECRET_VAULT_NONCE_BYTES,
  SECRET_VAULT_TAG_BYTES,
} from "./secret-vault-crypto.js";
import type { SecretId } from "./secret-id.js";
import type { SecretVaultMetadataRecord } from "./secret-vault-records.js";
import type { SecretVaultStore } from "./secret-vault-store.js";
import { SecretVaultError } from "./secret-vault-types.js";
import { vaultCorrupt } from "./verify-established-vault.js";

/**
 * Reads and decrypts one entry of a verified vault.
 *
 * - absent entry: `SecretVaultError('NOT_FOUND', …, 'SECRET_NOT_FOUND')`;
 * - a nonce or tag of the wrong length, or a failed decryption:
 *   `SecretVaultError('CORRUPT_VAULT', …, 'SECRET_VAULT_CORRUPT')`.
 *
 * The plaintext and the encrypted copy are zeroized on every path (derived
 * keys are zeroized inside the crypto module).
 */
export const readSecretEntry = async (
  store: SecretVaultStore,
  rootKey: Buffer,
  metadata: SecretVaultMetadataRecord,
  id: SecretId,
): Promise<SecretValue> => {
  const record = await store.readEntry(id);
  if (!record) throw new SecretVaultError("NOT_FOUND", false, "SECRET_NOT_FOUND");
  try {
    if (
      record.nonce.length !== SECRET_VAULT_NONCE_BYTES
      || record.authenticationTag.length !== SECRET_VAULT_TAG_BYTES
    ) {
      throw vaultCorrupt();
    }
    let plaintext: Buffer;
    try {
      plaintext = decryptSecretEntry(
        rootKey,
        metadata.encryptionDomainId,
        id,
        {
          nonce: record.nonce,
          ciphertext: record.ciphertext,
          authenticationTag: record.authenticationTag,
        },
        metadata.encryptionFormatVersion,
      );
    } catch (cause) {
      throw vaultCorrupt(cause);
    }
    try {
      return SecretValue.fromString(plaintext.toString("utf8"));
    } finally {
      plaintext.fill(0);
    }
  } finally {
    record.nonce.fill(0);
    record.ciphertext.fill(0);
    record.authenticationTag.fill(0);
  }
};
