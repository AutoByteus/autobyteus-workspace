import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import type { SecretDefinitionId } from '../../domain/secret-binding.js';
import {
  LOCAL_STORE_ENCRYPTION_FORMAT_VERSION,
  LOCAL_STORE_PAIR_VERIFIER_FORMAT_VERSION,
  LOCAL_STORE_SCHEMA_VERSION,
} from './local-store-schema.js';

const PAIR_INFO = Buffer.from('autobyteus/local-store/pair-verifier/v1', 'utf8');
const RECORD_INFO = Buffer.from('autobyteus/local-store/record/v1', 'utf8');
const PAIR_PLAINTEXT = Buffer.from('autobyteus-local-secret-store-pair-v1', 'utf8');
const EMPTY_SALT = Buffer.alloc(0);

export type LocalEncryptedPayload = {
  nonce: Buffer;
  ciphertext: Buffer;
  tag: Buffer;
};

const deriveKey = (rootKey: Uint8Array, salt: Uint8Array, info: Uint8Array): Buffer =>
  Buffer.from(hkdfSync('sha256', rootKey, salt, info, 32));

const encodeParts = (parts: Array<string | number | Uint8Array>): Buffer => {
  const encoded = parts.map((part) => {
    const bytes = typeof part === 'number'
      ? Buffer.from(String(part), 'utf8')
      : typeof part === 'string'
        ? Buffer.from(part, 'utf8')
        : Buffer.from(part);
    const length = Buffer.allocUnsafe(4);
    length.writeUInt32BE(bytes.length);
    return Buffer.concat([length, bytes]);
  });
  return Buffer.concat(encoded);
};

export const createPairVerifierAad = (storeId: Uint8Array): Buffer => encodeParts([
  'autobyteus/local-store/pair-aad/v1',
  LOCAL_STORE_SCHEMA_VERSION,
  LOCAL_STORE_ENCRYPTION_FORMAT_VERSION,
  LOCAL_STORE_PAIR_VERIFIER_FORMAT_VERSION,
  storeId,
]);

export const createRecordAad = (definitionId: SecretDefinitionId): Buffer => encodeParts([
  'autobyteus/local-store/record-aad/v1',
  LOCAL_STORE_ENCRYPTION_FORMAT_VERSION,
  String(definitionId),
]);

const encrypt = (key: Uint8Array, plaintext: Uint8Array, aad: Uint8Array): LocalEncryptedPayload => {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce, { authTagLength: 16 });
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { nonce, ciphertext, tag: cipher.getAuthTag() };
};

const decrypt = (
  key: Uint8Array,
  payload: LocalEncryptedPayload,
  aad: Uint8Array,
): Buffer => {
  const decipher = createDecipheriv('aes-256-gcm', key, payload.nonce, { authTagLength: 16 });
  decipher.setAAD(aad);
  decipher.setAuthTag(payload.tag);
  return Buffer.concat([decipher.update(payload.ciphertext), decipher.final()]);
};

export const createPairVerifier = (rootKey: Uint8Array, storeId: Uint8Array): LocalEncryptedPayload => {
  const key = deriveKey(rootKey, storeId, PAIR_INFO);
  try {
    return encrypt(key, PAIR_PLAINTEXT, createPairVerifierAad(storeId));
  } finally {
    key.fill(0);
  }
};

export const verifyPairVerifier = (
  rootKey: Uint8Array,
  storeId: Uint8Array,
  payload: LocalEncryptedPayload,
): boolean => {
  const key = deriveKey(rootKey, storeId, PAIR_INFO);
  try {
    const plaintext = decrypt(key, payload, createPairVerifierAad(storeId));
    try {
      return plaintext.length === PAIR_PLAINTEXT.length && timingSafeEqual(plaintext, PAIR_PLAINTEXT);
    } finally {
      plaintext.fill(0);
    }
  } catch {
    return false;
  } finally {
    key.fill(0);
  }
};

export const encryptSecretRecord = (
  rootKey: Uint8Array,
  definitionId: SecretDefinitionId,
  plaintext: Uint8Array,
): LocalEncryptedPayload => {
  const key = deriveKey(rootKey, EMPTY_SALT, RECORD_INFO);
  try {
    return encrypt(key, plaintext, createRecordAad(definitionId));
  } finally {
    key.fill(0);
  }
};

export const decryptSecretRecord = (
  rootKey: Uint8Array,
  definitionId: SecretDefinitionId,
  payload: LocalEncryptedPayload,
): Buffer => {
  const key = deriveKey(rootKey, EMPTY_SALT, RECORD_INFO);
  try {
    return decrypt(key, payload, createRecordAad(definitionId));
  } finally {
    key.fill(0);
  }
};
