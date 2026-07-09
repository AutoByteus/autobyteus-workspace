import type {
  SkillImprovementRequest,
  SkillImprovementNotificationSummary,
  SkillImprovementRunRecord,
  SkillImprovementRunStatus,
} from "../domain/models.js";
import { SkillImprovementRunStore } from "./skill-improvement-run-store.js";
import { SkillImprovementTargetNotificationService } from "./skill-improvement-target-notification-service.js";

export class SkillImprovementRecordLifecycle {
  constructor(private readonly deps: {
    runStore?: SkillImprovementRunStore;
    notificationService?: SkillImprovementTargetNotificationService;
  } = {}) {}

  buildInitialRecord(request: SkillImprovementRequest): SkillImprovementRunRecord {
    return {
      improvementRunId: request.improvementRunId,
      status: "requested",
      requestedAt: request.requestedAt,
      completedAt: null,
      triggerStrategy: request.triggerStrategy,
      improverStrategy: request.effectiveConfig.improverStrategy,
      target: request.target,
      effectiveConfig: request.effectiveConfig,
      sourceRunIds: [],
      improverAgentDefinitionId: request.effectiveConfig.improverAgentDefinitionId ?? "",
      improverRunId: null,
      runtimeKind: null,
      llmModelIdentifier: null,
      workspaceRootPath: null,
      skillTargets: [],
      evidenceSummaryHash: null,
      notificationSummary: null,
      errors: [],
    };
  }

  async getRunRecord(improvementRunId: string): Promise<SkillImprovementRunRecord | null> {
    return this.runStore.readRecord(improvementRunId);
  }

  async patchRecord(
    record: SkillImprovementRunRecord,
    patch: Partial<SkillImprovementRunRecord>,
  ): Promise<SkillImprovementRunRecord> {
    const nextRecord = { ...record, ...patch };
    await this.runStore.writeRecord(nextRecord);
    return nextRecord;
  }

  async finalizeRecord(
    record: SkillImprovementRunRecord,
    terminalStatus: SkillImprovementRunStatus,
    notificationSummaryOverride?: SkillImprovementNotificationSummary | null,
  ): Promise<SkillImprovementRunRecord> {
    const notifyingRecord = terminalStatus === "completed"
      ? await this.patchRecord(record, { status: "notifying_target" })
      : await this.patchRecord(record, { status: terminalStatus });
    const notificationSummary = notificationSummaryOverride !== undefined
      ? notificationSummaryOverride
      : terminalStatus === "completed"
        ? await this.notificationService.notify({
            improvementRunId: record.improvementRunId,
            target: record.target,
            skillTargets: record.skillTargets,
          })
        : null;
    const finalRecord: SkillImprovementRunRecord = {
      ...notifyingRecord,
      status: terminalStatus,
      completedAt: new Date().toISOString(),
      notificationSummary,
    };
    await this.runStore.writeRecord(finalRecord);
    return finalRecord;
  }

  async failRecord(
    record: SkillImprovementRunRecord,
    error: unknown,
  ): Promise<SkillImprovementRunRecord> {
    const failedRecord: SkillImprovementRunRecord = {
      ...record,
      status: "failed",
      completedAt: new Date().toISOString(),
      errors: [...record.errors, String(error)],
    };
    await this.runStore.writeRecord(failedRecord);
    return failedRecord;
  }

  private get runStore(): SkillImprovementRunStore {
    return this.deps.runStore ?? new SkillImprovementRunStore();
  }

  private get notificationService(): SkillImprovementTargetNotificationService {
    return this.deps.notificationService ?? new SkillImprovementTargetNotificationService();
  }
}
