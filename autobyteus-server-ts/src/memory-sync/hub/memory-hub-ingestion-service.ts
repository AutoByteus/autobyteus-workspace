import type { MemorySyncBatch, MemorySyncBatchCommitResult } from "../shared/memory-sync-types.js";
import { normalizeSourceNodeId } from "../shared/source-node-id.js";
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

  async health(input: { token: string | null; sourceNodeId: string }): Promise<{
    ok: boolean;
    hubEnabled: boolean;
    sourceNodeId: string;
    authenticated: boolean;
    message: string | null;
  }> {
    const sourceNodeId = normalizeSourceNodeId(input.sourceNodeId);
    const config = await this.configService.getConfig();
    if (!config.hub.enabled) {
      throw new MemoryHubIngestionError("Memory Hub is not enabled.", 503);
    }
    await this.credentialService.validateCredentialForSource({
      plaintextToken: input.token,
      sourceNodeId,
      bindOnFirstUse: false,
    });
    return { ok: true, hubEnabled: true, sourceNodeId, authenticated: true, message: null };
  }

  async commitBatch(input: { token: string | null; batch: MemorySyncBatch }): Promise<MemorySyncBatchCommitResult> {
    const config = await this.configService.getConfig();
    if (!config.hub.enabled) {
      throw new MemoryHubIngestionError("Memory Hub is not enabled.", 503);
    }
    if (!input.batch || typeof input.batch !== "object") {
      throw new MemoryHubIngestionError("Memory Sync batch body is required.");
    }
    const sourceNodeId = normalizeSourceNodeId(input.batch.sourceNodeId);
    await this.credentialService.validateCredentialForSource({
      plaintextToken: input.token,
      sourceNodeId,
      bindOnFirstUse: true,
    });
    return this.importStore.commitBatch({ ...input.batch, sourceNodeId });
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
