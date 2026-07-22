import type { SecretDefinitionId } from '../domain/secret-binding.js';
import type { SecretBackendHealth } from '../domain/secret-storage-types.js';

export type LocalLegacyEnvironmentImportTarget = 'default' | 'e2e';

export type LocalLegacyEnvironmentImportRequest = {
  sourceAbsolutePath: string;
  target: LocalLegacyEnvironmentImportTarget;
  dryRun: boolean;
  overwrite: boolean;
};

export type LocalLegacyEnvironmentImportAction =
  | 'CREATE'
  | 'SKIPPED_CONFIGURED'
  | 'REPLACE';

export type LocalLegacyEnvironmentImportPlanEntry = {
  definitionId: SecretDefinitionId;
  action: LocalLegacyEnvironmentImportAction;
};

export type NonReadySecretBackendHealth = Exclude<SecretBackendHealth, { state: 'READY' }>;

export type LocalLegacyEnvironmentImportTargetStatus =
  | { state: 'READY' }
  | {
      state: 'INITIALIZATION_REQUIRED';
      instructionCode: 'LOCAL_IMPORT_TARGET_INITIALIZATION_REQUIRED';
    }
  | NonReadySecretBackendHealth;

export type LocalLegacyEnvironmentImportPlan = {
  targetStatus: LocalLegacyEnvironmentImportTargetStatus;
  entries: LocalLegacyEnvironmentImportPlanEntry[];
};

export type LocalLegacyEnvironmentImportResult = {
  targetStatus: LocalLegacyEnvironmentImportTargetStatus;
  definitionIds: SecretDefinitionId[];
  configuredCount: number;
  skippedCount: number;
  replacedCount: number;
  instructionCode: 'NONE' | 'RESTART_REQUIRED' | 'RUN_REAL_E2E_PREFLIGHT';
};

export type LocalLegacyEnvironmentImportErrorCode =
  | 'IMPORT_OPTIONS_INVALID'
  | 'IMPORT_SOURCE_PATH_INVALID'
  | 'IMPORT_SOURCE_UNTRUSTED'
  | 'IMPORT_SOURCE_RACED'
  | 'IMPORT_SOURCE_TOO_LARGE'
  | 'IMPORT_SOURCE_ENCODING_INVALID'
  | 'IMPORT_SOURCE_SYNTAX_INVALID'
  | 'IMPORT_SOURCE_DUPLICATE_ASSIGNMENT'
  | 'IMPORT_SOURCE_EMPTY_CREDENTIAL'
  | 'IMPORT_SOURCE_ALIAS_CONFLICT'
  | 'IMPORT_SOURCE_UNSUPPORTED_SECRET_ALIAS'
  | 'IMPORT_NO_MAPPED_CREDENTIALS'
  | 'IMPORT_MAPPING_INVALID'
  | 'IMPORT_TARGET_INITIALIZATION_FAILED'
  | 'IMPORT_TARGET_NOT_READY'
  | 'IMPORT_TARGET_CHANGED'
  | 'IMPORT_CONFIRMATION_REQUIRED'
  | 'IMPORT_CANCELLED'
  | 'IMPORT_BATCH_FAILED';

export class LocalLegacyEnvironmentImportError extends Error {
  constructor(
    readonly code: LocalLegacyEnvironmentImportErrorCode,
    readonly target?: LocalLegacyEnvironmentImportTarget,
  ) {
    super(code);
    this.name = 'LocalLegacyEnvironmentImportError';
  }

  toJSON(): { code: LocalLegacyEnvironmentImportErrorCode; target?: LocalLegacyEnvironmentImportTarget } {
    return this.target ? { code: this.code, target: this.target } : { code: this.code };
  }
}
