import { randomBytes } from "node:crypto";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { toMemorySyncFileKey } from "../shared/memory-sync-path-policy.js";
import type { MemoryFileOperation, MemorySyncBatch, MemorySyncSourceFileState } from "../shared/memory-sync-types.js";
import { LocalMemoryExportScanner } from "./local-memory-export-scanner.js";
import { MemoryFileChangePlanner } from "./memory-file-change-planner.js";
import { MemoryHubClient } from "./memory-hub-client.js";
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
  committedBatches: number;
  duplicateBatches: number;
};

const createBatchId = (): string => `batch-${new Date().toISOString().replace(/[:.]/g, "")}-${randomBytes(6).toString("hex")}`;

export class MemorySyncService {
  private running: Promise<MemorySyncRunResult> | null = null;

  constructor(
    private readonly configService: MemorySyncConfigService = getMemorySyncConfigService(),
    private readonly stateStore: LocalFileMemorySyncStateStore = getLocalFileMemorySyncStateStore(),
    private readonly scanner = new LocalMemoryExportScanner(),
    private readonly planner = new MemoryFileChangePlanner(),
    private readonly hubClient = new MemoryHubClient(),
  ) {}

  async startManualSync(): Promise<MemorySyncRunResult> {
    return this.startSync();
  }

  async startSync(): Promise<MemorySyncRunResult> {
    if (this.running) {
      return this.running;
    }
    this.running = this.runOnce().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async runOnce(): Promise<MemorySyncRunResult> {
    const config = await this.configService.getConfig();
    const source = config.source;
    if (!source.enabled || !source.sourceNodeId || !source.hubBaseUrl || !source.hubToken) {
      throw new Error("Memory Sync source is not fully configured.");
    }

    const startedAt = new Date().toISOString();
    await this.stateStore.updateState(source.hubBaseUrl, source.sourceNodeId, (state) => ({
      ...state,
      lastJobState: "running",
      lastError: null,
    }));

    try {
      const state = await this.stateStore.readState(source.hubBaseUrl, source.sourceNodeId);
      const scan = await this.scanner.scan();
      const plan = await this.planner.planChangedFiles(scan.files, state.files, { maxOperations: source.batchSize });
      let committedBatches = 0;
      let duplicateBatches = 0;

      if (plan.operations.length > 0) {
        for (const batchOperations of this.chunkOperations(plan.operations, source.batchSize)) {
          const batch: MemorySyncBatch = {
            protocolVersion: 1,
            batchId: createBatchId(),
            sourceNodeId: source.sourceNodeId,
            sourceDisplayName: source.displayName,
            sourceEndpoint: this.safeBaseUrl(),
            generatedAt: new Date().toISOString(),
            operations: batchOperations,
          };
          const response = await this.hubClient.pushBatch({
            hubBaseUrl: source.hubBaseUrl,
            token: source.hubToken,
            batch,
          });
          committedBatches += response.duplicate ? 0 : 1;
          duplicateBatches += response.duplicate ? 1 : 0;
          await this.markOperationsSynced(source.hubBaseUrl, source.sourceNodeId, batchOperations, response.batchId, response.committedAt);
        }
      }

      const finishedAt = new Date().toISOString();
      await this.stateStore.updateState(source.hubBaseUrl, source.sourceNodeId, (latest) => ({
        ...latest,
        lastSuccessfulSyncAt: finishedAt,
        lastJobState: "success",
        lastError: null,
      }));
      return {
        startedAt,
        finishedAt,
        scannedFiles: scan.files.length,
        changedFiles: plan.operations.length,
        unchangedFiles: plan.unchangedCount,
        deferredFiles: scan.deferred.length + plan.deferred.length,
        committedBatches,
        duplicateBatches,
      };
    } catch (error) {
      await this.stateStore.updateState(source.hubBaseUrl, source.sourceNodeId, (latest) => ({
        ...latest,
        lastJobState: "error",
        lastError: error instanceof Error ? error.message : String(error),
      }));
      throw error;
    }
  }

  private async markOperationsSynced(
    hubBaseUrl: string,
    sourceNodeId: string,
    operations: MemoryFileOperation[],
    batchId: string,
    syncedAt: string,
  ): Promise<void> {
    await this.stateStore.updateState(hubBaseUrl, sourceNodeId, (state) => {
      const files = { ...state.files };
      for (const operation of operations) {
        const key = toMemorySyncFileKey(operation.kind, operation.relativePath);
        const nextState: MemorySyncSourceFileState = {
          kind: operation.kind,
          relativePath: operation.relativePath,
          size: operation.size,
          sha256: operation.sha256,
          mtimeMs: operation.mtimeMs ?? null,
          lastSyncedAt: syncedAt,
          lastBatchId: batchId,
        };
        files[key] = nextState;
      }
      return { ...state, files };
    });
  }

  private chunkOperations(operations: MemoryFileOperation[], batchSize: number): MemoryFileOperation[][] {
    const chunks: MemoryFileOperation[][] = [];
    for (let index = 0; index < operations.length; index += batchSize) {
      chunks.push(operations.slice(index, index + batchSize));
    }
    return chunks;
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
