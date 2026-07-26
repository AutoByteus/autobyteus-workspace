import type { ApplicationDatabaseLocation } from '../../config/application-database-location.js';
import type { SecretId } from '../domain/secret-id.js';
import type { ImportTargetInspection } from '../services/secret-vault-inspection-service.js';

export type ImportRequest = Readonly<{
  sourcePath: string;
  targetLocation: ApplicationDatabaseLocation;
  dryRun: boolean;
  overwrite: boolean;
}>;

export type LocalEnvironmentSecretImportPlan = ImportTargetInspection;

export type LocalEnvironmentSecretImportResult = {
  targetIdentity: string;
  targetState: 'READY';
  secretIds: SecretId[];
  configuredCount: number;
  skippedCount: number;
  replacedCount: number;
  instructionCode: 'NONE';
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
  | 'IMPORT_NO_MAPPED_CREDENTIALS'
  | 'IMPORT_MAPPING_INVALID'
  | 'IMPORT_TARGET_NOT_READY'
  | 'IMPORT_TARGET_CHANGED'
  | 'IMPORT_CONFIRMATION_REQUIRED'
  | 'IMPORT_CANCELLED'
  | 'IMPORT_BATCH_FAILED';

export class LocalEnvironmentSecretImportError extends Error {
  constructor(readonly code: LocalEnvironmentSecretImportErrorCode) {
    super(code);
    this.name = 'LocalEnvironmentSecretImportError';
  }

  toJSON(): { code: LocalEnvironmentSecretImportErrorCode } {
    return { code: this.code };
  }
}
