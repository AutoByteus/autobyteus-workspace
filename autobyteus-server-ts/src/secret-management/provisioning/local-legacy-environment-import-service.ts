import path from 'node:path';
import { SecretValue } from 'autobyteus-ts/secrets/secret-value.js';
import { defaultSecretCatalog, type SecretCatalog } from '../catalog/secret-catalog.js';
import type { SecretDefinitionId } from '../domain/secret-binding.js';
import {
  LocalProvisioningBatchError,
  LocalSecretStoreProvisioningService,
  type LocalProvisioningBatchEntry,
  type LocalProvisioningTargetSnapshot,
} from '../backends/local/local-secret-store-provisioning-service.js';
import {
  LocalEnvironmentSourceReader,
  type LocalEnvironmentSourceReadResult,
} from './local-environment-source-reader.js';
import type { LocalImportTargetResolver } from './local-import-target-resolver.js';
import {
  LocalLegacyEnvironmentImportError,
  type LocalLegacyEnvironmentImportPlan,
  type LocalLegacyEnvironmentImportPlanEntry,
  type LocalLegacyEnvironmentImportRequest,
  type LocalLegacyEnvironmentImportResult,
  type LocalLegacyEnvironmentImportTarget,
} from './local-legacy-environment-import.js';

export interface LocalImportConfirmationPort {
  isDirectTty(): boolean;
  readChallenge(expectedPhrase: string): Promise<string | null>;
}

export type LocalProvisioningServiceFactory = (
  configuration: ReturnType<LocalImportTargetResolver['resolve']>,
) => LocalSecretStoreProvisioningService;

type PreparedImport = {
  source: LocalEnvironmentSourceReadResult;
  provisioning: LocalSecretStoreProvisioningService;
  plan: LocalLegacyEnvironmentImportPlan;
};

const expectedConfirmation = (target: LocalLegacyEnvironmentImportTarget): string =>
  target === 'default' ? 'IMPORT DEFAULT STORE' : 'IMPORT REAL-E2E STORE';

export class LocalLegacyEnvironmentImportService {
  constructor(
    private readonly targetResolver: LocalImportTargetResolver,
    private readonly sourceReader: LocalEnvironmentSourceReader = new LocalEnvironmentSourceReader(),
    private readonly provisioningFactory: LocalProvisioningServiceFactory =
      (configuration) => new LocalSecretStoreProvisioningService(configuration),
    private readonly catalog: SecretCatalog = defaultSecretCatalog,
  ) {}

  async preview(request: LocalLegacyEnvironmentImportRequest): Promise<LocalLegacyEnvironmentImportPlan> {
    this.validateRequest(request);
    if (!request.dryRun) throw new LocalLegacyEnvironmentImportError('IMPORT_OPTIONS_INVALID', request.target);
    const prepared = await this.prepare(request);
    try {
      return prepared.plan;
    } finally {
      prepared.source.release();
    }
  }

  async execute(
    request: LocalLegacyEnvironmentImportRequest,
    confirmation: LocalImportConfirmationPort,
  ): Promise<LocalLegacyEnvironmentImportResult> {
    this.validateRequest(request);
    if (request.dryRun) throw new LocalLegacyEnvironmentImportError('IMPORT_OPTIONS_INVALID', request.target);
    const prepared = await this.prepare(request);
    try {
      const writableEntries = prepared.plan.entries.filter(
        (entry) => entry.action === 'CREATE' || entry.action === 'REPLACE',
      );
      const skippedCount = prepared.plan.entries.length - writableEntries.length;
      if (writableEntries.length === 0) {
        return {
          targetStatus: prepared.plan.targetStatus,
          definitionIds: prepared.plan.entries.map((entry) => entry.definitionId),
          configuredCount: 0,
          skippedCount,
          replacedCount: 0,
          instructionCode: 'NONE',
        };
      }

      await this.confirm(request.target, confirmation);
      const batchEntries = this.materializeBatch(prepared.source, writableEntries);
      let counts: { configuredCount: number; replacedCount: number };
      try {
        counts = await prepared.provisioning.provisionBatchExact(batchEntries, {
          initializeIfAbsent: true,
        });
      } catch (error) {
        throw this.mapBatchError(error, request.target);
      }
      return {
        targetStatus: { state: 'READY' },
        definitionIds: prepared.plan.entries.map((entry) => entry.definitionId),
        configuredCount: counts.configuredCount,
        skippedCount,
        replacedCount: counts.replacedCount,
        instructionCode: request.target === 'default' ? 'RESTART_REQUIRED' : 'RUN_REAL_E2E_PREFLIGHT',
      };
    } finally {
      prepared.source.release();
    }
  }

