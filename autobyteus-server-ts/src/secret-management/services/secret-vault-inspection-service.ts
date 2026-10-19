import fsp from "node:fs/promises";
import type { DatabaseSync } from "node:sqlite";
import type { ApplicationDatabaseLocation } from "../../config/application-database-location.js";
import {
  SECRET_VAULT_DOMAIN_ID_BYTES,
  SECRET_VAULT_ENCRYPTION_FORMAT_VERSION,
  SECRET_VAULT_NONCE_BYTES,
  SECRET_VAULT_TAG_BYTES,
  verifyVaultVerifier,
} from "../crypto/secret-vault-crypto.js";
import type { SecretId } from "../domain/secret-id.js";
import {
  hasRequiredSecretVaultColumns,
  openReadOnlyVaultDatabase,
  presentSecretVaultTables,
  SECRET_VAULT_METADATA_ROWS_QUERY,
  type SecretVaultMetadataRow,
} from "../persistence/secret-vault-sqlite-schema.js";
import { SecretRootKeyFile } from "../root-key/secret-root-key-file.js";

export type ImportTargetState =
  | "INITIALIZATION_REQUIRED"
  | "READY"
  | "LOCKED"
  | "CORRUPT"
  | "INCOMPATIBLE"
  | "UNAVAILABLE";
export type ImportObservedStatus = "MISSING" | "CONFIGURED" | "UNAVAILABLE";
export type ImportPlannedAction = "CREATE" | "SKIP_CONFIGURED" | "REPLACE" | "BLOCKED";

export type ImportTargetInspection = {
  targetIdentity: string;
  targetState: ImportTargetState;
  entries: ReadonlyArray<{
    secretId: SecretId;
    observedStatus: ImportObservedStatus;
    plannedAction: ImportPlannedAction;
  }>;
  counts: {
    create: number;
    skipConfigured: number;
    replace: number;
    blocked: number;
  };
  instructionCode?: string;
};

const instructionFor = (state: ImportTargetState): string | undefined => ({
  INITIALIZATION_REQUIRED: "SECRET_VAULT_INITIALIZATION_REQUIRED",
  READY: undefined,
  LOCKED: "SECRET_VAULT_LOCKED",
  CORRUPT: "SECRET_VAULT_CORRUPT",
  INCOMPATIBLE: "SECRET_VAULT_INCOMPATIBLE",
  UNAVAILABLE: "SECRET_VAULT_UNAVAILABLE",
})[state];

export class SecretVaultInspectionService {
  constructor(
    private readonly location: ApplicationDatabaseLocation,
    private readonly rootKeyFile = new SecretRootKeyFile(location),
  ) {}

