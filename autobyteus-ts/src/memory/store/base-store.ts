import type { MemoryItem } from '../models/memory-types.js';
import { MemoryType } from '../models/memory-types.js';
import type { RawTraceItem } from '../models/raw-trace-item.js';
import type { EpisodicItem } from '../models/episodic-item.js';
import type { SemanticItem } from '../models/semantic-item.js';
import type { SystemInstructionCaptureResult } from '../models/system-instruction-trace.js';

export abstract class MemoryStore {
  abstract add(items: Iterable<MemoryItem>): void;
  abstract list(memoryType: MemoryType, limit?: number): MemoryItem[];
  abstract listTurnRawTracesOrdered(limit?: number): RawTraceItem[];
  abstract pruneRawTracesById(traceIdsToRemove: Iterable<string>, archive?: boolean): void;

  listTurnRawTraceCorpusOrdered(limit?: number): RawTraceItem[] {
    return this.listTurnRawTracesOrdered(limit);
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

  archiveCompactedRawTraces(_selectedTurnTraceIds: readonly string[]): void {
    throw new Error(`${this.constructor.name} does not support compacted raw-trace archiving.`);
  }

  recordSystemInstructionSupply(_content: string, _suppliedAt: number): SystemInstructionCaptureResult {
    throw new Error(`${this.constructor.name} does not support system-instruction capture.`);
  }
}
