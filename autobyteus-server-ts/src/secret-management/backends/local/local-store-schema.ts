export const LOCAL_STORE_SCHEMA_VERSION = 1;
export const LOCAL_STORE_ENCRYPTION_FORMAT_VERSION = 1;
export const LOCAL_STORE_PAIR_VERIFIER_FORMAT_VERSION = 1;

export const LOCAL_STORE_SCHEMA_SQL = `
  CREATE TABLE store_metadata (
    singleton_id INTEGER PRIMARY KEY CHECK(singleton_id = 1),
    schema_version INTEGER NOT NULL,
    encryption_format_version INTEGER NOT NULL,
    pair_verifier_format_version INTEGER NOT NULL,
    store_id BLOB NOT NULL,
    pair_verifier_nonce BLOB NOT NULL,
    pair_verifier_ciphertext BLOB NOT NULL,
    pair_verifier_tag BLOB NOT NULL
  ) STRICT;

  CREATE TABLE secret_records (
    definition_id TEXT PRIMARY KEY,
    nonce BLOB NOT NULL,
    ciphertext BLOB NOT NULL
  ) STRICT;
`;

export type LocalStoreMetadataRow = {
  schema_version: number;
  encryption_format_version: number;
  pair_verifier_format_version: number;
  store_id: Uint8Array;
  pair_verifier_nonce: Uint8Array;
  pair_verifier_ciphertext: Uint8Array;
  pair_verifier_tag: Uint8Array;
};
