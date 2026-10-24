import type { MemorySyncBatch, MemorySyncBatchCommitResult } from "../shared/memory-sync-types.js";
import { normalizeMemorySyncSourceId } from "../shared/memory-sync-source-id.js";
import { getMemorySyncConfigService, type MemorySyncConfigService } from "../source/memory-sync-config-service.js";
import { getMemoryHubCredentialService, type MemoryHubCredentialService } from "./memory-hub-credential-service.js";
import { getLocalFileMemoryImportStore, type LocalFileMemoryImportStore } from "./local-file-memory-import-store.js";

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
  ) {}

  async health(input: { token: string | null; memorySyncSourceId: string }): Promise<{
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
    await this.credentialService.validateCredentialForSource({
      plaintextToken: input.token,
      memorySyncSourceId,
      bindOnFirstUse: false,
    });
    return { ok: true, hubEnabled: true, memorySyncSourceId, authenticated: true, message: null };
  }

  async commitBatch(input: { token: string | null; batch: MemorySyncBatch }): Promise<MemorySyncBatchCommitResult> {
    const config = await this.configService.getConfig();
    if (!config.hub.enabled) {
      throw new MemoryHubIngestionError("Memory Hub is not enabled.", 503);
    }
    if (!input.batch || typeof input.batch !== "object") {
      throw new MemoryHubIngestionError("Memory Sync batch body is required.");
    }
    const memorySyncSourceId = normalizeMemorySyncSourceId(input.batch.memorySyncSourceId);
    await this.credentialService.validateCredentialForSource({
      plaintextToken: input.token,
      memorySyncSourceId,
      bindOnFirstUse: true,
    });
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
