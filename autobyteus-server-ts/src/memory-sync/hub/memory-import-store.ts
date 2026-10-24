import type {
  MemorySyncBatch,
  MemorySyncBatchCommitResult,
  MemorySyncManifest,
  SourceMetadata,
} from "../shared/memory-sync-types.js";

export interface MemoryImportStore {
  commitBatch(batch: MemorySyncBatch): Promise<MemorySyncBatchCommitResult>;
  listSourceIds(): Promise<string[]>;
  readSourceMetadata(sourceId: string): Promise<SourceMetadata | null>;
  readManifest(sourceId: string): Promise<MemorySyncManifest>;
  getImportRootDir(sourceId: string): string;
  sourceExists(sourceId: string): Promise<boolean>;
}
