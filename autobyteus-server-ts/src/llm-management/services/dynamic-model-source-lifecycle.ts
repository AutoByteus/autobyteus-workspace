import type { ModelSourceState, ModelSourceStatus } from '../llm-providers/domain/models.js';

export type DynamicSourcePreparation<TModel> = {
  models: readonly TModel[];
  successfulUnitCount: number;
  failedUnitCount: number;
};

export type DynamicSourceSpec<TModel> = {
  key: string;
  modelKind: ModelSourceStatus['modelKind'];
  fingerprint: string;
  currentModelCount: () => number;
  prepare: () => Promise<DynamicSourcePreparation<TModel>>;
  commit: (models: readonly TModel[]) => void;
};

type DynamicSourceRecord = {
  generation: number;
  currentFingerprint: string;
  attemptedFingerprint: string | null;
  successfulFingerprint: string | null;
  state: ModelSourceState;
  safeMessage: string | null;
  successfulUnitCount: number;
  failedUnitCount: number;
  modelCount: number;
  inFlight: Promise<ModelSourceStatus> | null;
};

const safeFailureMessage = (error: unknown): string => {
  const code = error instanceof Error ? error.message : String(error);
  return /^[A-Z0-9_:-]{1,120}$/.test(code) ? code : 'MODEL_DISCOVERY_UNAVAILABLE';
};

export class DynamicModelSourceLifecycle {
  private readonly records = new Map<string, DynamicSourceRecord>();

  status(key: string, modelKind: ModelSourceStatus['modelKind'], modelCount: number): ModelSourceStatus {
    const record = this.records.get(key);
    if (!record) return {
      modelKind,
      state: 'IDLE',
      modelCount,
      successfulUnitCount: 0,
      failedUnitCount: 0,
      safeMessage: null,
    };
    return this.toStatus(record, modelKind, modelCount);
  }

  ensure<TModel>(spec: DynamicSourceSpec<TModel>, force = false): Promise<ModelSourceStatus> {
    let record = this.records.get(spec.key);
    if (!record) {
      record = this.createRecord(spec.fingerprint, spec.currentModelCount());
      this.records.set(spec.key, record);
    }
    if (record.currentFingerprint !== spec.fingerprint) {
      record.generation += 1;
      record.currentFingerprint = spec.fingerprint;
      record.attemptedFingerprint = null;
      record.inFlight = null;
    }
    if (!force && record.inFlight) return record.inFlight;
    if (!force && record.attemptedFingerprint === spec.fingerprint) {
      return Promise.resolve(this.toStatus(record, spec.modelKind, spec.currentModelCount()));
    }

    const generation = ++record.generation;
    const fingerprint = spec.fingerprint;
    record.state = spec.currentModelCount() > 0 ? 'REFRESHING' : 'LOADING';
    record.safeMessage = null;
    const operation = this.run(spec, record, generation, fingerprint);
    record.inFlight = operation;
    void operation.finally(() => {
      if (this.isCurrent(record!, generation, fingerprint)
        && record!.inFlight === operation) record!.inFlight = null;
    }).catch(() => undefined);
    return operation;
  }

  invalidate(key: string, fingerprint: string, retainRows: boolean): void {
    const record = this.records.get(key) ?? this.createRecord(fingerprint, 0);
    record.generation += 1;
    record.currentFingerprint = fingerprint;
    record.attemptedFingerprint = null;
    record.inFlight = null;
    record.state = retainRows && record.modelCount > 0 ? 'REFRESHING' : 'IDLE';
    record.safeMessage = null;
    this.records.set(key, record);
  }

  seed<TModel>(spec: Omit<DynamicSourceSpec<TModel>, 'prepare'>, models: readonly TModel[]): ModelSourceStatus {
    spec.commit(models);
    const record = this.createRecord(spec.fingerprint, models.length);
    record.attemptedFingerprint = spec.fingerprint;
    record.successfulFingerprint = spec.fingerprint;
    record.state = 'READY';
    record.successfulUnitCount = 1;
    this.records.set(spec.key, record);
    return this.toStatus(record, spec.modelKind, models.length);
  }

  remove(key: string): void {
    const record = this.records.get(key);
    if (record) record.generation += 1;
    this.records.delete(key);
  }

  async waitForIdle(): Promise<void> {
    await Promise.allSettled(Array.from(this.records.values())
      .map((record) => record.inFlight)
      .filter((promise): promise is Promise<ModelSourceStatus> => Boolean(promise)));
  }

  private async run<TModel>(
    spec: DynamicSourceSpec<TModel>,
    record: DynamicSourceRecord,
    generation: number,
    fingerprint: string,
  ): Promise<ModelSourceStatus> {
    try {
      const prepared = await spec.prepare();
      if (!this.isCurrent(record, generation, fingerprint)) {
        return this.toStatus(record, spec.modelKind, spec.currentModelCount());
      }
      spec.commit(prepared.models);
      record.modelCount = prepared.models.length;
      record.attemptedFingerprint = fingerprint;
      record.successfulFingerprint = fingerprint;
      record.successfulUnitCount = prepared.successfulUnitCount;
      record.failedUnitCount = prepared.failedUnitCount;
      record.safeMessage = null;
      record.state = prepared.failedUnitCount > 0 ? 'PARTIAL' : 'READY';
    } catch (error) {
      if (this.isCurrent(record, generation, fingerprint)) {
        record.modelCount = spec.currentModelCount();
        record.attemptedFingerprint = fingerprint;
        record.successfulUnitCount = 0;
        record.failedUnitCount = Math.max(1, record.failedUnitCount);
        record.safeMessage = safeFailureMessage(error);
        record.state = record.modelCount > 0 ? 'STALE_ERROR' : 'ERROR';
      }
    }
    return this.toStatus(record, spec.modelKind, spec.currentModelCount());
  }

  private isCurrent(record: DynamicSourceRecord, generation: number, fingerprint: string): boolean {
    return record.generation === generation && record.currentFingerprint === fingerprint;
  }

  private createRecord(fingerprint: string, modelCount: number): DynamicSourceRecord {
    return {
      generation: 0,
      currentFingerprint: fingerprint,
      attemptedFingerprint: null,
      successfulFingerprint: null,
      state: 'IDLE',
      safeMessage: null,
      successfulUnitCount: 0,
      failedUnitCount: 0,
      modelCount,
      inFlight: null,
    };
  }

  private toStatus(
    record: DynamicSourceRecord,
    modelKind: ModelSourceStatus['modelKind'],
    modelCount: number,
  ): ModelSourceStatus {
    return {
      modelKind,
      state: record.state,
      modelCount,
      successfulUnitCount: record.successfulUnitCount,
      failedUnitCount: record.failedUnitCount,
      safeMessage: record.safeMessage,
    };
  }
}
