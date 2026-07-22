import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type { FileHandle } from 'node:fs/promises';
import { SecretStorageError } from '../../domain/secret-storage-types.js';
import {
  LOCAL_STORE_ENCRYPTION_FORMAT_VERSION,
  LOCAL_STORE_PAIR_VERIFIER_FORMAT_VERSION,
  LOCAL_STORE_SCHEMA_SQL,
  LOCAL_STORE_SCHEMA_VERSION,
  type LocalStoreMetadataRow,
} from './local-store-schema.js';
import { createPairVerifier, verifyPairVerifier } from './local-store-crypto.js';
import {
  assertPrivatePath,
  ensurePrivateDirectory,
  fsyncDirectory,
  fsyncFile,
  hardenPrivateFile,
} from './local-store-filesystem.js';

export type LocalStoreAccessMode = 'READ_WRITE' | 'READ_ONLY';

export type LocalStoreConfiguration = {
  kind: 'local-store';
  databasePath: string;
  keyPath: string;
  accessMode: LocalStoreAccessMode;
};

export type OpenLocalStore = {
  database: DatabaseSync;
  rootKey: Buffer;
  configuration: LocalStoreConfiguration;
};

export type LocalStorePairState = 'ABSENT' | 'PRESENT';

const corrupt = (cause?: unknown): SecretStorageError =>
  new SecretStorageError('CORRUPT_STORE', false, 'SECRET_BACKEND_CORRUPT', { cause });

const unavailable = (cause?: unknown): SecretStorageError =>
  new SecretStorageError('BACKEND_UNAVAILABLE', true, 'SECRET_BACKEND_UNAVAILABLE', { cause });

const locked = (cause?: unknown): SecretStorageError =>
  new SecretStorageError('BACKEND_LOCKED', true, 'SECRET_BACKEND_LOCKED', { cause });

const incompatible = (cause?: unknown): SecretStorageError =>
  new SecretStorageError('INCOMPATIBLE_STORE_FORMAT', false, 'SECRET_BACKEND_INCOMPATIBLE', { cause });

const asBuffer = (value: unknown): Buffer => {
  if (!(value instanceof Uint8Array)) throw corrupt();
  return Buffer.from(value);
};

const normalizeConfig = (configuration: LocalStoreConfiguration): LocalStoreConfiguration => {
  const databasePath = path.resolve(configuration.databasePath);
  const keyPath = path.resolve(configuration.keyPath);
  if (databasePath === keyPath) {
    throw new SecretStorageError('INVALID_BACKEND_CONFIG', false, 'SECRET_BACKEND_CONFIG_INVALID');
  }
  return { ...configuration, databasePath, keyPath };
};

