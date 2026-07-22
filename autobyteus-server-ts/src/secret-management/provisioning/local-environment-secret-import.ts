import type { SecretDefinitionId } from '../domain/secret-binding.js';
import type { SecretBackendHealth } from '../domain/secret-storage-types.js';

export type LocalEnvironmentSecretImportTarget = 'default' | 'e2e';

export type LocalEnvironmentSecretImportRequest = {
  sourceAbsolutePath: string;
  target: LocalEnvironmentSecretImportTarget;
  dryRun: boolean;
  overwrite: boolean;
};

export type LocalEnvironmentSecretImportAction =
  | 'CREATE'
  | 'SKIPPED_CONFIGURED'
  | 'REPLACE';

export type LocalEnvironmentSecretImportPlanEntry = {
  definitionId: SecretDefinitionId;
  action: LocalEnvironmentSecretImportAction;
};

export type NonReadySecretBackendHealth = Exclude<SecretBackendHealth, { state: 'READY' }>;

export type LocalEnvironmentSecretImportTargetStatus =
  | { state: 'READY' }
  | {
      state: 'INITIALIZATION_REQUIRED';
      instructionCode: 'LOCAL_IMPORT_TARGET_INITIALIZATION_REQUIRED';
    }
  | NonReadySecretBackendHealth;

export type LocalEnvironmentSecretImportPlan = {
  targetStatus: LocalEnvironmentSecretImportTargetStatus;
  entries: LocalEnvironmentSecretImportPlanEntry[];
};

export type LocalEnvironmentSecretImportResult = {
  targetStatus: LocalEnvironmentSecretImportTargetStatus;
  definitionIds: SecretDefinitionId[];
  configuredCount: number;
  skippedCount: number;
  replacedCount: number;
  instructionCode: 'NONE' | 'RESTART_REQUIRED' | 'RUN_REAL_E2E_PREFLIGHT';
};

export type LocalEnvironmentSecretImportErrorCode =
  | 'IMPORT_OPTIONS_INVALID'
  | 'IMPORT_SOURCE_PATH_INVALID'
  | 'IMPORT_SOURCE_UNTRUSTED'
  | 'IMPORT_SOURCE_RACED'
  | 'IMPORT_SOURCE_TOO_LARGE'
  | 'IMPORT_SOURCE_ENCODING_INVALID'
  | 'IMPORT_SOURCE_SYNTAX_INVALID'
  | 'IMPORT_SOURCE_DUPLICATE_ASSIGNMENT'
  | 'IMPORT_SOURCE_EMPTY_CREDENTIAL'
  | 'IMPORT_NO_MAPPED_CREDENTIALS'
  | 'IMPORT_MAPPING_INVALID'
  | 'IMPORT_TARGET_INITIALIZATION_FAILED'
  | 'IMPORT_TARGET_NOT_READY'
  | 'IMPORT_TARGET_CHANGED'
  | 'IMPORT_CONFIRMATION_REQUIRED'
  | 'IMPORT_CANCELLED'
  | 'IMPORT_BATCH_FAILED';

export class LocalEnvironmentSecretImportError extends Error {
  constructor(
    readonly code: LocalEnvironmentSecretImportErrorCode,
    readonly target?: LocalEnvironmentSecretImportTarget,
  ) {
    super(code);
    this.name = 'LocalEnvironmentSecretImportError';
  }

  toJSON(): { code: LocalEnvironmentSecretImportErrorCode; target?: LocalEnvironmentSecretImportTarget } {
    return this.target ? { code: this.code, target: this.target } : { code: this.code };
  }
}
