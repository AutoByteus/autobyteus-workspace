import { DatabaseSync } from "node:sqlite";

/** The vault tables and the columns a direct `node:sqlite` reader relies on. */
export const SECRET_VAULT_REQUIRED_COLUMNS = Object.freeze({
  secret_entries: new Set([
    "secret_id",
    "nonce",
    "ciphertext",
    "authentication_tag",
  ]),
  secret_encryption_metadata: new Set([
    "singleton_id",
    "encryption_domain_id",
    "encryption_format_version",
    "verifier_nonce",
    "verifier_ciphertext",
    "verifier_authentication_tag",
  ]),
});

export type SecretVaultTableName = keyof typeof SECRET_VAULT_REQUIRED_COLUMNS;

export type SecretVaultMetadataRow = {
  singleton_id: number;
  encryption_domain_id: Uint8Array;
  encryption_format_version: number;
  verifier_nonce: Uint8Array;
  verifier_ciphertext: Uint8Array;
  verifier_authentication_tag: Uint8Array;
};

export const SECRET_VAULT_METADATA_ROWS_QUERY = `
  SELECT singleton_id, encryption_domain_id, encryption_format_version,
         verifier_nonce, verifier_ciphertext, verifier_authentication_tag
    FROM secret_encryption_metadata
   LIMIT 2
`;

/** Opens a vault database file strictly read-only (`readOnly` + `query_only`). */
export const openReadOnlyVaultDatabase = (databasePath: string): DatabaseSync => {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  database.exec("PRAGMA query_only=ON; PRAGMA busy_timeout=1000;");
  return database;
};

export const presentSecretVaultTables = (database: DatabaseSync): Set<string> => new Set(
  (database.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (?, ?)",
  ).all("secret_entries", "secret_encryption_metadata") as Array<{ name: string }>)
    .map((row) => row.name),
);

export const hasRequiredSecretVaultColumns = (
  database: DatabaseSync,
  table: SecretVaultTableName,
): boolean => {
  const columns = new Set(
    (database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>)
      .map((row) => row.name),
  );
  return [...SECRET_VAULT_REQUIRED_COLUMNS[table]].every((name) => columns.has(name));
};
