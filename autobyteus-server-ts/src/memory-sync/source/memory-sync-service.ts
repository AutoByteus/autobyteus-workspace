import { appConfigProvider } from "../../config/app-config-provider.js";
import { toMemorySyncFileKey } from "../shared/memory-sync-path-policy.js";
import type { MemorySyncFileFailure, MemorySyncSourceFileState } from "../shared/memory-sync-types.js";
import { LocalMemoryExportScanner } from "./local-memory-export-scanner.js";
import { MemoryFileChangePlanner } from "./memory-file-change-planner.js";
import { planMemorySyncBatches } from "./memory-sync-batch-planner.js";
import {
  type MemorySyncBatchContext,
  MemorySyncBatchTransfer,
  type MemorySyncFileOutcome,
} from "./memory-sync-batch-transfer.js";
import { buildFileFailure, type MemorySyncRunTrigger } from "./memory-sync-file-failure-policy.js";
import { getMemorySyncConfigService, type MemorySyncConfigService } from "./memory-sync-config-service.js";
import {
  getLocalFileMemorySyncStateStore,
  type LocalFileMemorySyncStateStore,
} from "./local-file-memory-sync-state-store.js";

export type MemorySyncRunResult = {
  startedAt: string;
  finishedAt: string;
  scannedFiles: number;
  changedFiles: number;
  unchangedFiles: number;
  deferredFiles: number;
  failedFiles: number;
  committedBatches: number;
  duplicateBatches: number;
};

const logger = { warn: (...args: unknown[]) => console.warn(...args) };

export class MemorySyncService {
  private running: { trigger: MemorySyncRunTrigger; promise: Promise<MemorySyncRunResult> } | null = null;
  private queuedManual: Promise<MemorySyncRunResult> | null = null;

  constructor(
    private readonly configService: MemorySyncConfigService = getMemorySyncConfigService(),
    private readonly stateStore: LocalFileMemorySyncStateStore = getLocalFileMemorySyncStateStore(),
    private readonly scanner = new LocalMemoryExportScanner(),
    private readonly planner = new MemoryFileChangePlanner(),
    private readonly batchTransfer = new MemorySyncBatchTransfer(),
  ) {}

  /** Sync now: retries every failing file, even during another run (it then runs once after it). */
  async startManualSync(): Promise<MemorySyncRunResult> {
    return this.startSync("manual");
  }

  /**
   * The run gate. A `background` start while a run is in progress joins it. A `manual` start while a `background` run
   * is in progress waits for it and then starts one `manual` run; further manual starts join that queued run.
   */
  async startSync(trigger: MemorySyncRunTrigger): Promise<MemorySyncRunResult> {
    if (!this.running) {
      const promise = this.runOnce(trigger).finally(() => {
        this.running = null;
      });
      this.running = { trigger, promise };
      return promise;
    }
    if (trigger === "background" || this.running.trigger === "manual") {
      return this.running.promise;
    }
    this.queuedManual ??= this.running.promise
      .then(() => undefined, () => undefined)
      .then(() => {
        this.queuedManual = null;
        return this.startSync("manual");
      });
    return this.queuedManual;
  }

