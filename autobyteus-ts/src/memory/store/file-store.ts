import fs from 'node:fs';
import path from 'node:path';

import { MemoryStore } from './base-store.js';
import { MemoryType, MemoryItem } from '../models/memory-types.js';
import { RawTraceItem } from '../models/raw-trace-item.js';
import { EpisodicItem } from '../models/episodic-item.js';
import { SemanticItem } from '../models/semantic-item.js';

export class FileMemoryStore extends MemoryStore {
  baseDir: string;
  agentId: string;
  agentDir: string;

  constructor(baseDir: string, agentId: string) {
    super();
    this.baseDir = baseDir;
    this.agentId = agentId;
    this.agentDir = path.join(this.baseDir, 'agents', agentId);
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
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const lines = fs.readFileSync(filePath, 'utf-8')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const sliced = typeof limit === 'number' ? lines.slice(-limit) : lines;
    return sliced.map((line) => this.deserialize(memoryType, JSON.parse(line)));
  }

  listRawTraceDicts(): Record<string, unknown>[] {
    const filePath = this.getFilePath(MemoryType.RAW_TRACE);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    return fs.readFileSync(filePath, 'utf-8')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  readArchiveRawTraces(): Record<string, unknown>[] {
    const filePath = this.getArchivePath();
    if (!fs.existsSync(filePath)) {
      return [];
    }
    return fs.readFileSync(filePath, 'utf-8')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  pruneRawTraces(keepTurnIds: Set<string>, archive = true): void {
    const rawItems = this.listRawTraceDicts();
    if (!rawItems.length) {
      return;
    }

    const keep: Record<string, unknown>[] = [];
    const removed: Record<string, unknown>[] = [];

    for (const item of rawItems) {
      const turnId = typeof item.turn_id === 'string' ? item.turn_id : null;
      if (turnId && keepTurnIds.has(turnId)) {
        keep.push(item);
      } else {
        removed.push(item);
      }
    }

    const rawPath = this.getFilePath(MemoryType.RAW_TRACE);
    const tmpPath = `${rawPath}.tmp`;
    fs.writeFileSync(tmpPath, keep.map((item) => JSON.stringify(item)).join('\n') + (keep.length ? '\n' : ''), 'utf-8');
    fs.renameSync(tmpPath, rawPath);

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
}