const createDatabaseFile = (databasePath: string, rootKey: Buffer): void => {
  const database = new DatabaseSync(databasePath);
  try {
    database.exec('PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;');
    database.exec(LOCAL_STORE_SCHEMA_SQL);
    const storeId = randomBytes(16);
    const verifier = createPairVerifier(rootKey, storeId);
    database.prepare(`
      INSERT INTO store_metadata (
        singleton_id, schema_version, encryption_format_version,
        pair_verifier_format_version, store_id, pair_verifier_nonce,
        pair_verifier_ciphertext, pair_verifier_tag
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      LOCAL_STORE_SCHEMA_VERSION,
      LOCAL_STORE_ENCRYPTION_FORMAT_VERSION,
      LOCAL_STORE_PAIR_VERIFIER_FORMAT_VERSION,
      storeId,
      verifier.nonce,
      verifier.ciphertext,
      verifier.tag,
    );
  } finally {
    database.close();
  }
};

const createPair = async (configuration: LocalStoreConfiguration): Promise<void> => {
  const databaseDirectory = path.dirname(configuration.databasePath);
  const keyDirectory = path.dirname(configuration.keyPath);
  await ensurePrivateDirectory(databaseDirectory);
  await ensurePrivateDirectory(keyDirectory);

  const suffix = `${process.pid}-${randomUUID()}`;
  const temporaryDatabase = `${configuration.databasePath}.${suffix}.tmp`;
  const temporaryKey = `${configuration.keyPath}.${suffix}.tmp`;
  const rootKey = randomBytes(32);
  try {
    await fsp.writeFile(temporaryKey, rootKey, { flag: 'wx', mode: 0o600 });
    createDatabaseFile(temporaryDatabase, rootKey);
    await hardenPrivateFile(temporaryKey);
    await hardenPrivateFile(temporaryDatabase);
    await fsyncFile(temporaryKey);
    await fsyncFile(temporaryDatabase);

    await fsp.rename(temporaryKey, configuration.keyPath);
    await fsyncDirectory(keyDirectory);
    await fsp.rename(temporaryDatabase, configuration.databasePath);
    await fsyncDirectory(databaseDirectory);
  } finally {
    rootKey.fill(0);
    await Promise.allSettled([fsp.rm(temporaryKey, { force: true }), fsp.rm(temporaryDatabase, { force: true })]);
  }
};

const readAndValidateMetadata = (database: DatabaseSync, rootKey: Buffer): void => {
  let metadata: LocalStoreMetadataRow | undefined;
  try {
    metadata = database.prepare(`
      SELECT schema_version, encryption_format_version, pair_verifier_format_version,
             store_id, pair_verifier_nonce, pair_verifier_ciphertext, pair_verifier_tag
        FROM store_metadata WHERE singleton_id = 1
    `).get() as LocalStoreMetadataRow | undefined;
  } catch (cause) {
    throw corrupt(cause);
  }
  if (!metadata) throw corrupt();
  if (
    metadata.schema_version !== LOCAL_STORE_SCHEMA_VERSION
    || metadata.encryption_format_version !== LOCAL_STORE_ENCRYPTION_FORMAT_VERSION
    || metadata.pair_verifier_format_version !== LOCAL_STORE_PAIR_VERIFIER_FORMAT_VERSION
  ) {
    throw incompatible();
  }

  const storeId = asBuffer(metadata.store_id);
  const nonce = asBuffer(metadata.pair_verifier_nonce);
  const ciphertext = asBuffer(metadata.pair_verifier_ciphertext);
  const tag = asBuffer(metadata.pair_verifier_tag);
  if (storeId.length !== 16 || nonce.length !== 12 || tag.length !== 16 || ciphertext.length === 0) throw corrupt();
  if (!verifyPairVerifier(rootKey, storeId, { nonce, ciphertext, tag })) throw corrupt();
};

const configureWritableDatabase = (database: DatabaseSync): void => {
  try {
    database.exec('PRAGMA busy_timeout=2000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
  } catch (cause) {
    const code = (cause as { code?: string })?.code;
    if (code === 'ERR_SQLITE_ERROR' && /busy|locked/i.test(String((cause as Error)?.message))) throw locked(cause);
    throw unavailable(cause);
  }
};

export class LocalSecretStoreInitializer {
  static async inspectPairState(input: LocalStoreConfiguration): Promise<LocalStorePairState> {
    const configuration = normalizeConfig(input);
    const [databaseStat, keyStat] = await Promise.all([
      fsp.lstat(configuration.databasePath).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return null;
        throw unavailable(error);
      }),
      fsp.lstat(configuration.keyPath).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return null;
        throw unavailable(error);
      }),
    ]);
    if (Boolean(databaseStat) !== Boolean(keyStat)) throw corrupt();
    if (!databaseStat || !keyStat) return 'ABSENT';
    if (!databaseStat.isFile() || !keyStat.isFile()) throw corrupt();
    return 'PRESENT';
  }

  static async open(
    input: LocalStoreConfiguration,
    options: { initializeIfAbsent?: boolean } = {},
  ): Promise<OpenLocalStore> {
    const configuration = normalizeConfig(input);
    const pairState = await this.inspectPairState(configuration);
    if (pairState === 'ABSENT') {
      if (configuration.accessMode === 'READ_ONLY' || options.initializeIfAbsent === false) throw unavailable();
      await this.createUnderLock(configuration);
    }

    await assertPrivatePath(path.dirname(configuration.databasePath), 'directory');
    await assertPrivatePath(path.dirname(configuration.keyPath), 'directory');
    await assertPrivatePath(configuration.databasePath, 'file');
    await assertPrivatePath(configuration.keyPath, 'file');

    const rootKey = await fsp.readFile(configuration.keyPath);
    if (rootKey.length !== 32) {
      rootKey.fill(0);
      throw corrupt();
    }

    let database: DatabaseSync | null = null;
    try {
      database = new DatabaseSync(configuration.databasePath, {
        readOnly: configuration.accessMode === 'READ_ONLY',
      });
      readAndValidateMetadata(database, rootKey);
      if (configuration.accessMode === 'READ_WRITE') configureWritableDatabase(database);
      return { database, rootKey, configuration };
    } catch (cause) {
      database?.close();
      rootKey.fill(0);
      if (cause instanceof SecretStorageError) throw cause;
      throw unavailable(cause);
    }
  }

  private static async createUnderLock(configuration: LocalStoreConfiguration): Promise<void> {
    const lockPath = `${configuration.databasePath}.create.lock`;
    await ensurePrivateDirectory(path.dirname(configuration.databasePath));
    await ensurePrivateDirectory(path.dirname(configuration.keyPath));
    let lockHandle: FileHandle;
    try {
      lockHandle = await fsp.open(lockPath, 'wx', 0o600);
    } catch (cause) {
      throw locked(cause);
    }
    try {
      const databaseExists = fs.existsSync(configuration.databasePath);
      const keyExists = fs.existsSync(configuration.keyPath);
      if (databaseExists !== keyExists) throw corrupt();
      if (!databaseExists) await createPair(configuration);
    } finally {
      await lockHandle.close();
      await fsp.rm(lockPath, { force: true });
    }
  }
}
