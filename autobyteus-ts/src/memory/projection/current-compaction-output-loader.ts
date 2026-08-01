import type { CompactionLineageStore } from '../lineage/compaction-lineage-store.js';
import type { MemoryStore } from '../store/base-store.js';
import type { CompactedMemoryProjectionBundle } from './compacted-memory-projection-bundle.js';

export class CurrentCompactionOutputLoader {
  constructor(
    private readonly lineageStore: CompactionLineageStore,
    private readonly memoryStore: MemoryStore,
  ) {}

  loadCurrent(): CompactedMemoryProjectionBundle | null {
    const record = this.lineageStore.readHead();
    if (!record) return null;
    const episodes = this.memoryStore.findEpisodicItemsByIds(record.episodeIds);
    const semantics = this.memoryStore.findSemanticItemsByIds(record.semanticIds);
    if (
      JSON.stringify(episodes.map(({ id }) => id)) !== JSON.stringify(record.episodeIds)
      || JSON.stringify(semantics.map(({ id }) => id)) !== JSON.stringify(record.semanticIds)
    ) {
      throw new Error(
        `Current compaction '${record.compactionId}' output rows do not match lineage membership.`,
      );
    }
    return {
      lineageHead: record,
      episodes: episodes.map((item) => ({
        id: item.id,
        ts: item.ts,
        summary: item.summary,
        salience: item.salience,
      })),
      semantics: semantics.map((item) => ({
        id: item.id,
        ts: item.ts,
        category: item.category,
        fact: item.fact,
        salience: item.salience,
      })),
    };
  }
}
