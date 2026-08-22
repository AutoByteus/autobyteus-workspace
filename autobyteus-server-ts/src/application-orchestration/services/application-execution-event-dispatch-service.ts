import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import { ApplicationPlatformStateStore } from "../../application-storage/stores/application-platform-state-store.js";
import type { ApplicationEngineController } from "../../application-engine/services/application-engine-controller.js";
import type { ApplicationEngineLauncher } from "../../application-engine/services/application-engine-launcher.js";
import { ApplicationExecutionEventDispatchQueue } from "./application-execution-event-dispatch-queue.js";
import type { ApplicationExecutionEventJournalRecord } from "../domain/models.js";
import { ApplicationExecutionEventJournalStore } from "../stores/application-execution-event-journal-store.js";
type ApplicationAvailabilityReader = {
  isApplicationActive: (applicationId: string) => boolean | Promise<boolean>;
};

const MAX_BACKOFF_MS = 60_000;

const computeBackoffMs = (attemptNumber: number): number =>
  Math.min(1_000 * 2 ** Math.max(0, attemptNumber - 1), MAX_BACKOFF_MS);

const computeRetryDelayMs = (record: ApplicationExecutionEventJournalRecord): number | null => {
  if (!record.nextAttemptAfter) {
    return null;
  }
  const nextAttemptTimestamp = new Date(record.nextAttemptAfter).getTime();
  if (!Number.isFinite(nextAttemptTimestamp)) {
    return null;
  }
  const delayMs = nextAttemptTimestamp - Date.now();
  return delayMs > 0 ? delayMs : null;
};

export class ApplicationExecutionEventDispatchService {
  private readonly runningApplications = new Set<string>();
  private readonly retryTimerByApplicationId = new Map<string, NodeJS.Timeout>();
  private readonly eventQueue: ApplicationExecutionEventDispatchQueue;

  constructor(
    private readonly dependencies: {
      applicationBundleService: ApplicationBundleService;
      availabilityReader: ApplicationAvailabilityReader;
      platformStateStore: ApplicationPlatformStateStore;
      journalStore: ApplicationExecutionEventJournalStore;
      eventQueue: ApplicationExecutionEventDispatchQueue;
      engineLauncher: Pick<ApplicationEngineLauncher, "ensureReady">;
      engineController: Pick<ApplicationEngineController, "invokeApplicationEventHandler">;
    },
  ) {
    this.eventQueue = dependencies.eventQueue;
    void this.consumeQueue();
  }

  private get applicationBundleService(): ApplicationBundleService {
    return this.dependencies.applicationBundleService;
  }

  private get availabilityService(): ApplicationAvailabilityReader {
    return this.dependencies.availabilityReader;
  }

  private get platformStateStore(): ApplicationPlatformStateStore {
    return this.dependencies.platformStateStore;
  }

  private get journalStore(): ApplicationExecutionEventJournalStore {
    return this.dependencies.journalStore;
  }

  private get engineLauncher(): Pick<ApplicationEngineLauncher, "ensureReady"> {
    return this.dependencies.engineLauncher;
  }

  private get engineController(): Pick<ApplicationEngineController, "invokeApplicationEventHandler"> {
    return this.dependencies.engineController;
  }

  async resumePendingEvents(): Promise<void> {
    const candidateApplicationIds = new Set<string>([
      ...(await this.platformStateStore.listKnownApplicationIds()),
      ...(await this.applicationBundleService.listApplications()).map((application) => application.id),
    ]);
    await Promise.all(
      Array.from(candidateApplicationIds).map((applicationId) =>
        this.resumePendingEventsForApplication(applicationId),
      ),
    );
  }

  async resumePendingEventsForApplication(applicationId: string): Promise<void> {
    if (!await this.isApplicationActive(applicationId)) {
      this.suspendApplication(applicationId);
      return;
    }
    const nextRecord = await this.journalStore.getNextPendingRecordIfPresent(applicationId);
    if (!nextRecord) {
      return;
    }
    this.schedulePendingRecord(applicationId, nextRecord);
  }

  suspendApplication(applicationId: string): void {
    const retryTimer = this.retryTimerByApplicationId.get(applicationId);
    if (retryTimer) {
      clearTimeout(retryTimer);
      this.retryTimerByApplicationId.delete(applicationId);
    }
  }

