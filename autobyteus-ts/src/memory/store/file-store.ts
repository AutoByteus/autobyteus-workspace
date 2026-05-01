import path from 'node:path';

import { MemoryStore } from './base-store.js';
import { MemoryType, MemoryItem } from '../models/memory-types.js';
import { RawTraceItem } from '../models/raw-trace-item.js';
import { EpisodicItem } from '../models/episodic-item.js';
import { SemanticItem } from '../models/semantic-item.js';
import type { CompactedMemoryManifest } from './compacted-memory-manifest.js';
import { RunMemoryFileStore } from './run-memory-file-store.js';

export class FileMemoryStore extends MemoryStore {
  baseDir: string;
  agentId: string;
  agentDir: string;
  private readonly runStore: RunMemoryFileStore;

  constructor(
    baseDir: string,
    agentId: string,
    options: { agentRootSubdir?: string } = {}
  ) {
    super();
    this.baseDir = baseDir;
    this.agentId = agentId;
    const agentRootSubdir = options.agentRootSubdir ?? 'agents';
    this.agentDir = agentRootSubdir
      ? path.join(this.baseDir, agentRootSubdir, agentId)
      : this.baseDir;
    this.runStore = new RunMemoryFileStore(this.agentDir);
  }

  add(items: Iterable<MemoryItem>): void {
    this.runStore.add(items);
  }

  list(memoryType: MemoryType, limit?: number): MemoryItem[] {
    return this.runStore
      .readMemoryDicts(memoryType, limit)
      .map((record) => this.deserialize(memoryType, record));
  }

  listRawTracesOrdered(limit?: number): RawTraceItem[] {
    return this.runStore.listRawTracesOrdered(limit);
  }

  listRawTraceDicts(): Record<string, unknown>[] {
    return this.runStore.listRawTraceDicts();
  }

  override readSemanticDicts(): Record<string, unknown>[] {
    return this.runStore.readSemanticDicts();
  }

  replaceSemanticItems(items: Iterable<SemanticItem>): void {
    this.runStore.replaceSemanticDicts(Array.from(items, (item) => item.toDict()));
  }

  override clearSemanticItems(): void {
    this.runStore.clearSemanticItems();
  }

  override readCompactedMemoryManifest(): CompactedMemoryManifest | null {
    return this.runStore.readCompactedMemoryManifest();
  }

  override writeCompactedMemoryManifest(manifest: CompactedMemoryManifest): void {
    this.runStore.writeCompactedMemoryManifest(manifest);
  }

  readArchiveRawTraces(): Record<string, unknown>[] {
    return this.runStore.readCompleteArchiveRawTraceDicts();
  }

  pruneRawTracesById(traceIdsToRemove: Iterable<string>, archive = true): void {
    this.runStore.pruneRawTracesById(traceIdsToRemove, archive);
  }

  private deserialize(memoryType: MemoryType, data: Record<string, unknown>): MemoryItem {
    if (memoryType === MemoryType.RAW_TRACE) {
      return RawTraceItem.fromDict(data);
    }
    if (memoryType === MemoryType.EPISODIC) {
      return EpisodicItem.fromDict(data);
    }
    if (memoryType === MemoryType.SEMANTIC) {
      return SemanticItem.fromDict(data);
    }
    throw new Error(`Unknown memory type: ${memoryType}`);
  }
}
