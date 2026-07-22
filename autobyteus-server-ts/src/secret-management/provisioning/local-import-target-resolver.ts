import { userInfo } from 'node:os';
import path from 'node:path';
import type { LocalStoreConfiguration } from '../backends/local/local-secret-store-initializer.js';
import type { LocalEnvironmentSecretImportTarget } from './local-environment-secret-import.js';

export interface LocalImportTargetResolver {
  resolve(target: LocalEnvironmentSecretImportTarget): LocalStoreConfiguration;
}

export class CanonicalHostLocalImportTargetResolver implements LocalImportTargetResolver {
  resolve(target: LocalEnvironmentSecretImportTarget): LocalStoreConfiguration {
    const storeRoot = path.join(userInfo().homedir, '.autobyteus', 'server-data', 'secret-store');
    const baseName = target === 'default' ? 'secret-store' : 'real-e2e-secret-store';
    return {
      kind: 'local-store',
      databasePath: path.join(storeRoot, `${baseName}.db`),
      keyPath: path.join(storeRoot, `${baseName}.key`),
      accessMode: 'READ_WRITE',
    };
  }
}
