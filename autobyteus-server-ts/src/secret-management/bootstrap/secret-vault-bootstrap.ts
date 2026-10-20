import { randomBytes } from "node:crypto";
import type { ApplicationDatabaseLocation } from "../../config/application-database-location.js";
import {
  createVaultVerifier,
  SECRET_VAULT_DOMAIN_ID_BYTES,
  SECRET_VAULT_ENCRYPTION_FORMAT_VERSION,
} from "autobyteus-ts/secrets/vault/secret-vault-crypto.js";
import { SecretRootKeyFile } from "autobyteus-ts/secrets/vault/secret-root-key-file.js";
import type { SecretVaultMetadataRecord } from "autobyteus-ts/secrets/vault/secret-vault-records.js";
import {
  READY_SECRET_VAULT_HEALTH,
  SecretVaultError,
  vaultHealthFromError,
} from "autobyteus-ts/secrets/vault/secret-vault-types.js";
import {
  assertRootKeyOpensDomain,
  validateVaultDatabaseIdentity,
  vaultCorrupt,
  vaultUnavailable,
  type VaultVerificationResult,
} from "autobyteus-ts/secrets/vault/verify-established-vault.js";
import type {
  SecretVaultInitializationRepository,
  SecretVaultRepository,
} from "../persistence/secret-vault-repository.js";

export type SecretVaultBootstrapResult = VaultVerificationResult;

/**
 * Initializes a new application vault, or verifies the established one, under
 * the database lock. Verification of an already established vault without a
 * lock (the read-only test vault) is `verifyEstablishedVault` in autobyteus-ts.
 */
export class SecretVaultBootstrap {
  constructor(
    private readonly location: ApplicationDatabaseLocation,
    private readonly repository: SecretVaultRepository,
    private readonly rootKeyFile = new SecretRootKeyFile(location),
  ) {}

  async initializeOrVerify(): Promise<SecretVaultBootstrapResult> {
    try {
      await validateVaultDatabaseIdentity(this.location);
      const result = await this.repository.withInitializationLock(
        (repository) => this.initializeOrVerifyUnderLock(repository),
      );
      return { health: READY_SECRET_VAULT_HEALTH, ...result };
    } catch (error) {
      return { health: vaultHealthFromError(error), rootKey: null, metadata: null };
    }
  }

  private async initializeOrVerifyUnderLock(
    repository: SecretVaultInitializationRepository,
  ): Promise<{
    rootKey: Buffer;
    metadata: SecretVaultMetadataRecord;
  }> {
    const inspectedKey = await this.rootKeyFile.inspectExisting();
    if (inspectedKey.state === "UNSAFE") {
      throw new SecretVaultError("VAULT_LOCKED", false, "SECRET_VAULT_LOCKED");
    }

    try {
      return await this.initializeOrVerifyDomain(repository, inspectedKey);
    } catch (error) {
      if (inspectedKey.state === "VALID") inspectedKey.key.fill(0);
      throw error;
    }
  }

  private async initializeOrVerifyDomain(
    repository: SecretVaultInitializationRepository,
    inspectedKey: Awaited<ReturnType<SecretRootKeyFile["inspectExisting"]>>,
  ): Promise<{
    rootKey: Buffer;
    metadata: SecretVaultMetadataRecord;
  }> {
    let metadata: SecretVaultMetadataRecord | null;
    let entryCount: number;
    try {
      [metadata, entryCount] = await Promise.all([
        repository.readMetadata(),
        repository.countEntries(),
      ]);
    } catch (cause) {
      throw vaultUnavailable(cause);
    }

    if (!metadata && entryCount > 0) throw vaultCorrupt();
    let rootKey: Buffer;
    if (!metadata) {
      rootKey = inspectedKey.state === "VALID"
        ? inspectedKey.key
        : await this.rootKeyFile.createExclusive();
      const encryptionDomainId = randomBytes(SECRET_VAULT_DOMAIN_ID_BYTES);
      const verifier = createVaultVerifier(rootKey, encryptionDomainId);
      metadata = {
        encryptionDomainId,
        encryptionFormatVersion: SECRET_VAULT_ENCRYPTION_FORMAT_VERSION,
        verifierNonce: verifier.nonce,
        verifierCiphertext: verifier.ciphertext,
        verifierAuthenticationTag: verifier.authenticationTag,
      };
      try {
        await repository.createMetadata(metadata);
      } catch (cause) {
        rootKey.fill(0);
        throw vaultUnavailable(cause);
      }
    } else {
      if (inspectedKey.state !== "VALID") {
        throw new SecretVaultError("VAULT_LOCKED", false, "SECRET_VAULT_LOCKED");
      }
      rootKey = inspectedKey.key;
    }

    try {
      assertRootKeyOpensDomain(rootKey, metadata);
      return { rootKey, metadata };
    } catch (error) {
      rootKey.fill(0);
      throw error;
    }
  }
}
