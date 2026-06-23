import type { MemoryImportSummary } from "../shared/memory-sync-types.js";
import {
  getLocalFileMemoryImportStore,
  type LocalFileMemoryImportStore,
} from "./local-file-memory-import-store.js";

export class MemoryImportCatalogService {
  constructor(private readonly store: LocalFileMemoryImportStore = getLocalFileMemoryImportStore()) {}

  async listImports(): Promise<MemoryImportSummary[]> {
    const sourceNodeIds = await this.store.listSourceNodeIds();
    const summaries: MemoryImportSummary[] = [];
    for (const sourceNodeId of sourceNodeIds) {
      const [metadata, manifest] = await Promise.all([
        this.store.readSourceMetadata(sourceNodeId),
        this.store.readManifest(sourceNodeId),
      ]);
      summaries.push({
        sourceNodeId,
        displayName: metadata?.displayName ?? null,
        lastKnownEndpoint: metadata?.lastKnownEndpoint ?? null,
        firstImportedAt: metadata?.firstImportedAt ?? null,
        lastImportedAt: metadata?.lastImportedAt ?? manifest.lastCommittedAt,
        lastSyncStatus: metadata?.lastSyncStatus ?? null,
        lastError: metadata?.lastError ?? null,
        fileCount: manifest.totals.fileCount,
        totalBytes: manifest.totals.totalBytes,
        lastCommittedBatchId: manifest.lastCommittedBatchId,
        lastCommittedAt: manifest.lastCommittedAt,
      });
    }
    return summaries.sort((a, b) => (b.lastImportedAt ?? "").localeCompare(a.lastImportedAt ?? ""));
  }
}

let singleton: MemoryImportCatalogService | null = null;

export const getMemoryImportCatalogService = (): MemoryImportCatalogService => {
  singleton ??= new MemoryImportCatalogService();
  return singleton;
};

export const resetMemoryImportCatalogServiceForTests = (): void => {
  singleton = null;
};
