import { appConfigProvider } from "../../config/app-config-provider.js";
import { getMemoryImportCatalogService, type MemoryImportCatalogService } from "../../memory-sync/hub/memory-import-catalog-service.js";
import { getLocalFileMemoryImportStore, type LocalFileMemoryImportStore } from "../../memory-sync/hub/local-file-memory-import-store.js";
import type { MemoryExplorerSourceInput, MemoryExplorerSourceOption } from "../../memory-sync/shared/memory-sync-types.js";
import { normalizeSourceNodeId } from "../../memory-sync/shared/source-node-id.js";

export type ResolvedMemoryExplorerSource = {
  source: MemoryExplorerSourceInput;
  rootDir: string;
  readOnly: boolean;
  option: MemoryExplorerSourceOption;
};

export class MemoryExplorerSourceError extends Error {
  constructor(message: string, public readonly code: "UNKNOWN_IMPORTED_SOURCE" | "INVALID_SOURCE") {
    super(message);
    this.name = "MemoryExplorerSourceError";
  }
}

const localOption = (): MemoryExplorerSourceOption => ({
  key: "local",
  type: "LOCAL",
  label: "Local Memory",
  sourceNodeId: null,
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

  async listSources(): Promise<MemoryExplorerSourceOption[]> {
    const imports = await this.catalogService.listImports();
    return [
      localOption(),
      ...imports.map((summary) => ({
        key: `imported:${summary.sourceNodeId}` as const,
        type: "IMPORTED" as const,
        label: `Imported: ${summary.displayName || summary.sourceNodeId}`,
        sourceNodeId: summary.sourceNodeId,
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

    let sourceNodeId: string;
    try {
      sourceNodeId = normalizeSourceNodeId(input.sourceNodeId);
    } catch (error) {
      throw new MemoryExplorerSourceError(error instanceof Error ? error.message : String(error), "INVALID_SOURCE");
    }
    if (!(await this.importStore.sourceExists(sourceNodeId))) {
      throw new MemoryExplorerSourceError(`Imported memory source '${sourceNodeId}' was not found.`, "UNKNOWN_IMPORTED_SOURCE");
    }
    const metadata = await this.importStore.readSourceMetadata(sourceNodeId);
    return {
      source: { type: "IMPORTED", sourceNodeId },
      rootDir: this.importStore.getImportRootDir(sourceNodeId),
      readOnly: true,
      option: {
        key: `imported:${sourceNodeId}`,
        type: "IMPORTED",
        label: `Imported: ${metadata?.displayName || sourceNodeId}`,
        sourceNodeId,
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
