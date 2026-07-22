import type { SecretValue } from 'autobyteus-ts/secrets/secret-value.js';
import type { SecretDefinitionId } from '../../domain/secret-binding.js';
import { defaultSecretCatalog, type SecretCatalog } from '../../catalog/secret-catalog.js';
import {
  backendHealthFromError,
  SecretStorageError,
  type BackendSecretStatus,
  type SecretBackendHealth,
} from '../../domain/secret-storage-types.js';
import { LocalSecretStoreBatchPreconditionError } from './local-encrypted-secret-repository.js';
import { LocalWritableSecretStorageBackend } from './local-secret-storage-backend.js';
import {
  LocalSecretStoreInitializer,
  type LocalStoreConfiguration,
} from './local-secret-store-initializer.js';

export type LocalProvisioningStatus = {
  definitionId: SecretDefinitionId;
  storageState: 'CONFIGURED';
};

export type LocalProvisioningBatchEntry = {
  definitionId: SecretDefinitionId;
  value: SecretValue;
  action: 'CREATE' | 'REPLACE';
};

export type LocalProvisioningTargetSnapshot =
  | {
      targetStatus: { state: 'READY' };
      definitionStatus: ReadonlyMap<SecretDefinitionId, BackendSecretStatus>;
    }
  | {
      targetStatus: {
        state: 'INITIALIZATION_REQUIRED';
        instructionCode: 'LOCAL_IMPORT_TARGET_INITIALIZATION_REQUIRED';
      };
      definitionStatus: null;
    }
  | {
      targetStatus: Exclude<SecretBackendHealth, { state: 'READY' }>;
      definitionStatus: null;
    };

export type LocalProvisioningBatchErrorCode =
  | 'TARGET_CHANGED'
  | 'TARGET_NOT_READY'
  | 'INITIALIZATION_FAILED'
  | 'BATCH_FAILED';

export class LocalProvisioningBatchError extends Error {
  constructor(readonly code: LocalProvisioningBatchErrorCode) {
    super(code);
    this.name = 'LocalProvisioningBatchError';
  }
}

type InspectionState = {
  targetState: 'READY' | 'INITIALIZATION_REQUIRED';
  definitionIds: readonly SecretDefinitionId[];
};

const errorForHealth = (health: Exclude<SecretBackendHealth, { state: 'READY' }>): SecretStorageError => {
  switch (health.state) {
    case 'LOCKED':
      return new SecretStorageError('BACKEND_LOCKED', true, health.instructionCode);
    case 'CORRUPT':
      return new SecretStorageError('CORRUPT_STORE', false, health.instructionCode);
    case 'INCOMPATIBLE':
      return new SecretStorageError('INCOMPATIBLE_STORE_FORMAT', false, health.instructionCode);
    default:
      return new SecretStorageError('BACKEND_UNAVAILABLE', true, health.instructionCode);
  }
};

export class LocalSecretStoreProvisioningService {
  #lastInspection: InspectionState | null = null;

  constructor(
    private readonly target: LocalStoreConfiguration,
    private readonly catalog: SecretCatalog = defaultSecretCatalog,
  ) {}

  async inspectExact(
    definitionIds: readonly SecretDefinitionId[],
  ): Promise<LocalProvisioningTargetSnapshot> {
    this.validateDefinitionIds(definitionIds);
    this.#lastInspection = null;
    let pairState: 'ABSENT' | 'PRESENT';
    try {
      pairState = await LocalSecretStoreInitializer.inspectPairState(this.target);
    } catch (error) {
      return { targetStatus: this.nonReadyHealth(error), definitionStatus: null };
    }
    if (pairState === 'ABSENT') {
      this.#lastInspection = { targetState: 'INITIALIZATION_REQUIRED', definitionIds: [...definitionIds] };
      return {
        targetStatus: {
          state: 'INITIALIZATION_REQUIRED',
          instructionCode: 'LOCAL_IMPORT_TARGET_INITIALIZATION_REQUIRED',
        },
        definitionStatus: null,
      };
    }

    const backend = await LocalWritableSecretStorageBackend.open(
      this.target,
      { initializeIfAbsent: false },
    );
    try {
      const health = await backend.health();
      if (health.state !== 'READY') return { targetStatus: health, definitionStatus: null };
      const definitionStatus = new Map<SecretDefinitionId, BackendSecretStatus>();
      for (const definitionId of definitionIds) {
        definitionStatus.set(definitionId, await backend.getStatus(definitionId));
      }
      this.#lastInspection = { targetState: 'READY', definitionIds: [...definitionIds] };
      return { targetStatus: { state: 'READY' }, definitionStatus };
    } catch (error) {
      return { targetStatus: this.nonReadyHealth(error), definitionStatus: null };
    } finally {
      await backend.close();
    }
  }

