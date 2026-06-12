import type {
  SelfEvolutionRequest,
  SelfEvolutionNotificationSummary,
  SelfEvolutionRunRecord,
  SelfEvolutionRunStatus,
} from "../domain/models.js";
import { SelfEvolutionRunStore } from "./self-evolution-run-store.js";
import { SelfEvolutionTargetNotificationService } from "./self-evolution-target-notification-service.js";

export class SelfEvolutionRecordLifecycle {
  constructor(private readonly deps: {
    runStore?: SelfEvolutionRunStore;
    notificationService?: SelfEvolutionTargetNotificationService;
  } = {}) {}

  buildInitialRecord(request: SelfEvolutionRequest): SelfEvolutionRunRecord {
    return {
      evolutionRunId: request.evolutionRunId,
      status: "requested",
      requestedAt: request.requestedAt,
      completedAt: null,
      triggerStrategy: request.triggerStrategy,
      evolverStrategy: request.effectiveConfig.evolverStrategy,
      target: request.target,
      effectiveConfig: request.effectiveConfig,
      sourceRunIds: [],
      evolverAgentDefinitionId: request.effectiveConfig.evolverAgentDefinitionId ?? "",
      evolverRunId: null,
      runtimeKind: null,
      llmModelIdentifier: null,
      workspaceRootPath: null,
      skillTargets: [],
      evidenceSummaryHash: null,
      notificationSummary: null,
      errors: [],
    };
  }

  async getRunRecord(evolutionRunId: string): Promise<SelfEvolutionRunRecord | null> {
    return this.runStore.readRecord(evolutionRunId);
  }

  async patchRecord(
    record: SelfEvolutionRunRecord,
    patch: Partial<SelfEvolutionRunRecord>,
  ): Promise<SelfEvolutionRunRecord> {
    const nextRecord = { ...record, ...patch };
    await this.runStore.writeRecord(nextRecord);
    return nextRecord;
  }

  async finalizeRecord(
    record: SelfEvolutionRunRecord,
    terminalStatus: SelfEvolutionRunStatus,
    notificationSummaryOverride?: SelfEvolutionNotificationSummary | null,
  ): Promise<SelfEvolutionRunRecord> {
    const notifyingRecord = terminalStatus === "completed"
      ? await this.patchRecord(record, { status: "notifying_target" })
      : await this.patchRecord(record, { status: terminalStatus });
    const notificationSummary = notificationSummaryOverride !== undefined
      ? notificationSummaryOverride
      : terminalStatus === "completed"
        ? await this.notificationService.notify({
            evolutionRunId: record.evolutionRunId,
            target: record.target,
            skillTargets: record.skillTargets,
          })
        : null;
    const finalRecord: SelfEvolutionRunRecord = {
      ...notifyingRecord,
      status: terminalStatus,
      completedAt: new Date().toISOString(),
      notificationSummary,
    };
    await this.runStore.writeRecord(finalRecord);
    return finalRecord;
  }

  async failRecord(
    record: SelfEvolutionRunRecord,
    error: unknown,
  ): Promise<SelfEvolutionRunRecord> {
    const failedRecord: SelfEvolutionRunRecord = {
      ...record,
      status: "failed",
      completedAt: new Date().toISOString(),
      errors: [...record.errors, String(error)],
    };
    await this.runStore.writeRecord(failedRecord);
    return failedRecord;
  }

  private get runStore(): SelfEvolutionRunStore {
    return this.deps.runStore ?? new SelfEvolutionRunStore();
  }

  private get notificationService(): SelfEvolutionTargetNotificationService {
    return this.deps.notificationService ?? new SelfEvolutionTargetNotificationService();
  }
}
