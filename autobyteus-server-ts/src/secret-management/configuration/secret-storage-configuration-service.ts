import type { SecretManagementService } from '../services/secret-management-service.js';
import path from 'node:path';
import type { SecretBackendHealth } from '../domain/secret-storage-types.js';
import { SecretStorageError } from '../domain/secret-storage-types.js';
import type { SecretStorageBackend } from '../backends/secret-storage-backend.js';
import { openLocalSecretStorageBackend } from '../backends/local/local-secret-storage-backend.js';
import {
  loadSecretStorageConfiguration,
  type PersistedSecretStorageConfiguration,
} from './secret-storage-configuration.js';
import { SecretManagementService as ManagementService } from '../services/secret-management-service.js';
import { configureFileToolDeniedPaths } from 'autobyteus-ts/tools/file/workspace-path-utils.js';

export type SecretStorageConfigurationSnapshot = {
  selectedKind: string;
  health: SecretBackendHealth;
  lifecycle: { kind: 'WRITABLE' } | { kind: 'EXTERNALLY_MANAGED'; instructionCode: string } | null;
  assurance: 'LOCAL_HARDENED';
  restartRequired: boolean;
};

export class SecretStorageConfigurationService {
  private backend: SecretStorageBackend | null = null;
  private managementService: SecretManagementService | null = null;
  private selectedKind = 'LOCAL';
  private currentHealth: SecretBackendHealth = {
    state: 'UNAVAILABLE',
    instructionCode: 'SECRET_BACKEND_UNAVAILABLE',
  };
  private restartRequired = false;

  async bootstrap(input: { serverDataDir: string; configurationFile?: string | null }): Promise<void> {
    let configuration: ReturnType<typeof loadSecretStorageConfiguration>;
    try {
      configuration = loadSecretStorageConfiguration(input);
    } catch {
      this.currentHealth = {
        state: 'UNAVAILABLE',
        instructionCode: 'SECRET_BACKEND_UNAVAILABLE',
      };
      return;
    }
    this.selectedKind = configuration.selectedKind;
    if (!configuration.local) {
      this.currentHealth = {
        state: 'UNAVAILABLE',
        instructionCode: 'SECRET_BACKEND_KIND_NOT_INSTALLED',
      };
      return;
    }
    configureFileToolDeniedPaths([
      path.dirname(configuration.local.databasePath),
      path.dirname(configuration.local.keyPath),
      configuration.local.databasePath,
      configuration.local.keyPath,
      `${configuration.local.databasePath}-wal`,
      `${configuration.local.databasePath}-shm`,
      `${configuration.local.databasePath}-journal`,
    ]);
    this.backend = await openLocalSecretStorageBackend(configuration.local);
    this.managementService = new ManagementService(this.backend);
    this.currentHealth = await this.backend.health();
  }

  async snapshot(): Promise<SecretStorageConfigurationSnapshot> {
    const health = this.backend ? await this.backend.health() : this.currentHealth;
    return {
      selectedKind: this.selectedKind,
      health,
      lifecycle: this.backend?.lifecycle ?? null,
      assurance: 'LOCAL_HARDENED',
      restartRequired: this.restartRequired,
    };
  }

  requireManagementService(): SecretManagementService {
    if (!this.managementService) {
      throw new SecretStorageError('BACKEND_UNAVAILABLE', false, 'SECRET_BACKEND_KIND_NOT_INSTALLED');
    }
    return this.managementService;
  }

  markPersistedConfigurationChanged(_configuration: PersistedSecretStorageConfiguration): void {
    this.restartRequired = true;
  }

  async close(): Promise<void> {
    await this.backend?.close();
    this.backend = null;
    this.managementService = null;
  }
}

let singleton: SecretStorageConfigurationService | null = null;

export const getSecretStorageConfigurationService = (): SecretStorageConfigurationService => {
  singleton ??= new SecretStorageConfigurationService();
  return singleton;
};

export const resetSecretStorageConfigurationServiceForTests = async (): Promise<void> => {
  await singleton?.close();
  singleton = null;
};