  schedule(applicationId: string): void {
    if (this.runningApplications.has(applicationId)) {
      return;
    }

    if (this.retryTimerByApplicationId.has(applicationId)) {
      return;
    }

    this.eventQueue.enqueue(applicationId);
  }

  private async isApplicationActive(applicationId: string): Promise<boolean> {
    return this.availabilityService.isApplicationActive(applicationId);
  }

  private async startDrain(applicationId: string): Promise<void> {
    if (!await this.isApplicationActive(applicationId)) {
      return;
    }

    const retryTimer = this.retryTimerByApplicationId.get(applicationId);
    if (retryTimer) {
      clearTimeout(retryTimer);
      this.retryTimerByApplicationId.delete(applicationId);
    }

    this.runningApplications.add(applicationId);
    void this.drainApplication(applicationId).finally(() => {
      void this.finishDrain(applicationId);
    });
  }

  private async drainApplication(applicationId: string): Promise<void> {
    while (true) {
      if (!await this.isApplicationActive(applicationId)) {
        return;
      }

      const nextRecord = await this.journalStore.getNextPendingRecord(applicationId);
      if (!nextRecord) {
        return;
      }

      const retryDelayMs = computeRetryDelayMs(nextRecord);
      if (retryDelayMs !== null) {
        this.scheduleRetry(applicationId, retryDelayMs);
        return;
      }

      const attemptNumber = nextRecord.lastDispatchAttemptNumber + 1;
      const dispatchedAt = new Date().toISOString();
      await this.journalStore.recordDispatchAttempt(
        applicationId,
        nextRecord.event.journalSequence,
        attemptNumber,
        dispatchedAt,
      );

      try {
        const envelope = this.journalStore.buildDispatchEnvelope(nextRecord, attemptNumber, dispatchedAt);
        await this.engineLauncher.ensureReady(applicationId);
        await this.engineController.invokeApplicationEventHandler(
          applicationId,
          { envelope },
        );
        await this.journalStore.acknowledgeRecord(
          applicationId,
          nextRecord.event.journalSequence,
          new Date().toISOString(),
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const backoffMs = computeBackoffMs(attemptNumber);
        const nextAttemptAfter = new Date(Date.now() + backoffMs).toISOString();
        await this.journalStore.recordDispatchFailure(applicationId, nextRecord.event.journalSequence, {
          errorKind: "dispatch_failed",
          errorMessage,
          nextAttemptAfter,
        });
        this.scheduleRetry(applicationId, backoffMs);
        return;
      }
    }
  }

  private async finishDrain(applicationId: string): Promise<void> {
    this.runningApplications.delete(applicationId);

    if (!await this.isApplicationActive(applicationId)) {
      return;
    }

    const nextRecord = await this.journalStore.getNextPendingRecordIfPresent(applicationId);
    if (!nextRecord) {
      return;
    }

    this.schedulePendingRecord(applicationId, nextRecord);
  }

  private async schedulePendingRecord(
    applicationId: string,
    record: ApplicationExecutionEventJournalRecord,
  ): Promise<void> {
    if (!await this.isApplicationActive(applicationId)) {
      return;
    }

    const retryDelayMs = computeRetryDelayMs(record);
    if (retryDelayMs !== null) {
      this.scheduleRetry(applicationId, retryDelayMs);
      return;
    }

    void this.startDrain(applicationId);
  }

  private async scheduleRetry(applicationId: string, delayMs: number): Promise<void> {
    if (!await this.isApplicationActive(applicationId)) {
      return;
    }

    const existing = this.retryTimerByApplicationId.get(applicationId);
    if (existing) {
      clearTimeout(existing);
    }
    const timeoutHandle = setTimeout(() => {
      this.retryTimerByApplicationId.delete(applicationId);
      this.schedule(applicationId);
    }, Math.max(0, delayMs));
    timeoutHandle.unref?.();
    this.retryTimerByApplicationId.set(applicationId, timeoutHandle);
  }

  private async consumeQueue(): Promise<void> {
    while (true) {
      const applicationId = await this.eventQueue.take();
      if (!applicationId) {
        return;
      }
      if (this.runningApplications.has(applicationId)) {
        continue;
      }
      void this.startDrain(applicationId);
    }
  }

  stop(): void {
    this.eventQueue.stop();
    for (const timeoutHandle of this.retryTimerByApplicationId.values()) {
      clearTimeout(timeoutHandle);
    }
    this.retryTimerByApplicationId.clear();
    this.runningApplications.clear();
  }
}
