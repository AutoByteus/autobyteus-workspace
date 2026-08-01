import type { CompactionLineageRecord } from '../lineage/compaction-lineage-record.js';
import type { CompactedMemoryCategory } from '../models/semantic-item.js';

export type ProjectedEpisode = {
  id: string;
  ts: number;
  summary: string;
  salience: number;
};

export type ProjectedSemantic = {
  id: string;
  ts: number;
  category: CompactedMemoryCategory;
  fact: string;
  salience: number;
};

export type CompactedMemoryProjectionBundle = {
  lineageHead: CompactionLineageRecord;
  episodes: ProjectedEpisode[];
  semantics: ProjectedSemantic[];
};
