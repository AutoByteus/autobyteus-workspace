import path from 'node:path';

import { MemoryStore } from './base-store.js';
import { MemoryType, MemoryItem } from '../models/memory-types.js';
import { RawTraceItem } from '../models/raw-trace-item.js';
import { EpisodicItem } from '../models/episodic-item.js';
import { SemanticItem } from '../models/semantic-item.js';
import { RunMemoryFileStore } from './run-memory-file-store.js';
import type { SystemInstructionCaptureResult } from '../models/system-instruction-trace.js';

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
    const records = this.runStore.readMemoryDicts(memoryType);
    const items = records.map((record) => this.deserialize(memoryType, record));
    return typeof limit === 'number' ? items.slice(-limit) : items;
  }

  listTurnRawTracesOrdered(limit?: number): RawTraceItem[] {
    return this.runStore.listTurnRawTracesOrdered(limit);
  }

  override listTurnRawTraceCorpusOrdered(limit?: number): RawTraceItem[] {
    return this.runStore.listTurnRawTraceCorpusOrdered(limit);
  }

  listRawTraceDicts(): Record<string, unknown>[] {
    return this.runStore.listRawTraceDicts();
  }

  override findEpisodicItemsByIds(ids: readonly string[]): EpisodicItem[] {
    return this.runStore.findEpisodicItemsByIds(ids);
  }

  override findSemanticItemsByIds(ids: readonly string[]): SemanticItem[] {
    return this.runStore.findSemanticItemsByIds(ids);
  }

  override hasMemoryArtifactIds(input: {
    episodeIds: readonly string[];
    semanticIds: readonly string[];
  }): boolean {
    return this.runStore.hasMemoryArtifactIds(input);
  }

  override archiveCompactedRawTraces(traceIds: readonly string[]): void {
    this.runStore.archiveCompactedRawTraces(traceIds);
  }

  override recordSystemInstructionSupply(content: string, suppliedAt: number): SystemInstructionCaptureResult {
    return this.runStore.recordSystemInstructionSupply(content, suppliedAt);
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
