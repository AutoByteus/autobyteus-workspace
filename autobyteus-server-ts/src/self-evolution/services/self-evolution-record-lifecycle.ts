import type {
  SelfEvolutionChangeSummary,
  SelfEvolutionRequest,
  SelfEvolutionRunRecord,
  SelfEvolutionRunStatus,
} from "../domain/models.js";
import { SelfEvolutionMetricsService } from "./self-evolution-metrics-service.js";
import { SelfEvolutionRunStore } from "./self-evolution-run-store.js";
import { SelfEvolutionTargetNotificationService } from "./self-evolution-target-notification-service.js";

export class SelfEvolutionRecordLifecycle {
  constructor(private readonly deps: {
    runStore?: SelfEvolutionRunStore;
    metricsService?: SelfEvolutionMetricsService;
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
      changeSummary: null,
      updateMetrics: null,
      benefitMetrics: null,
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
    changeSummary: SelfEvolutionChangeSummary,
  ): Promise<SelfEvolutionRunRecord> {
    const policyViolations = changeSummary.policyViolations ?? [];
    const finalStatus = terminalStatus === "completed" && policyViolations.length > 0
      ? "failed"
      : terminalStatus;
    const notifyingRecord = terminalStatus === "completed"
      ? await this.patchRecord(record, {
          status: policyViolations.length > 0 ? "failed" : "notifying_target",
          changeSummary,
          errors: policyViolations.length > 0 ? [...record.errors, ...policyViolations] : record.errors,
        })
      : await this.patchRecord(record, { status: terminalStatus, changeSummary });
    const notificationSummary = terminalStatus === "completed" && policyViolations.length === 0
      ? await this.notificationService.notify({
          evolutionRunId: record.evolutionRunId,
          target: record.target,
          changeSummary,
        })
      : null;
    const finalRecord: SelfEvolutionRunRecord = {
      ...notifyingRecord,
      status: finalStatus,
      completedAt: new Date().toISOString(),
      notificationSummary,
      benefitMetrics: this.metricsService.buildInitialBenefitMetrics(
        policyViolations.length > 0
          ? "Evolution changed off-target paths, so downstream benefit is not collectible."
          : undefined,
      ),
    };
    finalRecord.updateMetrics = this.metricsService.buildUpdateMetrics(finalRecord);
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
      benefitMetrics: this.metricsService.buildInitialBenefitMetrics(
        "Evolution failed, so downstream benefit is not collectible.",
      ),
    };
    failedRecord.updateMetrics = this.metricsService.buildUpdateMetrics(failedRecord);
    await this.runStore.writeRecord(failedRecord);
    return failedRecord;
  }

  private get runStore(): SelfEvolutionRunStore {
    return this.deps.runStore ?? new SelfEvolutionRunStore();
  }

  private get metricsService(): SelfEvolutionMetricsService {
    return this.deps.metricsService ?? new SelfEvolutionMetricsService({ runStore: this.runStore });
  }

  private get notificationService(): SelfEvolutionTargetNotificationService {
    return this.deps.notificationService ?? new SelfEvolutionTargetNotificationService();
  }
}
