import fs from 'node:fs';
import path from 'node:path';

import { MemoryStore } from './base-store.js';
import { MemoryType, MemoryItem } from '../models/memory-types.js';
import { RawTraceItem } from '../models/raw-trace-item.js';
import { EpisodicItem } from '../models/episodic-item.js';
import { SemanticItem } from '../models/semantic-item.js';
import type { CompactedMemoryManifest } from './compacted-memory-manifest.js';

const readJsonl = (filePath: string): Record<string, unknown>[] => {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return fs.readFileSync(filePath, 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
};

const writeJsonl = (filePath: string, items: Record<string, unknown>[]): void => {
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, items.map((item) => JSON.stringify(item)).join('\n') + (items.length ? '\n' : ''), 'utf-8');
  fs.renameSync(tmpPath, filePath);
};

export class FileMemoryStore extends MemoryStore {
  baseDir: string;
  agentId: string;
  agentDir: string;

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
    fs.mkdirSync(this.agentDir, { recursive: true });
  }

  add(items: Iterable<MemoryItem>): void {
    for (const item of items) {
      const memoryType = item.memoryType;
      const filePath = this.getFilePath(memoryType);
      const record = item.toDict();
      fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, 'utf-8');
    }
  }

  list(memoryType: MemoryType, limit?: number): MemoryItem[] {
    const filePath = this.getFilePath(memoryType);
    const records = readJsonl(filePath);
    const sliced = typeof limit === 'number' ? records.slice(-limit) : records;
    return sliced.map((record) => this.deserialize(memoryType, record));
  }

  listRawTracesOrdered(limit?: number): RawTraceItem[] {
    return this.list(MemoryType.RAW_TRACE, limit) as RawTraceItem[];
  }

  listRawTraceDicts(): Record<string, unknown>[] {
    return readJsonl(this.getFilePath(MemoryType.RAW_TRACE));
  }

  override readSemanticDicts(): Record<string, unknown>[] {
    return readJsonl(this.getFilePath(MemoryType.SEMANTIC));
  }

  replaceSemanticItems(items: Iterable<SemanticItem>): void {
    writeJsonl(this.getFilePath(MemoryType.SEMANTIC), Array.from(items, (item) => item.toDict()));
  }

  override clearSemanticItems(): void {
    writeJsonl(this.getFilePath(MemoryType.SEMANTIC), []);
  }

  override readCompactedMemoryManifest(): CompactedMemoryManifest | null {
    const filePath = this.getManifestPath();
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as CompactedMemoryManifest;
  }

  override writeCompactedMemoryManifest(manifest: CompactedMemoryManifest): void {
    const filePath = this.getManifestPath();
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(manifest), 'utf-8');
    fs.renameSync(tmpPath, filePath);
  }

  readArchiveRawTraces(): Record<string, unknown>[] {
    return readJsonl(this.getArchivePath());
  }

  pruneRawTracesById(traceIdsToRemove: Iterable<string>, archive = true): void {
    const traceIdSet = new Set(Array.from(traceIdsToRemove));
    if (!traceIdSet.size) {
      return;
    }

    const rawItems = this.listRawTraceDicts();
    if (!rawItems.length) {
      return;
    }

    const keep: Record<string, unknown>[] = [];
    const removed: Record<string, unknown>[] = [];

    for (const item of rawItems) {
      const traceId = typeof item.id === 'string' ? item.id : null;
      if (traceId && traceIdSet.has(traceId)) {
        removed.push(item);
      } else {
        keep.push(item);
      }
    }

    const rawPath = this.getFilePath(MemoryType.RAW_TRACE);
    writeJsonl(rawPath, keep);

    if (archive && removed.length) {
      const archivePath = this.getArchivePath();
      const payload = removed.map((item) => JSON.stringify(item)).join('\n') + '\n';
      fs.appendFileSync(archivePath, payload, 'utf-8');
    }
  }

  private getFilePath(memoryType: MemoryType): string {
    if (memoryType === MemoryType.RAW_TRACE) {
      return path.join(this.agentDir, 'raw_traces.jsonl');
    }
    if (memoryType === MemoryType.EPISODIC) {
      return path.join(this.agentDir, 'episodic.jsonl');
    }
    if (memoryType === MemoryType.SEMANTIC) {
      return path.join(this.agentDir, 'semantic.jsonl');
    }
    throw new Error(`Unknown memory type: ${memoryType}`);
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

  private getArchivePath(): string {
    return path.join(this.agentDir, 'raw_traces_archive.jsonl');
  }

  private getManifestPath(): string {
    return path.join(this.agentDir, 'compacted_memory_manifest.json');
  }
}
