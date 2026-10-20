import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  createVaultVerifier,
  encryptSecretEntry,
  SECRET_VAULT_DOMAIN_ID_BYTES,
  SECRET_VAULT_ENCRYPTION_FORMAT_VERSION,
  SECRET_VAULT_ROOT_KEY_BYTES,
} from '../../autobyteus-ts/src/secrets/vault/secret-vault-crypto.js';
import { secretId } from '../../autobyteus-ts/src/secrets/vault/secret-id.js';
import { TEST_VAULT_DATABASE_FILE_NAME } from '../../autobyteus-ts/src/secrets/vault/test-vault-location.js';

/*
 * Tests only: writes a minimal test vault (the two secret tables, a root key,
 * synthetic values) without Prisma or migrations, for read-path tests. Real
 * vaults are created only by `pnpm test-vault setup`.
 */

const VAULT_TABLES = `
  CREATE TABLE secret_entries (
    secret_id TEXT NOT NULL PRIMARY KEY,
    nonce BLOB NOT NULL,
    ciphertext BLOB NOT NULL,
    authentication_tag BLOB NOT NULL
  );
  CREATE TABLE secret_encryption_metadata (
    singleton_id INTEGER NOT NULL PRIMARY KEY,
    encryption_domain_id BLOB NOT NULL,
    encryption_format_version INTEGER NOT NULL,
    verifier_nonce BLOB NOT NULL,
    verifier_ciphertext BLOB NOT NULL,
    verifier_authentication_tag BLOB NOT NULL
  );
`;

export type SyntheticTestVault = Readonly<{
  directory: string;
  databasePath: string;
  rootKeyPath: string;
}>;

/** Creates `<directory>/test-vault.db` + key holding `secrets` (secret ID → synthetic value). */
export const createSyntheticTestVault = (
  directory: string,
  secrets: Readonly<Record<string, string>>,
): SyntheticTestVault => {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const databasePath = path.join(directory, TEST_VAULT_DATABASE_FILE_NAME);
  const rootKeyPath = `${databasePath}.secret.key`;
  const rootKey = randomBytes(SECRET_VAULT_ROOT_KEY_BYTES);
  const domain = randomBytes(SECRET_VAULT_DOMAIN_ID_BYTES);
  const database = new DatabaseSync(databasePath);
  try {
    database.exec(VAULT_TABLES);
    const verifier = createVaultVerifier(rootKey, domain);
    database.prepare(`
      INSERT INTO secret_encryption_metadata (
        singleton_id, encryption_domain_id, encryption_format_version,
        verifier_nonce, verifier_ciphertext, verifier_authentication_tag
      ) VALUES (1, ?, ?, ?, ?, ?)
    `).run(domain, SECRET_VAULT_ENCRYPTION_FORMAT_VERSION, verifier.nonce, verifier.ciphertext, verifier.authenticationTag);
    const insert = database.prepare(
      'INSERT INTO secret_entries (secret_id, nonce, ciphertext, authentication_tag) VALUES (?, ?, ?, ?)',
    );
    for (const [id, value] of Object.entries(secrets)) {
      const payload = encryptSecretEntry(rootKey, domain, secretId(id), Buffer.from(value, 'utf8'));
      insert.run(id, payload.nonce, payload.ciphertext, payload.authenticationTag);
    }
  } finally {
    database.close();
  }
  fs.writeFileSync(rootKeyPath, rootKey, { mode: 0o600 });
  rootKey.fill(0);
  if (process.platform !== 'win32') {
    fs.chmodSync(databasePath, 0o600);
    fs.chmodSync(rootKeyPath, 0o600);
  }
  return { directory, databasePath, rootKeyPath };
};
