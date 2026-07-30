import type { MemoryItem } from '../models/memory-types.js';
import { MemoryType } from '../models/memory-types.js';
import type { RawTraceItem } from '../models/raw-trace-item.js';
import type { EpisodicItem } from '../models/episodic-item.js';
import type { SemanticItem } from '../models/semantic-item.js';
import type { CompletedRawTraceArchiveDescriptor } from './raw-trace-archive-manager.js';

export abstract class MemoryStore {
  abstract add(items: Iterable<MemoryItem>): void;
  abstract list(memoryType: MemoryType, limit?: number): MemoryItem[];
  abstract listRawTracesOrdered(limit?: number): RawTraceItem[];
  abstract pruneRawTracesById(traceIdsToRemove: Iterable<string>, archive?: boolean): void;

  listRawTraceCorpusOrdered(limit?: number): RawTraceItem[] {
    return this.listRawTracesOrdered(limit);
  }

  findEpisodicItemsByIds(_ids: readonly string[]): EpisodicItem[] {
    throw new Error(`${this.constructor.name} does not support exact episodic lookup.`);
  }

  findSemanticItemsByIds(_ids: readonly string[]): SemanticItem[] {
    throw new Error(`${this.constructor.name} does not support exact semantic lookup.`);
  }

  hasMemoryArtifactIds(_input: {
    episodeIds: readonly string[];
    semanticIds: readonly string[];
  }): boolean {
    throw new Error(`${this.constructor.name} does not support artifact-ID collision checks.`);
  }

  archiveExactRawTraces(
    _traceIds: readonly string[],
    _compactionId: string,
  ): CompletedRawTraceArchiveDescriptor {
    throw new Error(`${this.constructor.name} does not support exact raw-trace archiving.`);
  }
}