  async inspectImportTarget(
    secretIds: ReadonlyArray<SecretId>,
    overwrite: boolean,
  ): Promise<ImportTargetInspection> {
    const orderedIds = [...secretIds].sort((left, right) => String(left).localeCompare(String(right)));
    let databaseStat: Awaited<ReturnType<typeof fsp.lstat>> | null;
    try {
      databaseStat = await fsp.lstat(this.location.databasePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        return this.closed("UNAVAILABLE", orderedIds);
      }
      databaseStat = null;
    }
    const key = await this.rootKeyFile.inspectExisting();
    if (key.state === "UNSAFE") return this.closed("LOCKED", orderedIds);
    if (!databaseStat) {
      key.state === "VALID" && key.key.fill(0);
      return this.initializationRequired(orderedIds);
    }
    if (databaseStat.isSymbolicLink() || !databaseStat.isFile()) {
      key.state === "VALID" && key.key.fill(0);
      return this.closed("UNAVAILABLE", orderedIds);
    }

    let database: DatabaseSync | null = null;
    try {
      database = openReadOnlyVaultDatabase(this.location.databasePath);
      const tableNames = presentSecretVaultTables(database);
      if (tableNames.size === 0) {
        key.state === "VALID" && key.key.fill(0);
        return this.initializationRequired(orderedIds);
      }
      if (
        !tableNames.has("secret_entries")
        || !tableNames.has("secret_encryption_metadata")
        || !hasRequiredSecretVaultColumns(database, "secret_entries")
        || !hasRequiredSecretVaultColumns(database, "secret_encryption_metadata")
      ) {
        key.state === "VALID" && key.key.fill(0);
        return this.closed("CORRUPT", orderedIds);
      }

      const entryCount = Number(
        (database.prepare("SELECT COUNT(*) AS count FROM secret_entries").get() as { count: number }).count,
      );
      const metadataRows = database.prepare(SECRET_VAULT_METADATA_ROWS_QUERY)
        .all() as SecretVaultMetadataRow[];
      if (metadataRows.length === 0 && entryCount === 0) {
        key.state === "VALID" && key.key.fill(0);
        return this.initializationRequired(orderedIds);
      }
      if (metadataRows.length !== 1) {
        key.state === "VALID" && key.key.fill(0);
        return this.closed("CORRUPT", orderedIds);
      }
      const metadata = metadataRows[0];
      if (metadata.singleton_id !== 1) {
        key.state === "VALID" && key.key.fill(0);
        return this.closed("CORRUPT", orderedIds);
      }
      if (metadata.encryption_format_version !== SECRET_VAULT_ENCRYPTION_FORMAT_VERSION) {
        key.state === "VALID" && key.key.fill(0);
        return this.closed("INCOMPATIBLE", orderedIds);
      }
      const domain = Buffer.from(metadata.encryption_domain_id);
      const nonce = Buffer.from(metadata.verifier_nonce);
      const ciphertext = Buffer.from(metadata.verifier_ciphertext);
      const tag = Buffer.from(metadata.verifier_authentication_tag);
      if (
        domain.length !== SECRET_VAULT_DOMAIN_ID_BYTES
        || nonce.length !== SECRET_VAULT_NONCE_BYTES
        || tag.length !== SECRET_VAULT_TAG_BYTES
        || ciphertext.length === 0
      ) {
        key.state === "VALID" && key.key.fill(0);
        return this.closed("CORRUPT", orderedIds);
      }
      if (key.state !== "VALID") return this.closed("LOCKED", orderedIds);
      try {
        if (!verifyVaultVerifier(key.key, domain, metadata.encryption_format_version, {
          nonce,
          ciphertext,
          authenticationTag: tag,
        })) {
          return this.closed("CORRUPT", orderedIds);
        }
      } finally {
        key.key.fill(0);
      }

      const configuredStatement = database.prepare(
        "SELECT 1 AS configured FROM secret_entries WHERE secret_id = ? LIMIT 1",
      );
      const entries = orderedIds.map((id) => {
        const configured = Boolean(configuredStatement.get(String(id)));
        return {
          secretId: id,
          observedStatus: configured ? "CONFIGURED" : "MISSING",
          plannedAction: configured
            ? overwrite ? "REPLACE" : "SKIP_CONFIGURED"
            : "CREATE",
        } as const;
      });
      return this.result("READY", entries);
    } catch {
      key.state === "VALID" && key.key.fill(0);
      return this.closed("UNAVAILABLE", orderedIds);
    } finally {
      database?.close();
    }
  }

  private initializationRequired(secretIds: ReadonlyArray<SecretId>): ImportTargetInspection {
    return this.result("INITIALIZATION_REQUIRED", secretIds.map((id) => ({
      secretId: id,
      observedStatus: "MISSING" as const,
      plannedAction: "CREATE" as const,
    })));
  }

  private closed(
    state: Exclude<ImportTargetState, "READY" | "INITIALIZATION_REQUIRED">,
    secretIds: ReadonlyArray<SecretId>,
  ): ImportTargetInspection {
    return this.result(state, secretIds.map((id) => ({
      secretId: id,
      observedStatus: "UNAVAILABLE" as const,
      plannedAction: "BLOCKED" as const,
    })));
  }

  private result(
    targetState: ImportTargetState,
    entries: ImportTargetInspection["entries"],
  ): ImportTargetInspection {
    return {
      targetIdentity: this.location.databasePath,
      targetState,
      entries,
      counts: {
        create: entries.filter((entry) => entry.plannedAction === "CREATE").length,
        skipConfigured: entries.filter((entry) => entry.plannedAction === "SKIP_CONFIGURED").length,
        replace: entries.filter((entry) => entry.plannedAction === "REPLACE").length,
        blocked: entries.filter((entry) => entry.plannedAction === "BLOCKED").length,
      },
      instructionCode: instructionFor(targetState),
    };
  }
}
