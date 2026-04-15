import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import {
  ApplicationEngineHostService,
  getApplicationEngineHostService,
} from "../../application-engine/services/application-engine-host-service.js";
import { ApplicationPublicationJournalStore } from "../stores/application-publication-journal-store.js";

const MAX_BACKOFF_MS = 60_000;

const computeBackoffMs = (attemptNumber: number): number =>
  Math.min(1_000 * 2 ** Math.max(0, attemptNumber - 1), MAX_BACKOFF_MS);

export class ApplicationPublicationDispatchService {
  private static instance: ApplicationPublicationDispatchService | null = null;

  static getInstance(
    dependencies: ConstructorParameters<typeof ApplicationPublicationDispatchService>[0] = {},
  ): ApplicationPublicationDispatchService {
    if (!ApplicationPublicationDispatchService.instance) {
      ApplicationPublicationDispatchService.instance = new ApplicationPublicationDispatchService(dependencies);
    }
    return ApplicationPublicationDispatchService.instance;
  }

  static resetInstance(): void {
    ApplicationPublicationDispatchService.instance = null;
    cachedApplicationPublicationDispatchService = null;
  }

  private readonly runningApplications = new Set<string>();
  private readonly retryTimerByApplicationId = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly dependencies: {
      applicationBundleService?: ApplicationBundleService;
      journalStore?: ApplicationPublicationJournalStore;
      engineHostService?: ApplicationEngineHostService;
    } = {},
  ) {}

  private get applicationBundleService(): ApplicationBundleService {
    return this.dependencies.applicationBundleService ?? ApplicationBundleService.getInstance();
  }

  private get journalStore(): ApplicationPublicationJournalStore {
    return this.dependencies.journalStore ?? new ApplicationPublicationJournalStore();
  }

  private get engineHostService(): ApplicationEngineHostService {
    return this.dependencies.engineHostService ?? getApplicationEngineHostService();
  }

  async resumePendingDispatches(): Promise<void> {
    const applications = await this.applicationBundleService.listApplications();
    await Promise.all(
      applications.map(async (application) => {
        const nextRecord = await this.journalStore.getNextPendingRecordIfPresent(application.id);
        if (nextRecord) {
          this.schedule(application.id);
        }
      }),
    );
  }

  schedule(applicationId: string): void {
    const retryTimer = this.retryTimerByApplicationId.get(applicationId);
    if (retryTimer) {
      clearTimeout(retryTimer);
      this.retryTimerByApplicationId.delete(applicationId);
    }

    if (this.runningApplications.has(applicationId)) {
      return;
    }

    this.runningApplications.add(applicationId);
    void this.drainApplication(applicationId).finally(() => {
      this.runningApplications.delete(applicationId);
    });
  }

  private async drainApplication(applicationId: string): Promise<void> {
    while (true) {
      const nextRecord = await this.journalStore.getNextPendingRecord(applicationId);
      if (!nextRecord) {
        return;
      }

      if (nextRecord.nextAttemptAfter) {
        const nextAttemptTimestamp = new Date(nextRecord.nextAttemptAfter).getTime();
        if (Number.isFinite(nextAttemptTimestamp) && nextAttemptTimestamp > Date.now()) {
          this.scheduleRetry(applicationId, nextAttemptTimestamp - Date.now());
          return;
        }
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
        await this.engineHostService.invokeApplicationEventHandler(applicationId, { envelope });
        await this.journalStore.acknowledgeRecord(
          applicationId,
          nextRecord.event.journalSequence,
          new Date().toISOString(),
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const nextAttemptAfter = new Date(Date.now() + computeBackoffMs(attemptNumber)).toISOString();
        await this.journalStore.recordDispatchFailure(applicationId, nextRecord.event.journalSequence, {
          errorKind: "dispatch_failed",
          errorMessage,
          nextAttemptAfter,
        });
        this.scheduleRetry(applicationId, computeBackoffMs(attemptNumber));
        return;
      }
    }
  }

  private scheduleRetry(applicationId: string, delayMs: number): void {
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
}

let cachedApplicationPublicationDispatchService: ApplicationPublicationDispatchService | null = null;

export const getApplicationPublicationDispatchService = (): ApplicationPublicationDispatchService => {
  if (!cachedApplicationPublicationDispatchService) {
    cachedApplicationPublicationDispatchService = ApplicationPublicationDispatchService.getInstance();
  }
  return cachedApplicationPublicationDispatchService;
};
