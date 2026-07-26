import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { SecretId } from "../domain/secret-id.js";

export const SECRET_VAULT_ENCRYPTION_FORMAT_VERSION = 1;
export const SECRET_VAULT_ROOT_KEY_BYTES = 32;
export const SECRET_VAULT_DOMAIN_ID_BYTES = 16;
export const SECRET_VAULT_NONCE_BYTES = 12;
export const SECRET_VAULT_TAG_BYTES = 16;

const VERIFIER_INFO = Buffer.from("autobyteus/secret-vault/verifier/v1", "utf8");
const ENTRY_INFO_PREFIX = "autobyteus/secret-vault/entry/v1";
const VERIFIER_PLAINTEXT = Buffer.from("autobyteus-secret-vault-verifier-v1", "utf8");

export type SecretVaultEncryptedPayload = {
  nonce: Buffer;
  ciphertext: Buffer;
  authenticationTag: Buffer;
};

const encodeParts = (parts: ReadonlyArray<string | number | Uint8Array>): Buffer => {
  const chunks: Buffer[] = [];
  for (const part of parts) {
    const bytes = typeof part === "number"
      ? Buffer.from(String(part), "utf8")
      : typeof part === "string"
        ? Buffer.from(part, "utf8")
        : Buffer.from(part);
    const length = Buffer.allocUnsafe(4);
    length.writeUInt32BE(bytes.length);
    chunks.push(length, bytes);
  }
  return Buffer.concat(chunks);
};

const deriveKey = (
  rootKey: Uint8Array,
  encryptionDomainId: Uint8Array,
  info: Uint8Array,
): Buffer => Buffer.from(hkdfSync("sha256", rootKey, encryptionDomainId, info, 32));

const encrypt = (
  key: Uint8Array,
  plaintext: Uint8Array,
  aad: Uint8Array,
): SecretVaultEncryptedPayload => {
  const nonce = randomBytes(SECRET_VAULT_NONCE_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, nonce, {
    authTagLength: SECRET_VAULT_TAG_BYTES,
  });
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { nonce, ciphertext, authenticationTag: cipher.getAuthTag() };
};

const decrypt = (
  key: Uint8Array,
  payload: SecretVaultEncryptedPayload,
  aad: Uint8Array,
): Buffer => {
  const decipher = createDecipheriv("aes-256-gcm", key, payload.nonce, {
    authTagLength: SECRET_VAULT_TAG_BYTES,
  });
  decipher.setAAD(aad);
  decipher.setAuthTag(payload.authenticationTag);
  return Buffer.concat([decipher.update(payload.ciphertext), decipher.final()]);
};

const verifierAad = (
  encryptionDomainId: Uint8Array,
  formatVersion: number,
): Buffer => encodeParts([
  "autobyteus/secret-vault/verifier-aad/v1",
  formatVersion,
  encryptionDomainId,
]);

const entryAad = (
  encryptionDomainId: Uint8Array,
  formatVersion: number,
  id: SecretId,
): Buffer => encodeParts([
  "autobyteus/secret-vault/entry-aad/v1",
  formatVersion,
  encryptionDomainId,
  String(id),
]);

export const createVaultVerifier = (
  rootKey: Uint8Array,
  encryptionDomainId: Uint8Array,
  formatVersion = SECRET_VAULT_ENCRYPTION_FORMAT_VERSION,
): SecretVaultEncryptedPayload => {
  const key = deriveKey(rootKey, encryptionDomainId, VERIFIER_INFO);
  try {
    return encrypt(key, VERIFIER_PLAINTEXT, verifierAad(encryptionDomainId, formatVersion));
  } finally {
    key.fill(0);
  }
};

export const verifyVaultVerifier = (
  rootKey: Uint8Array,
  encryptionDomainId: Uint8Array,
  formatVersion: number,
  payload: SecretVaultEncryptedPayload,
): boolean => {
  const key = deriveKey(rootKey, encryptionDomainId, VERIFIER_INFO);
  try {
    const plaintext = decrypt(key, payload, verifierAad(encryptionDomainId, formatVersion));
    try {
      return plaintext.length === VERIFIER_PLAINTEXT.length
        && timingSafeEqual(plaintext, VERIFIER_PLAINTEXT);
    } finally {
      plaintext.fill(0);
    }
  } catch {
    return false;
  } finally {
    key.fill(0);
  }
};

export const encryptSecretEntry = (
  rootKey: Uint8Array,
  encryptionDomainId: Uint8Array,
  id: SecretId,
  plaintext: Uint8Array,
  formatVersion = SECRET_VAULT_ENCRYPTION_FORMAT_VERSION,
): SecretVaultEncryptedPayload => {
  const info = encodeParts([ENTRY_INFO_PREFIX, String(id)]);
  const key = deriveKey(rootKey, encryptionDomainId, info);
  try {
    return encrypt(key, plaintext, entryAad(encryptionDomainId, formatVersion, id));
  } finally {
    key.fill(0);
    info.fill(0);
  }
};

export const decryptSecretEntry = (
  rootKey: Uint8Array,
  encryptionDomainId: Uint8Array,
  id: SecretId,
  payload: SecretVaultEncryptedPayload,
  formatVersion = SECRET_VAULT_ENCRYPTION_FORMAT_VERSION,
): Buffer => {
  const info = encodeParts([ENTRY_INFO_PREFIX, String(id)]);
  const key = deriveKey(rootKey, encryptionDomainId, info);
  try {
    return decrypt(key, payload, entryAad(encryptionDomainId, formatVersion, id));
  } finally {
    key.fill(0);
    info.fill(0);
  }
};
