import type { MemorySyncBatch, MemorySyncBatchCommitResult } from "../shared/memory-sync-types.js";
import { normalizeMemorySyncSourceId } from "../shared/memory-sync-source-id.js";
import { getMemorySyncConfigService, type MemorySyncConfigService } from "../source/memory-sync-config-service.js";
import { getMemoryHubCredentialService, type MemoryHubCredentialService } from "./memory-hub-credential-service.js";
import { getLocalFileMemoryImportStore, type LocalFileMemoryImportStore } from "./local-file-memory-import-store.js";
import { getMemoryHubStagedFileStore, type MemoryHubStagedFileStore } from "./memory-hub-staged-file-store.js";
import { MEMORY_SYNC_STAGING_SWEEP_INTERVAL_MS } from "../shared/memory-sync-transfer-limits.js";

const logger = { warn: (...args: unknown[]) => console.warn(...args) };

export class MemoryHubIngestionError extends Error {
  constructor(message: string, public readonly statusCode = 400) {
    super(message);
    this.name = "MemoryHubIngestionError";
  }
}

export class MemoryHubIngestionService {
  constructor(
    private readonly configService: MemorySyncConfigService = getMemorySyncConfigService(),
    private readonly credentialService: MemoryHubCredentialService = getMemoryHubCredentialService(),
    private readonly importStore: LocalFileMemoryImportStore = getLocalFileMemoryImportStore(),
    private readonly stagedFiles: MemoryHubStagedFileStore = getMemoryHubStagedFileStore(),
  ) {}

  private sweepRunning = false;
  private lastSweepStartedAt = 0;

  /**
   * The only owner of the staging sweep's cadence: starts `sweepStale()` in the background when none is running and
   * the last one started at least an hour ago. Returns at once; no request waits for a sweep. Called by every
   * ingestion method and once at startup.
   */
  requestStagingSweep(): void {
    const now = Date.now();
    if (this.sweepRunning || now - this.lastSweepStartedAt < MEMORY_SYNC_STAGING_SWEEP_INTERVAL_MS) {
      return;
    }
    this.sweepRunning = true;
    this.lastSweepStartedAt = now;
    this.stagedFiles.sweepStale()
      .catch((error) => logger.warn(`Memory Sync staging sweep failed: ${String(error)}`))
      .finally(() => {
        this.sweepRunning = false;
      });
  }

  private async requireEnabledHub(): Promise<void> {
    const config = await this.configService.getConfig();
    if (!config.hub.enabled) {
      throw new MemoryHubIngestionError("Memory Hub is not enabled.", 503);
    }
  }

  private async bindSource(credentialId: string, memorySyncSourceIdInput: string): Promise<string> {
    const memorySyncSourceId = normalizeMemorySyncSourceId(memorySyncSourceIdInput);
    await this.credentialService.bindCredentialToSource({ credentialId, memorySyncSourceId, bindOnFirstUse: true });
    return memorySyncSourceId;
  }

  async getStagedFileStatus(input: {
    credentialId: string;
    memorySyncSourceId: string;
    sha256: string;
  }): Promise<{ receivedBytes: number }> {
    this.requestStagingSweep();
    await this.requireEnabledHub();
    const memorySyncSourceId = await this.bindSource(input.credentialId, input.memorySyncSourceId);
    return { receivedBytes: await this.stagedFiles.receivedBytes(memorySyncSourceId, input.sha256) };
  }

  async receiveStagedFilePiece(input: {
    credentialId: string;
    memorySyncSourceId: string;
    sha256: string;
    offset: number;
    bytes: Buffer;
  }): Promise<{ receivedBytes: number }> {
    this.requestStagingSweep();
    await this.requireEnabledHub();
    const memorySyncSourceId = await this.bindSource(input.credentialId, input.memorySyncSourceId);
    return {
      receivedBytes: await this.stagedFiles.appendPiece(memorySyncSourceId, input.sha256, input.offset, input.bytes),
    };
  }

  /** `credentialId`: the memory sync source credential the node's request gate verified for this request. */
  async health(input: { credentialId: string; memorySyncSourceId: string }): Promise<{
    ok: boolean;
    hubEnabled: boolean;
    memorySyncSourceId: string;
    authenticated: boolean;
    message: string | null;
  }> {
    const memorySyncSourceId = normalizeMemorySyncSourceId(input.memorySyncSourceId);
    const config = await this.configService.getConfig();
    if (!config.hub.enabled) {
      throw new MemoryHubIngestionError("Memory Hub is not enabled.", 503);
    }
    await this.credentialService.bindCredentialToSource({
      credentialId: input.credentialId,
      memorySyncSourceId,
      bindOnFirstUse: false,
    });
    return { ok: true, hubEnabled: true, memorySyncSourceId, authenticated: true, message: null };
  }

  async commitBatch(input: { credentialId: string; batch: MemorySyncBatch }): Promise<MemorySyncBatchCommitResult> {
    this.requestStagingSweep();
    await this.requireEnabledHub();
    if (!input.batch || typeof input.batch !== "object") {
      throw new MemoryHubIngestionError("Memory Sync batch body is required.");
    }
    const memorySyncSourceId = await this.bindSource(input.credentialId, input.batch.memorySyncSourceId);
    return this.importStore.commitBatch({ ...input.batch, memorySyncSourceId });
  }
}

let singleton: MemoryHubIngestionService | null = null;

export const getMemoryHubIngestionService = (): MemoryHubIngestionService => {
  singleton ??= new MemoryHubIngestionService();
  return singleton;
};

export const resetMemoryHubIngestionServiceForTests = (): void => {
  singleton = null;
};
