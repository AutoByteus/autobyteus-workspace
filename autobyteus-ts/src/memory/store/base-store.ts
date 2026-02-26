import type { MemoryItem } from '../models/memory-types.js';
import { MemoryType } from '../models/memory-types.js';

export abstract class MemoryStore {
  abstract add(items: Iterable<MemoryItem>): void;
  abstract list(memoryType: MemoryType, limit?: number): MemoryItem[];
}
