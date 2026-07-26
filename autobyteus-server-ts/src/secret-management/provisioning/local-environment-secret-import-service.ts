import path from 'node:path';
import { SecretValue } from 'autobyteus-ts/secrets/secret-value.js';
import type { ApplicationDatabaseLocation } from '../../config/application-database-location.js';
import { runMigrations } from '../../startup/migrations.js';
import { providerCredentialCatalog } from '../catalog/provider-credential-catalog.js';
import { SecretVaultRuntime } from '../secret-vault-runtime.js';
import { SecretVaultInspectionService } from '../services/secret-vault-inspection-service.js';
import {
  LocalEnvironmentSourceReader,
  type LocalEnvironmentSourceReadResult,
} from './local-environment-source-reader.js';
import {
  LocalEnvironmentSecretImportError,
  type LocalEnvironmentSecretImportPlan,
  type LocalEnvironmentSecretImportRequest,
  type LocalEnvironmentSecretImportResult,
} from './local-environment-secret-import.js';

export interface LocalImportConfirmationPort {
  isDirectTty(): boolean;
  readChallenge(expectedPhrase: string, targetIdentity: string): Promise<string | null>;
}

type ExecutionRuntime = {
  runtime: SecretVaultRuntime;
  close(): Promise<void>;
};

export type LocalImportExecutionRuntimeFactory = () => Promise<ExecutionRuntime>;

export class LocalEnvironmentSecretImportService {
  private readonly inspector: SecretVaultInspectionService;

  constructor(
    private readonly location: ApplicationDatabaseLocation,
    private readonly sourceReader = new LocalEnvironmentSourceReader(),
    inspector = new SecretVaultInspectionService(location),
    private readonly executionRuntimeFactory: LocalImportExecutionRuntimeFactory = async () => {
      runMigrations();
      const runtime = new SecretVaultRuntime();
      await runtime.initialize(location);
      return { runtime, close: () => runtime.close() };
    },
  ) {
    this.inspector = inspector;
  }

  async preview(request: LocalEnvironmentSecretImportRequest): Promise<LocalEnvironmentSecretImportPlan> {
    this.validateRequest(request);
    if (!request.dryRun) throw new LocalEnvironmentSecretImportError('IMPORT_OPTIONS_INVALID');
    const source = await this.sourceReader.read(request.sourceAbsolutePath);
    try {
      return await this.inspectSource(source, request.overwrite);
    } finally {
      source.release();
    }
  }

  async execute(
    request: LocalEnvironmentSecretImportRequest,
    confirmation: LocalImportConfirmationPort,
  ): Promise<LocalEnvironmentSecretImportResult> {
    this.validateRequest(request);
    if (request.dryRun) throw new LocalEnvironmentSecretImportError('IMPORT_OPTIONS_INVALID');
    const source = await this.sourceReader.read(request.sourceAbsolutePath);
    try {
      const plan = await this.inspectSource(source, request.overwrite);
      if (plan.counts.blocked > 0) {
        throw new LocalEnvironmentSecretImportError('IMPORT_TARGET_NOT_READY');
      }
      await this.confirm(plan.targetIdentity, confirmation);
      const execution = await this.executionRuntimeFactory();
      try {
        const service = execution.runtime.requireService();
        const health = await service.getHealth();
        if (health.state !== 'READY') {
          throw new LocalEnvironmentSecretImportError('IMPORT_TARGET_CHANGED');
        }
        const inputs = source.credentials.map((credential) => ({
          secretId: credential.secretId,
          input: SecretValue.fromString(credential.valueBytes.toString('utf8')),
        }));
        const counts = await service.saveBatch(inputs, request.overwrite);
        return {
          targetIdentity: plan.targetIdentity,
          targetState: 'READY',
          secretIds: source.credentials.map((credential) => credential.secretId)
            .sort((left, right) => String(left).localeCompare(String(right))),
          ...counts,
          instructionCode: 'NONE',
        };
      } catch (error) {
        if (error instanceof LocalEnvironmentSecretImportError) throw error;
        throw new LocalEnvironmentSecretImportError('IMPORT_BATCH_FAILED');
      } finally {
        await execution.close();
      }
    } finally {
      source.release();
    }
  }

  private async inspectSource(
    source: LocalEnvironmentSourceReadResult,
    overwrite: boolean,
  ): Promise<LocalEnvironmentSecretImportPlan> {
    const secretIds = source.credentials.map((credential) => credential.secretId);
    if (
      new Set(secretIds.map(String)).size !== secretIds.length
      || secretIds.some((id) => !providerCredentialCatalog.isKnownSecretId(id))
    ) {
      throw new LocalEnvironmentSecretImportError('IMPORT_MAPPING_INVALID');
    }
    return this.inspector.inspectImportTarget(secretIds, overwrite);
  }

  private async confirm(
    targetIdentity: string,
    confirmation: LocalImportConfirmationPort,
  ): Promise<void> {
    if (!confirmation.isDirectTty()) {
      throw new LocalEnvironmentSecretImportError('IMPORT_CONFIRMATION_REQUIRED');
    }
    let response: string | null;
    try {
      response = await confirmation.readChallenge('IMPORT', targetIdentity);
    } catch {
      throw new LocalEnvironmentSecretImportError('IMPORT_CANCELLED');
    }
    if (response !== 'IMPORT') throw new LocalEnvironmentSecretImportError('IMPORT_CANCELLED');
  }

  private validateRequest(request: LocalEnvironmentSecretImportRequest): void {
    const keys = request && typeof request === 'object' ? Object.keys(request).sort() : [];
    const exactKeys = ['dryRun', 'overwrite', 'sourceAbsolutePath'];
    if (
      keys.length !== exactKeys.length
      || keys.some((key, index) => key !== exactKeys[index])
      || typeof request.sourceAbsolutePath !== 'string'
      || !path.isAbsolute(request.sourceAbsolutePath)
      || typeof request.dryRun !== 'boolean'
      || typeof request.overwrite !== 'boolean'
    ) {
      throw new LocalEnvironmentSecretImportError('IMPORT_OPTIONS_INVALID');
    }
  }
}
