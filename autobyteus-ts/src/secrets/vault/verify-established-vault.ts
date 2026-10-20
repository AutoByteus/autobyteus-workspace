import fsp from "node:fs/promises";
import {
  SECRET_VAULT_DOMAIN_ID_BYTES,
  SECRET_VAULT_ENCRYPTION_FORMAT_VERSION,
  SECRET_VAULT_NONCE_BYTES,
  SECRET_VAULT_TAG_BYTES,
  verifyVaultVerifier,
} from "./secret-vault-crypto.js";
import { SecretRootKeyFile, type VaultFileLocation } from "./secret-root-key-file.js";
import type { SecretVaultMetadataRecord } from "./secret-vault-records.js";
import type { SecretVaultStore } from "./secret-vault-store.js";
import {
  READY_SECRET_VAULT_HEALTH,
  SecretVaultError,
  type SecretVaultHealth,
  vaultHealthFromError,
} from "./secret-vault-types.js";

/** A verified vault: READY with its root key and metadata, or the failure as health. */
export type VaultVerificationResult = {
  health: SecretVaultHealth;
  rootKey: Buffer | null;
  metadata: SecretVaultMetadataRecord | null;
};

export const vaultCorrupt = (cause?: unknown): SecretVaultError =>
  new SecretVaultError("CORRUPT_VAULT", false, "SECRET_VAULT_CORRUPT", { cause });

export const vaultUnavailable = (cause?: unknown): SecretVaultError =>
  new SecretVaultError("VAULT_UNAVAILABLE", true, "SECRET_VAULT_UNAVAILABLE", { cause });

/** The database file is a regular, non-symlinked file the user owns and nobody else may write. */
export const validateVaultDatabaseIdentity = async (location: VaultFileLocation): Promise<void> => {
  try {
    const stat = await fsp.lstat(location.databasePath);
    if (stat.isSymbolicLink() || !stat.isFile()) throw vaultUnavailable();
    if (
      process.platform !== "win32"
      && (
        (typeof process.getuid === "function" && Number(stat.uid) !== process.getuid())
        || (Number(stat.mode) & 0o022) !== 0
      )
    ) {
      throw vaultUnavailable();
    }
  } catch (cause) {
    if (cause instanceof SecretVaultError) throw cause;
    throw vaultUnavailable(cause);
  }
};

const validateMetadata = (metadata: SecretVaultMetadataRecord): void => {
  if (
    metadata.encryptionDomainId.length !== SECRET_VAULT_DOMAIN_ID_BYTES
    || metadata.verifierNonce.length !== SECRET_VAULT_NONCE_BYTES
    || metadata.verifierAuthenticationTag.length !== SECRET_VAULT_TAG_BYTES
    || metadata.verifierCiphertext.length === 0
  ) {
    throw vaultCorrupt();
  }
  if (metadata.encryptionFormatVersion !== SECRET_VAULT_ENCRYPTION_FORMAT_VERSION) {
    throw new SecretVaultError("INCOMPATIBLE_FORMAT", false, "SECRET_VAULT_INCOMPATIBLE");
  }
};

/** Throws unless `rootKey` opens the vault domain described by `metadata`. */
export const assertRootKeyOpensDomain = (rootKey: Buffer, metadata: SecretVaultMetadataRecord): void => {
  validateMetadata(metadata);
  const verified = verifyVaultVerifier(
    rootKey,
    metadata.encryptionDomainId,
    metadata.encryptionFormatVersion,
    {
      nonce: metadata.verifierNonce,
      ciphertext: metadata.verifierCiphertext,
      authenticationTag: metadata.verifierAuthenticationTag,
    },
  );
  if (!verified) throw vaultCorrupt();
};

/**
 * Verifies an already established vault without a lock and without any write:
 * the database identity, the root key file, the metadata and the verifier.
 * Vault problems become the health value; the root key is zeroized unless READY.
 */
export const verifyEstablishedVault = async (
  store: SecretVaultStore,
  location: VaultFileLocation,
  rootKeyFile = new SecretRootKeyFile(location),
): Promise<VaultVerificationResult> => {
  try {
    await validateVaultDatabaseIdentity(location);
    const inspectedKey = await rootKeyFile.inspectExisting();
    if (inspectedKey.state !== "VALID") {
      throw new SecretVaultError("VAULT_LOCKED", false, "SECRET_VAULT_LOCKED");
    }
    try {
      let metadata: SecretVaultMetadataRecord | null;
      let entryCount: number;
      try {
        [metadata, entryCount] = await Promise.all([store.readMetadata(), store.countEntries()]);
      } catch (cause) {
        throw cause instanceof SecretVaultError ? cause : vaultUnavailable(cause);
      }
      if (!metadata) throw entryCount > 0 ? vaultCorrupt() : vaultUnavailable();
      assertRootKeyOpensDomain(inspectedKey.key, metadata);
      return { health: READY_SECRET_VAULT_HEALTH, rootKey: inspectedKey.key, metadata };
    } catch (error) {
      inspectedKey.key.fill(0);
      throw error;
    }
  } catch (error) {
    return { health: vaultHealthFromError(error), rootKey: null, metadata: null };
  }
};
