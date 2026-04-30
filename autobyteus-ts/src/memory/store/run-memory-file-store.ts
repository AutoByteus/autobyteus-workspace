import fs from 'node:fs';
import path from 'node:path';

import { MemoryType, MemoryItem } from '../models/memory-types.js';
import { RawTraceItem } from '../models/raw-trace-item.js';
import { WorkingContextSnapshot } from '../working-context-snapshot.js';
import { WorkingContextSnapshotSerializer } from '../working-context-snapshot-serializer.js';
import type { SnapshotMetadata } from '../working-context-snapshot-serializer.js';
import type { CompactedMemoryManifest } from './compacted-memory-manifest.js';
import {
  COMPACTED_MEMORY_MANIFEST_FILE_NAME,
  EPISODIC_MEMORY_FILE_NAME,
  RAW_TRACES_ARCHIVE_MEMORY_FILE_NAME,
  RAW_TRACES_MEMORY_FILE_NAME,
  SEMANTIC_MEMORY_FILE_NAME,
  WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
} from './memory-file-names.js';

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
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(tmpPath, items.map((item) => JSON.stringify(item)).join('\n') + (items.length ? '\n' : ''), 'utf-8');
  fs.renameSync(tmpPath, filePath);
};

const writeJson = (filePath: string, payload: Record<string, unknown>): void => {
  const tmpPath = `${filePath}.tmp`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(tmpPath, JSON.stringify(payload), 'utf-8');
  fs.renameSync(tmpPath, filePath);
};

export type WorkingContextSnapshotWriteOptions = {
  agentId?: string | null;
};

export class RunMemoryFileStore {
  readonly runDir: string;

  constructor(runDir: string) {
    this.runDir = runDir;
    fs.mkdirSync(this.runDir, { recursive: true });
  }

  getFilePath(memoryType: MemoryType): string {
    if (memoryType === MemoryType.RAW_TRACE) {
      return path.join(this.runDir, RAW_TRACES_MEMORY_FILE_NAME);
    }
    if (memoryType === MemoryType.EPISODIC) {
      return path.join(this.runDir, EPISODIC_MEMORY_FILE_NAME);
    }
    if (memoryType === MemoryType.SEMANTIC) {
      return path.join(this.runDir, SEMANTIC_MEMORY_FILE_NAME);
    }
    throw new Error(`Unknown memory type: ${memoryType}`);
  }

  getRawTracesPath(): string {
    return this.getFilePath(MemoryType.RAW_TRACE);
  }

  getArchivePath(): string {
    return path.join(this.runDir, RAW_TRACES_ARCHIVE_MEMORY_FILE_NAME);
  }

  getManifestPath(): string {
    return path.join(this.runDir, COMPACTED_MEMORY_MANIFEST_FILE_NAME);
  }

  getWorkingContextSnapshotPath(): string {
    return path.join(this.runDir, WORKING_CONTEXT_SNAPSHOT_FILE_NAME);
  }

  add(items: Iterable<MemoryItem>): void {
    for (const item of items) {
      const filePath = this.getFilePath(item.memoryType);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.appendFileSync(filePath, `${JSON.stringify(item.toDict())}\n`, 'utf-8');
    }
  }

  appendRawTrace(item: RawTraceItem): void {
    this.add([item]);
  }

  readMemoryDicts(memoryType: MemoryType, limit?: number): Record<string, unknown>[] {
    const records = readJsonl(this.getFilePath(memoryType));
    return typeof limit === 'number' ? records.slice(-limit) : records;
  }

  listRawTracesOrdered(limit?: number): RawTraceItem[] {
    return this.readMemoryDicts(MemoryType.RAW_TRACE, limit).map((record) => RawTraceItem.fromDict(record));
  }

  listRawTraceDicts(): Record<string, unknown>[] {
    return this.readMemoryDicts(MemoryType.RAW_TRACE);
  }

  readSemanticDicts(): Record<string, unknown>[] {
    return this.readMemoryDicts(MemoryType.SEMANTIC);
  }

  replaceSemanticDicts(items: Iterable<Record<string, unknown>>): void {
    writeJsonl(this.getFilePath(MemoryType.SEMANTIC), Array.from(items));
  }

  clearSemanticItems(): void {
    writeJsonl(this.getFilePath(MemoryType.SEMANTIC), []);
  }

  readCompactedMemoryManifest(): CompactedMemoryManifest | null {
    const filePath = this.getManifestPath();
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as CompactedMemoryManifest;
  }

  writeCompactedMemoryManifest(manifest: CompactedMemoryManifest): void {
    writeJson(this.getManifestPath(), manifest as Record<string, unknown>);
  }

  readArchiveRawTraces(): Record<string, unknown>[] {
    return readJsonl(this.getArchivePath());
  }

  listArchiveRawTracesOrdered(): RawTraceItem[] {
    return this.readArchiveRawTraces().map((record) => RawTraceItem.fromDict(record));
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

    writeJsonl(this.getRawTracesPath(), keep);

    if (archive && removed.length) {
      const payload = removed.map((item) => JSON.stringify(item)).join('\n') + '\n';
      fs.appendFileSync(this.getArchivePath(), payload, 'utf-8');
    }
  }

  workingContextSnapshotExists(): boolean {
    return fs.existsSync(this.getWorkingContextSnapshotPath());
  }

  readWorkingContextSnapshot(): Record<string, unknown> | null {
    const filePath = this.getWorkingContextSnapshotPath();
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  }

  readWorkingContextSnapshotState(): { snapshot: WorkingContextSnapshot; metadata: SnapshotMetadata } | null {
    const payload = this.readWorkingContextSnapshot();
    if (!payload) {
      return null;
    }
    return WorkingContextSnapshotSerializer.deserialize(payload);
  }

  writeWorkingContextSnapshot(payload: Record<string, unknown>): void {
    writeJson(this.getWorkingContextSnapshotPath(), payload);
  }

  writeWorkingContextSnapshotState(
    snapshot: WorkingContextSnapshot,
    options: WorkingContextSnapshotWriteOptions = {},
  ): void {
    this.writeWorkingContextSnapshot(
      WorkingContextSnapshotSerializer.serialize(snapshot, {
        agent_id: options.agentId ?? undefined,
      }),
    );
  }

  deleteWorkingContextSnapshot(): void {
    const filePath = this.getWorkingContextSnapshotPath();
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  }
}
