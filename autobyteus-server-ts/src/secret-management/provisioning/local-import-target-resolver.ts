import { userInfo } from 'node:os';
import path from 'node:path';
import type { LocalStoreConfiguration } from '../backends/local/local-secret-store-initializer.js';
import type { LocalLegacyEnvironmentImportTarget } from './local-legacy-environment-import.js';

export interface LocalImportTargetResolver {
  resolve(target: LocalLegacyEnvironmentImportTarget): LocalStoreConfiguration;
}

export class CanonicalHostLocalImportTargetResolver implements LocalImportTargetResolver {
  resolve(target: LocalLegacyEnvironmentImportTarget): LocalStoreConfiguration {
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