  private async runOnce(trigger: MemorySyncRunTrigger): Promise<MemorySyncRunResult> {
    const config = await this.configService.getConfig();
    const source = config.source;
    if (!source.enabled || !source.memorySyncSourceId || !source.hubBaseUrl || !source.hubToken) {
      throw new Error("Memory Sync source is not fully configured.");
    }
    const hubBaseUrl = source.hubBaseUrl;
    const memorySyncSourceId = source.memorySyncSourceId;

    const startedAt = new Date().toISOString();
    await this.stateStore.updateState(hubBaseUrl, memorySyncSourceId, (state) => ({
      ...state,
      lastJobState: "running",
      lastError: null,
    }));

    try {
      const state = await this.stateStore.readState(hubBaseUrl, memorySyncSourceId);
      const scan = await this.scanner.scan();
      const plan = await this.planner.planChangedFiles(scan.files, state, trigger, new Date());
      const context: MemorySyncBatchContext = {
        hubBaseUrl,
        token: source.hubToken,
        memorySyncSourceId,
        sourceDisplayName: source.displayName,
        sourceEndpoint: this.safeBaseUrl(),
      };
      let failedFiles = plan.failed.length;
      let committedBatches = 0;
      let duplicateBatches = 0;
      let deferredFiles = plan.deferred.length + plan.waitingCount;

      await this.recordOutcomes(hubBaseUrl, memorySyncSourceId, plan.failed.map(({ entry, reason }) => ({
        status: "failed" as const,
        file: entry,
        reason,
      })));

      // Each batch's outcomes are recorded right after its send, so a later run-level error keeps them.
      for (const batch of planMemorySyncBatches(plan.changed, source.batchSize)) {
        const sent = await this.batchTransfer.send(batch, context);
        await this.recordOutcomes(hubBaseUrl, memorySyncSourceId, sent.outcomes);
        committedBatches += sent.committedBatches;
        duplicateBatches += sent.duplicateBatches;
        failedFiles += sent.outcomes.filter((outcome) => outcome.status === "failed").length;
        deferredFiles += sent.outcomes.filter((outcome) => outcome.status === "deferred").length;
      }

      const finishedAt = new Date().toISOString();
      const listedKeys = new Set(scan.files.map((entry) => toMemorySyncFileKey(entry.kind, entry.relativePath)));
      await this.stateStore.updateState(hubBaseUrl, memorySyncSourceId, (latest) => ({
        ...latest,
        // A file that no longer exists has nothing left to retry.
        fileFailures: Object.fromEntries(Object.entries(latest.fileFailures).filter(([key]) => listedKeys.has(key))),
        lastSuccessfulSyncAt: finishedAt,
        lastJobState: "success",
        lastError: null,
      }));
      return {
        startedAt,
        finishedAt,
        scannedFiles: scan.files.length,
        changedFiles: plan.changed.length,
        unchangedFiles: plan.unchangedCount,
        deferredFiles,
        failedFiles,
        committedBatches,
        duplicateBatches,
      };
    } catch (error) {
      await this.stateStore.updateState(hubBaseUrl, memorySyncSourceId, (latest) => ({
        ...latest,
        lastJobState: "error",
        lastError: error instanceof Error ? error.message : String(error),
      }));
      throw error;
    }
  }

  /** Synced files replace their record and clear their failure; failed files get a failure record, logged once per reason. */
  private async recordOutcomes(
    hubBaseUrl: string,
    memorySyncSourceId: string,
    outcomes: MemorySyncFileOutcome[],
  ): Promise<void> {
    if (outcomes.every((outcome) => outcome.status === "deferred")) {
      return;
    }
    const logged: MemorySyncFileFailure[] = [];
    await this.stateStore.updateState(hubBaseUrl, memorySyncSourceId, (state) => {
      const files = { ...state.files };
      const fileFailures = { ...state.fileFailures };
      const now = new Date();
      for (const outcome of outcomes) {
        const key = toMemorySyncFileKey(outcome.file.kind, outcome.file.relativePath);
        if (outcome.status === "synced") {
          const synced: MemorySyncSourceFileState = {
            kind: outcome.file.kind,
            relativePath: outcome.file.relativePath,
            size: outcome.file.size,
            sha256: outcome.file.sha256,
            mtimeMs: outcome.file.mtimeMs,
            lastSyncedAt: outcome.committedAt,
            lastBatchId: outcome.batchId,
          };
          files[key] = synced;
          delete fileFailures[key];
        } else if (outcome.status === "failed") {
          const previous = fileFailures[key];
          const failure = buildFileFailure(outcome.file, outcome.reason, previous, now);
          fileFailures[key] = failure;
          if (previous?.reason !== failure.reason) {
            logged.push(failure);
          }
        }
      }
      return { ...state, files, fileFailures };
    });
    for (const failure of logged) {
      logger.warn(
        `Memory Sync could not sync ${failure.kind}/${failure.relativePath} (${failure.size} bytes): ${failure.reason}. Next attempt at ${failure.nextAttemptAt}.`,
      );
    }
  }

  private safeBaseUrl(): string | null {
    try {
      return appConfigProvider.config.getBaseUrl();
    } catch {
      return null;
    }
  }
}

let singleton: MemorySyncService | null = null;

export const getMemorySyncService = (): MemorySyncService => {
  singleton ??= new MemorySyncService();
  return singleton;
};

export const resetMemorySyncServiceForTests = (): void => {
  singleton = null;
};
