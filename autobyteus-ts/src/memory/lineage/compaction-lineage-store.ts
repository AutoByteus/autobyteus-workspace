import type { CompactionLineageRecord } from './compaction-lineage-record.js';

export interface CompactionLineageStore {
  appendNext(
    expectedPreviousCompactionId: string | null,
    record: CompactionLineageRecord,
  ): void;
  list(): CompactionLineageRecord[];
  readHead(): CompactionLineageRecord | null;
}
