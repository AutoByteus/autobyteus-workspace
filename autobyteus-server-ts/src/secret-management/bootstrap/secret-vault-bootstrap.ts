import fsp from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import type { ApplicationDatabaseLocation } from "../../config/application-database-location.js";
import {
  createVaultVerifier,
  SECRET_VAULT_DOMAIN_ID_BYTES,
  SECRET_VAULT_ENCRYPTION_FORMAT_VERSION,
  SECRET_VAULT_NONCE_BYTES,
  SECRET_VAULT_TAG_BYTES,
  verifyVaultVerifier,
} from "../crypto/secret-vault-crypto.js";
import {
  READY_SECRET_VAULT_HEALTH,
  SecretVaultError,
  type SecretVaultHealth,
  vaultHealthFromError,
} from "../domain/secret-vault-types.js";
import type {
  SecretVaultMetadataRecord,
  SecretVaultPrismaRepository,
} from "../persistence/secret-vault-prisma-repository.js";
import { SecretRootKeyFile } from "../root-key/secret-root-key-file.js";

export type SecretVaultBootstrapResult = {
  health: SecretVaultHealth;
  rootKey: Buffer | null;
  metadata: SecretVaultMetadataRecord | null;
};

const corrupt = (cause?: unknown): SecretVaultError =>
  new SecretVaultError("CORRUPT_VAULT", false, "SECRET_VAULT_CORRUPT", { cause });

const unavailable = (cause?: unknown): SecretVaultError =>
  new SecretVaultError("VAULT_UNAVAILABLE", true, "SECRET_VAULT_UNAVAILABLE", { cause });

const validateDatabaseIdentity = async (
  location: ApplicationDatabaseLocation,
): Promise<void> => {
  try {
    const stat = await fsp.lstat(location.databasePath);
    if (stat.isSymbolicLink() || !stat.isFile()) throw unavailable();
    if (
      process.platform !== "win32"
      && (
        (typeof process.getuid === "function" && Number(stat.uid) !== process.getuid())
        || (Number(stat.mode) & 0o022) !== 0
      )
    ) {
      throw unavailable();
    }
  } catch (cause) {
    if (cause instanceof SecretVaultError) throw cause;
    throw unavailable(cause);
  }
};

const validateMetadata = (metadata: SecretVaultMetadataRecord): void => {
  if (
    metadata.encryptionDomainId.length !== SECRET_VAULT_DOMAIN_ID_BYTES
    || metadata.verifierNonce.length !== SECRET_VAULT_NONCE_BYTES
    || metadata.verifierAuthenticationTag.length !== SECRET_VAULT_TAG_BYTES
    || metadata.verifierCiphertext.length === 0
  ) {
    throw corrupt();
  }
  if (metadata.encryptionFormatVersion !== SECRET_VAULT_ENCRYPTION_FORMAT_VERSION) {
    throw new SecretVaultError(
      "INCOMPATIBLE_FORMAT",
      false,
      "SECRET_VAULT_INCOMPATIBLE",
    );
  }
};

export class SecretVaultBootstrap {
  constructor(
    private readonly location: ApplicationDatabaseLocation,
    private readonly repository: SecretVaultPrismaRepository,
    private readonly rootKeyFile = new SecretRootKeyFile(location),
  ) {}

  async initializeOrVerify(): Promise<SecretVaultBootstrapResult> {
    let lock: fsp.FileHandle | null = null;
    try {
      await fsp.mkdir(path.dirname(this.location.rootKeyPath), {
        recursive: true,
        mode: 0o700,
      });
      lock = await fsp.open(`${this.location.rootKeyPath}.initialize.lock`, "wx", 0o600);
      const result = await this.initializeOrVerifyUnderLock();
      return { health: READY_SECRET_VAULT_HEALTH, ...result };
    } catch (error) {
      return { health: vaultHealthFromError(error), rootKey: null, metadata: null };
    } finally {
      if (lock) {
        await lock.close();
        await fsp.unlink(`${this.location.rootKeyPath}.initialize.lock`).catch(() => undefined);
      }
    }
  }

  private async initializeOrVerifyUnderLock(): Promise<{
    rootKey: Buffer;
    metadata: SecretVaultMetadataRecord;
  }> {
    await validateDatabaseIdentity(this.location);
    const inspectedKey = await this.rootKeyFile.inspectExisting();
    if (inspectedKey.state === "UNSAFE") {
      throw new SecretVaultError("VAULT_LOCKED", false, "SECRET_VAULT_LOCKED");
    }

    try {
      return await this.initializeOrVerifyDomain(inspectedKey);
    } catch (error) {
      if (inspectedKey.state === "VALID") inspectedKey.key.fill(0);
      throw error;
    }
  }

  private async initializeOrVerifyDomain(
    inspectedKey: Awaited<ReturnType<SecretRootKeyFile["inspectExisting"]>>,
  ): Promise<{
    rootKey: Buffer;
    metadata: SecretVaultMetadataRecord;
  }> {
    let metadata: SecretVaultMetadataRecord | null;
    let entryCount: number;
    try {
      [metadata, entryCount] = await Promise.all([
        this.repository.readMetadata(),
        this.repository.countEntries(),
      ]);
    } catch (cause) {
      throw unavailable(cause);
    }

    if (!metadata && entryCount > 0) throw corrupt();
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
        await this.repository.createMetadata(metadata);
      } catch (cause) {
        rootKey.fill(0);
        throw unavailable(cause);
      }
    } else {
      if (inspectedKey.state !== "VALID") {
        throw new SecretVaultError("VAULT_LOCKED", false, "SECRET_VAULT_LOCKED");
      }
      rootKey = inspectedKey.key;
    }

    try {
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
      if (!verified) throw corrupt();
      return { rootKey, metadata };
    } catch (error) {
      rootKey.fill(0);
      throw error;
    }
  }
}
