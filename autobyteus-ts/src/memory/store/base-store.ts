import type { MemoryItem } from '../models/memory-types.js';
import { MemoryType } from '../models/memory-types.js';
import type { RawTraceItem } from '../models/raw-trace-item.js';
import type { CompactedMemoryManifest } from './compacted-memory-manifest.js';

export abstract class MemoryStore {
  abstract add(items: Iterable<MemoryItem>): void;
  abstract list(memoryType: MemoryType, limit?: number): MemoryItem[];
  abstract listRawTracesOrdered(limit?: number): RawTraceItem[];
  abstract pruneRawTracesById(traceIdsToRemove: Iterable<string>, archive?: boolean): void;

  readSemanticDicts(): Record<string, unknown>[] {
    throw new Error(`${this.constructor.name} does not support semantic schema-gate reads.`);
  }

  clearSemanticItems(): void {
    throw new Error(`${this.constructor.name} does not support semantic schema-gate resets.`);
  }

  readCompactedMemoryManifest(): CompactedMemoryManifest | null {
    throw new Error(`${this.constructor.name} does not support compacted-memory manifest reads.`);
  }

  writeCompactedMemoryManifest(_manifest: CompactedMemoryManifest): void {
    throw new Error(`${this.constructor.name} does not support compacted-memory manifest writes.`);
  }
}
