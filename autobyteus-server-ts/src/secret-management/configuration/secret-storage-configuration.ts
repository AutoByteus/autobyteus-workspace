import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { LocalStoreConfiguration } from '../backends/local/local-secret-store-initializer.js';
import { SecretStorageError } from '../domain/secret-storage-types.js';

const baseConfigurationSchema = z.object({
  version: z.literal(1),
  kind: z.string().min(1),
}).passthrough();

const localConfigurationSchema = z.object({
  version: z.literal(1),
  kind: z.literal('LOCAL'),
  databasePath: z.string().min(1),
  keyPath: z.string().min(1),
  accessMode: z.enum(['READ_WRITE', 'READ_ONLY']),
  sharedWritableReplicaCount: z.literal(1).optional(),
}).strict();

export type PersistedSecretStorageConfiguration = z.infer<typeof baseConfigurationSchema>;

export const defaultLocalStoreConfiguration = (serverDataDir: string): LocalStoreConfiguration => {
  const directory = path.join(path.resolve(serverDataDir), 'secret-store');
  return {
    kind: 'local-store',
    databasePath: path.join(directory, 'secret-store.db'),
    keyPath: path.join(directory, 'secret-store.key'),
    accessMode: 'READ_WRITE',
  };
};

export const loadSecretStorageConfiguration = (input: {
  serverDataDir: string;
  configurationFile?: string | null;
}): { selectedKind: string; local: LocalStoreConfiguration | null } => {
  if (!input.configurationFile) {
    return { selectedKind: 'LOCAL', local: defaultLocalStoreConfiguration(input.serverDataDir) };
  }

  const configurationFile = path.resolve(input.configurationFile);
  let parsed: PersistedSecretStorageConfiguration | z.infer<typeof localConfigurationSchema>;
  try {
    const raw = baseConfigurationSchema.parse(JSON.parse(fs.readFileSync(configurationFile, 'utf8')));
    parsed = raw.kind === 'LOCAL' ? localConfigurationSchema.parse(raw) : raw;
  } catch (cause) {
    throw new SecretStorageError('INVALID_BACKEND_CONFIG', false, 'SECRET_BACKEND_CONFIG_INVALID', { cause });
  }

  if (parsed.kind !== 'LOCAL') return { selectedKind: parsed.kind, local: null };
  const local = localConfigurationSchema.parse(parsed);
  return {
    selectedKind: 'LOCAL',
    local: {
      kind: 'local-store',
      databasePath: path.resolve(path.dirname(configurationFile), local.databasePath),
      keyPath: path.resolve(path.dirname(configurationFile), local.keyPath),
      accessMode: local.accessMode,
    },
  };
};
