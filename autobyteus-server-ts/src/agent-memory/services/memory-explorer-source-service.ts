import { appConfigProvider } from "../../config/app-config-provider.js";
import { getMemoryImportCatalogService, type MemoryImportCatalogService } from "../../memory-sync/hub/memory-import-catalog-service.js";
import { getLocalFileMemoryImportStore, type LocalFileMemoryImportStore } from "../../memory-sync/hub/local-file-memory-import-store.js";
import type { MemoryExplorerSourceInput, MemoryExplorerSourceOption } from "../../memory-sync/shared/memory-sync-types.js";
import { normalizeMemorySyncSourceId } from "../../memory-sync/shared/memory-sync-source-id.js";
import { isMemorySyncReady, MEMORY_SYNC_NOT_MIGRATED, MEMORY_SYNC_NOT_MIGRATED_TEXT } from "../../memory-sync/shared/memory-sync-capability.js";

export type ResolvedMemoryExplorerSource = {
  source: MemoryExplorerSourceInput;
  rootDir: string;
  readOnly: boolean;
  option: MemoryExplorerSourceOption;
};

export class MemoryExplorerSourceError extends Error {
  constructor(message: string, public readonly code: "UNKNOWN_IMPORTED_SOURCE" | "INVALID_SOURCE" | typeof MEMORY_SYNC_NOT_MIGRATED) {
    super(message);
    this.name = "MemoryExplorerSourceError";
  }
}

const localOption = (): MemoryExplorerSourceOption => ({
  key: "local",
  type: "LOCAL",
  label: "Local Memory",
  memorySyncSourceId: null,
  displayName: null,
  readOnly: false,
  lastImportedAt: null,
  lastSyncStatus: null,
});

export class MemoryExplorerSourceService {
  constructor(
    private readonly catalogService: MemoryImportCatalogService = getMemoryImportCatalogService(),
    private readonly importStore: LocalFileMemoryImportStore = getLocalFileMemoryImportStore(),
  ) {}

  /** While Memory Sync is held back (autobyteus-290 `memory_sync`), only this node's own memory is listed. */
  async listSources(): Promise<MemoryExplorerSourceOption[]> {
    if (!isMemorySyncReady()) return [localOption()];
    const imports = await this.catalogService.listImports();
    return [
      localOption(),
      ...imports.map((summary) => ({
        key: `imported:${summary.memorySyncSourceId}` as const,
        type: "IMPORTED" as const,
        label: `Imported: ${summary.displayName || summary.memorySyncSourceId}`,
        memorySyncSourceId: summary.memorySyncSourceId,
        displayName: summary.displayName,
        readOnly: true,
        lastImportedAt: summary.lastImportedAt,
        lastSyncStatus: summary.lastSyncStatus,
      })),
    ];
  }

  async resolveSource(input?: MemoryExplorerSourceInput | null): Promise<ResolvedMemoryExplorerSource> {
    if (!input || input.type !== "IMPORTED") {
      return {
        source: { type: "LOCAL" },
        rootDir: appConfigProvider.config.getMemoryDir(),
        readOnly: false,
        option: localOption(),
      };
    }

    if (!isMemorySyncReady()) {
      throw new MemoryExplorerSourceError(MEMORY_SYNC_NOT_MIGRATED_TEXT, MEMORY_SYNC_NOT_MIGRATED);
    }
    let memorySyncSourceId: string;
    try {
      memorySyncSourceId = normalizeMemorySyncSourceId(input.memorySyncSourceId);
    } catch (error) {
      throw new MemoryExplorerSourceError(error instanceof Error ? error.message : String(error), "INVALID_SOURCE");
    }
    if (!(await this.importStore.sourceExists(memorySyncSourceId))) {
      throw new MemoryExplorerSourceError(`Imported memory source '${memorySyncSourceId}' was not found.`, "UNKNOWN_IMPORTED_SOURCE");
    }
    const metadata = await this.importStore.readMemorySyncSourceMetadata(memorySyncSourceId);
    return {
      source: { type: "IMPORTED", memorySyncSourceId },
      rootDir: this.importStore.getImportRootDir(memorySyncSourceId),
      readOnly: true,
      option: {
        key: `imported:${memorySyncSourceId}`,
        type: "IMPORTED",
        label: `Imported: ${metadata?.displayName || memorySyncSourceId}`,
        memorySyncSourceId,
        displayName: metadata?.displayName ?? null,
        readOnly: true,
        lastImportedAt: metadata?.lastImportedAt ?? null,
        lastSyncStatus: metadata?.lastSyncStatus ?? null,
      },
    };
  }
}

let singleton: MemoryExplorerSourceService | null = null;

export const getMemoryExplorerSourceService = (): MemoryExplorerSourceService => {
  singleton ??= new MemoryExplorerSourceService();
  return singleton;
};

export const resetMemoryExplorerSourceServiceForTests = (): void => {
  singleton = null;
};
