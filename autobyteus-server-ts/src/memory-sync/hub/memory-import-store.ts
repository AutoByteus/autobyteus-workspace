import type {
  MemorySyncBatch,
  MemorySyncBatchCommitResult,
  MemorySyncManifest,
  MemorySyncSourceMetadata,
} from "../shared/memory-sync-types.js";

export interface MemoryImportStore {
  commitBatch(batch: MemorySyncBatch): Promise<MemorySyncBatchCommitResult>;
  listMemorySyncSourceIds(): Promise<string[]>;
  readMemorySyncSourceMetadata(memorySyncSourceId: string): Promise<MemorySyncSourceMetadata | null>;
  readManifest(memorySyncSourceId: string): Promise<MemorySyncManifest>;
  getImportRootDir(memorySyncSourceId: string): string;
  sourceExists(memorySyncSourceId: string): Promise<boolean>;
}
