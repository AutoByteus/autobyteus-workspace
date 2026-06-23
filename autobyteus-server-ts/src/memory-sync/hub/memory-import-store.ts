import type {
  MemorySyncBatch,
  MemorySyncBatchCommitResult,
  MemorySyncManifest,
  SourceNodeMetadata,
} from "../shared/memory-sync-types.js";

export interface MemoryImportStore {
  commitBatch(batch: MemorySyncBatch): Promise<MemorySyncBatchCommitResult>;
  listSourceNodeIds(): Promise<string[]>;
  readSourceMetadata(sourceNodeId: string): Promise<SourceNodeMetadata | null>;
  readManifest(sourceNodeId: string): Promise<MemorySyncManifest>;
  getImportRootDir(sourceNodeId: string): string;
  sourceExists(sourceNodeId: string): Promise<boolean>;
}