  private async prepare(request: LocalLegacyEnvironmentImportRequest): Promise<PreparedImport> {
    const source = await this.sourceReader.read(request.sourceAbsolutePath);
    try {
      const definitionIds = source.credentials
        .map((credential) => credential.definitionId)
        .sort((left, right) => String(left).localeCompare(String(right)));
      if (
        new Set(definitionIds.map(String)).size !== definitionIds.length
        || definitionIds.some((definitionId) => !this.catalog.isKnownDefinition(definitionId))
      ) {
        throw new LocalLegacyEnvironmentImportError('IMPORT_MAPPING_INVALID', request.target);
      }

      const provisioning = this.provisioningFactory(this.targetResolver.resolve(request.target));
      const snapshot = await provisioning.inspectExact(definitionIds);
      const plan = this.buildPlan(snapshot, definitionIds, request.overwrite);
      return { source, provisioning, plan };
    } catch (error) {
      source.release();
      if (error instanceof LocalLegacyEnvironmentImportError) throw error;
      throw new LocalLegacyEnvironmentImportError('IMPORT_TARGET_NOT_READY', request.target);
    }
  }

  private buildPlan(
    snapshot: LocalProvisioningTargetSnapshot,
    definitionIds: readonly SecretDefinitionId[],
    overwrite: boolean,
  ): LocalLegacyEnvironmentImportPlan {
    if (snapshot.targetStatus.state === 'INITIALIZATION_REQUIRED') {
      return {
        targetStatus: snapshot.targetStatus,
        entries: definitionIds.map((definitionId) => ({ definitionId, action: 'CREATE' })),
      };
    }
    if (snapshot.targetStatus.state !== 'READY' || !snapshot.definitionStatus) {
      return { targetStatus: snapshot.targetStatus, entries: [] };
    }
    return {
      targetStatus: snapshot.targetStatus,
      entries: definitionIds.map((definitionId) => {
        const configured = snapshot.definitionStatus?.get(definitionId)?.storageState === 'CONFIGURED';
        return {
          definitionId,
          action: configured ? (overwrite ? 'REPLACE' : 'SKIPPED_CONFIGURED') : 'CREATE',
        };
      }),
    };
  }

  private materializeBatch(
    source: LocalEnvironmentSourceReadResult,
    writableEntries: readonly LocalLegacyEnvironmentImportPlanEntry[],
  ): LocalProvisioningBatchEntry[] {
    const values = new Map(
      source.credentials.map((credential) => [String(credential.definitionId), credential.valueBytes] as const),
    );
    return writableEntries.map((entry) => {
      const valueBytes = values.get(String(entry.definitionId));
      if (!valueBytes) throw new LocalLegacyEnvironmentImportError('IMPORT_MAPPING_INVALID');
      return {
        definitionId: entry.definitionId,
        value: SecretValue.fromString(valueBytes.toString('utf8')),
        action: entry.action as 'CREATE' | 'REPLACE',
      };
    });
  }

  private async confirm(
    target: LocalLegacyEnvironmentImportTarget,
    confirmation: LocalImportConfirmationPort,
  ): Promise<void> {
    if (!confirmation.isDirectTty()) {
      throw new LocalLegacyEnvironmentImportError('IMPORT_CONFIRMATION_REQUIRED', target);
    }
    let response: string | null;
    try {
      response = await confirmation.readChallenge(expectedConfirmation(target));
    } catch {
      throw new LocalLegacyEnvironmentImportError('IMPORT_CANCELLED', target);
    }
    if (response !== expectedConfirmation(target)) {
      throw new LocalLegacyEnvironmentImportError('IMPORT_CANCELLED', target);
    }
  }

  private mapBatchError(
    error: unknown,
    target: LocalLegacyEnvironmentImportTarget,
  ): LocalLegacyEnvironmentImportError {
    if (!(error instanceof LocalProvisioningBatchError)) {
      return new LocalLegacyEnvironmentImportError('IMPORT_BATCH_FAILED', target);
    }
    switch (error.code) {
      case 'TARGET_CHANGED':
        return new LocalLegacyEnvironmentImportError('IMPORT_TARGET_CHANGED', target);
      case 'TARGET_NOT_READY':
        return new LocalLegacyEnvironmentImportError('IMPORT_TARGET_NOT_READY', target);
      case 'INITIALIZATION_FAILED':
        return new LocalLegacyEnvironmentImportError('IMPORT_TARGET_INITIALIZATION_FAILED', target);
      default:
        return new LocalLegacyEnvironmentImportError('IMPORT_BATCH_FAILED', target);
    }
  }

  private validateRequest(request: LocalLegacyEnvironmentImportRequest): void {
    const keys = request && typeof request === 'object' ? Object.keys(request).sort() : [];
    const exactKeys = ['dryRun', 'overwrite', 'sourceAbsolutePath', 'target'];
    if (
      keys.length !== exactKeys.length
      || keys.some((key, index) => key !== exactKeys[index])
      || typeof request.sourceAbsolutePath !== 'string'
      || !path.isAbsolute(request.sourceAbsolutePath)
      || (request.target !== 'default' && request.target !== 'e2e')
      || typeof request.dryRun !== 'boolean'
      || typeof request.overwrite !== 'boolean'
    ) {
      throw new LocalLegacyEnvironmentImportError('IMPORT_OPTIONS_INVALID');
    }
  }
}