  async provisionExact(
    definitionId: SecretDefinitionId,
    value: SecretValue,
  ): Promise<LocalProvisioningStatus> {
    this.#lastInspection = null;
    this.validateDefinitionIds([definitionId]);
    const backend = await LocalWritableSecretStorageBackend.open(this.target);
    try {
      const health = await backend.health();
      if (health.state !== 'READY') throw errorForHealth(health);
      await backend.save(definitionId, value);
      await backend.checkpoint();
      return { definitionId, storageState: 'CONFIGURED' };
    } finally {
      await backend.close();
    }
  }

  async provisionBatchExact(
    entries: readonly LocalProvisioningBatchEntry[],
    options: { initializeIfAbsent: true },
  ): Promise<{ configuredCount: number; replacedCount: number }> {
    if (options.initializeIfAbsent !== true || entries.length === 0) {
      throw new LocalProvisioningBatchError('BATCH_FAILED');
    }
    this.validateDefinitionIds(entries.map((entry) => entry.definitionId));
    if (entries.some((entry) => entry.action !== 'CREATE' && entry.action !== 'REPLACE')) {
      throw new LocalProvisioningBatchError('BATCH_FAILED');
    }

    const inspection = this.#lastInspection;
    this.#lastInspection = null;
    if (!inspection || !this.sameDefinitions(inspection.definitionIds, entries)) {
      throw new LocalProvisioningBatchError('TARGET_CHANGED');
    }

    let pairState: 'ABSENT' | 'PRESENT';
    try {
      pairState = await LocalSecretStoreInitializer.inspectPairState(this.target);
    } catch {
      throw new LocalProvisioningBatchError('TARGET_CHANGED');
    }
    if (
      (inspection.targetState === 'INITIALIZATION_REQUIRED' && pairState !== 'ABSENT')
      || (inspection.targetState === 'READY' && pairState !== 'PRESENT')
    ) {
      throw new LocalProvisioningBatchError('TARGET_CHANGED');
    }

    let phase: 'OPEN' | 'BATCH' = 'OPEN';
    const backend = await LocalWritableSecretStorageBackend.open(this.target, {
      initializeIfAbsent: inspection.targetState === 'INITIALIZATION_REQUIRED',
    });
    try {
      const health = await backend.health();
      if (health.state !== 'READY') {
        throw new LocalProvisioningBatchError(
          inspection.targetState === 'INITIALIZATION_REQUIRED'
            ? 'INITIALIZATION_FAILED'
            : 'TARGET_NOT_READY',
        );
      }
      phase = 'BATCH';
      const counts = await backend.provisionBatchExact(entries);
      await backend.checkpoint();
      return counts;
    } catch (error) {
      if (error instanceof LocalProvisioningBatchError) throw error;
      if (error instanceof LocalSecretStoreBatchPreconditionError) {
        throw new LocalProvisioningBatchError('TARGET_CHANGED');
      }
      throw new LocalProvisioningBatchError(
        phase === 'OPEN' && inspection.targetState === 'INITIALIZATION_REQUIRED'
          ? 'INITIALIZATION_FAILED'
          : 'BATCH_FAILED',
      );
    } finally {
      await backend.close();
    }
  }

  private validateDefinitionIds(definitionIds: readonly SecretDefinitionId[]): void {
    const unique = new Set(definitionIds.map(String));
    if (
      definitionIds.length === 0
      || unique.size !== definitionIds.length
      || definitionIds.some((definitionId) => !this.catalog.isKnownDefinition(definitionId))
    ) {
      throw new SecretStorageError('ACCESS_DENIED', false, 'SECRET_DEFINITION_NOT_PROVISIONABLE');
    }
  }

  private sameDefinitions(
    inspected: readonly SecretDefinitionId[],
    entries: readonly LocalProvisioningBatchEntry[],
  ): boolean {
    const expected = new Set(inspected.map(String));
    return entries.every((entry) => expected.has(String(entry.definitionId)));
  }

  private nonReadyHealth(error: unknown): Exclude<SecretBackendHealth, { state: 'READY' }> {
    const health = backendHealthFromError(error);
    return health.state === 'READY'
      ? { state: 'UNAVAILABLE', instructionCode: 'SECRET_BACKEND_UNAVAILABLE' }
      : health;
  }
}
