import type { MemoryItem } from '../models/memory-types.js';
import { MemoryType } from '../models/memory-types.js';
import type { RawTraceItem } from '../models/raw-trace-item.js';
import type { SystemInstructionCaptureResult } from '../models/system-instruction-trace.js';

export type PreparedCompactionArchive = Readonly<{ boundaryKey: string; archivedIds: readonly string[] }>;

export abstract class MemoryStore {
  abstract add(items: Iterable<MemoryItem>): void;
  abstract list(memoryType: MemoryType, limit?: number): MemoryItem[];
  abstract listTurnRawTracesOrdered(limit?: number): RawTraceItem[];
  abstract pruneRawTracesById(traceIdsToRemove: Iterable<string>, archive?: boolean): void;

  listTurnRawTraceCorpusOrdered(limit?: number): RawTraceItem[] {
    return this.listTurnRawTracesOrdered(limit);
  }

  prepareCompactionArchive(_selectedTurnTraceIds: readonly string[]): PreparedCompactionArchive {
    throw new Error(`${this.constructor.name} does not support compaction archive preparation.`);
  }

  prunePreparedCompactionArchive(_prepared: PreparedCompactionArchive, _retainedIds: readonly string[]): void {
    throw new Error(`${this.constructor.name} does not support compaction archive pruning.`);
  }

  recordSystemInstructionSupply(_content: string, _suppliedAt: number): SystemInstructionCaptureResult {
    throw new Error(`${this.constructor.name} does not support system-instruction capture.`);
  }
}
