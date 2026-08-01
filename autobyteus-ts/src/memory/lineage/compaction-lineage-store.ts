import type { MemoryArtifactRef } from './memory-origin-resolution.js';
import type { CompactionLineageRecord } from './compaction-lineage-record.js';

export interface CompactionLineageStore {
  appendNext(
    expectedPreviousCompactionId: string | null,
    record: CompactionLineageRecord,
  ): void;
  list(): CompactionLineageRecord[];
  readHead(): CompactionLineageRecord | null;
  getByCompactionId(compactionId: string): CompactionLineageRecord | null;
  findProducingRecord(artifact: MemoryArtifactRef): CompactionLineageRecord | null;
}
