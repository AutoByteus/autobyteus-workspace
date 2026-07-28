import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SecretValue } from 'autobyteus-ts/secrets/secret-value.js';
import {
  ApplicationDatabaseLocation,
} from '../../config/application-database-location.js';
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
  type ImportRequest,
  type LocalEnvironmentSecretImportPlan,
  type LocalEnvironmentSecretImportResult,
} from './local-environment-secret-import.js';

export interface LocalImportConfirmationPort {
  isDirectTty(): boolean;
  readChallenge(
    expectedPhrase: string,
    targetLocation: ApplicationDatabaseLocation,
    plan: LocalEnvironmentSecretImportPlan,
  ): Promise<string | null>;
}

type ExecutionRuntime = {
  runtime: SecretVaultRuntime;
  close(): Promise<void>;
};

export type LocalImportInspectorFactory = (
  targetLocation: ApplicationDatabaseLocation,
) => Pick<SecretVaultInspectionService, 'inspectImportTarget'>;

export type LocalImportExecutionRuntimeFactory = (
  targetLocation: ApplicationDatabaseLocation,
) => Promise<ExecutionRuntime>;

const importerAppRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
);

export class LocalEnvironmentSecretImportService {
  constructor(
    private readonly sourceReader = new LocalEnvironmentSourceReader(),
    private readonly inspectorFactory: LocalImportInspectorFactory = (targetLocation) =>
      new SecretVaultInspectionService(targetLocation),
    private readonly executionRuntimeFactory: LocalImportExecutionRuntimeFactory = async (
      targetLocation,
    ) => {
      runMigrations({
        appRoot: importerAppRoot,
        databaseUrl: targetLocation.databaseUrl,
      });
      const runtime = new SecretVaultRuntime();
      await runtime.initialize(targetLocation);
      return { runtime, close: () => runtime.close() };
    },
  ) {}

  async preview(request: ImportRequest): Promise<LocalEnvironmentSecretImportPlan> {
    this.validateRequest(request);
    if (!request.dryRun) throw new LocalEnvironmentSecretImportError('IMPORT_OPTIONS_INVALID');
    const source = await this.sourceReader.read(request.sourcePath);
    try {
      return await this.inspectSource(source, request.targetLocation, request.overwrite);
    } finally {
      source.release();
    }
  }

  async execute(
    request: ImportRequest,
    confirmation: LocalImportConfirmationPort,
  ): Promise<LocalEnvironmentSecretImportResult> {
    this.validateRequest(request);
    if (request.dryRun) throw new LocalEnvironmentSecretImportError('IMPORT_OPTIONS_INVALID');
    const source = await this.sourceReader.read(request.sourcePath);
    try {
      const plan = await this.inspectSource(
        source,
        request.targetLocation,
        request.overwrite,
      );
      if (
        plan.targetIdentity !== request.targetLocation.databasePath
        || plan.counts.blocked > 0
      ) {
        throw new LocalEnvironmentSecretImportError('IMPORT_TARGET_NOT_READY');
      }
      await this.confirm(request.targetLocation, plan, confirmation);
      const execution = await this.executionRuntimeFactory(request.targetLocation);
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
    targetLocation: ApplicationDatabaseLocation,
    overwrite: boolean,
  ): Promise<LocalEnvironmentSecretImportPlan> {
    const secretIds = source.credentials.map((credential) => credential.secretId);
    if (
      new Set(secretIds.map(String)).size !== secretIds.length
      || secretIds.some((id) => !providerCredentialCatalog.isKnownSecretId(id))
    ) {
      throw new LocalEnvironmentSecretImportError('IMPORT_MAPPING_INVALID');
    }
    return this.inspectorFactory(targetLocation).inspectImportTarget(secretIds, overwrite);
  }

  private async confirm(
    targetLocation: ApplicationDatabaseLocation,
    plan: LocalEnvironmentSecretImportPlan,
    confirmation: LocalImportConfirmationPort,
  ): Promise<void> {
    if (!confirmation.isDirectTty()) {
      throw new LocalEnvironmentSecretImportError('IMPORT_CONFIRMATION_REQUIRED');
    }
    let response: string | null;
    try {
      response = await confirmation.readChallenge('IMPORT', targetLocation, plan);
    } catch {
      throw new LocalEnvironmentSecretImportError('IMPORT_CANCELLED');
    }
    if (response !== 'IMPORT') throw new LocalEnvironmentSecretImportError('IMPORT_CANCELLED');
  }

  private validateRequest(request: ImportRequest): void {
    const keys = request && typeof request === 'object' ? Object.keys(request).sort() : [];
    const exactKeys = ['dryRun', 'overwrite', 'sourcePath', 'targetLocation'];
    if (
      keys.length !== exactKeys.length
      || keys.some((key, index) => key !== exactKeys[index])
      || typeof request.sourcePath !== 'string'
      || !path.isAbsolute(request.sourcePath)
      || !(request.targetLocation instanceof ApplicationDatabaseLocation)
      || !Object.isFrozen(request.targetLocation)
      || typeof request.dryRun !== 'boolean'
      || typeof request.overwrite !== 'boolean'
    ) {
      throw new LocalEnvironmentSecretImportError('IMPORT_OPTIONS_INVALID');
    }
  }
}
