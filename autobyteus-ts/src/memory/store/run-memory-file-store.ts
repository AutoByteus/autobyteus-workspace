import crypto from 'node:crypto';
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
  RAW_TRACES_MEMORY_FILE_NAME,
  SEMANTIC_MEMORY_FILE_NAME,
  WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
} from './memory-file-names.js';
import type { RawTraceArchiveManifest } from './raw-trace-archive-manifest.js';
import {
  RawTraceArchiveManager,
  type RawTraceArchiveBoundaryInput,
  type RawTraceArchiveResult,
} from './raw-trace-archive-manager.js';

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

const traceId = (item: Record<string, unknown>): string | null =>
  typeof item.id === 'string' && item.id.length > 0 ? item.id : null;

const traceTs = (item: Record<string, unknown>): number | null =>
  typeof item.ts === 'number' && Number.isFinite(item.ts) ? item.ts : null;

const compareTraceRecords = (a: Record<string, unknown>, b: Record<string, unknown>): number => {
  const tsA = traceTs(a) ?? 0;
  const tsB = traceTs(b) ?? 0;
  if (tsA !== tsB) return tsA - tsB;
  const turnA = typeof a.turn_id === 'string' ? a.turn_id : '';
  const turnB = typeof b.turn_id === 'string' ? b.turn_id : '';
  if (turnA !== turnB) return turnA.localeCompare(turnB);
  const seqA = typeof a.seq === 'number' && Number.isFinite(a.seq) ? a.seq : 0;
  const seqB = typeof b.seq === 'number' && Number.isFinite(b.seq) ? b.seq : 0;
  if (seqA !== seqB) return seqA - seqB;
  return (traceId(a) ?? '').localeCompare(traceId(b) ?? '');
};

const hashBoundaryKey = (boundaryKey: string): string =>
  crypto.createHash('sha256').update(boundaryKey).digest('hex').slice(0, 8);

export type WorkingContextSnapshotWriteOptions = {
  agentId?: string | null;
};

export type { RawTraceArchiveBoundaryInput, RawTraceArchiveResult } from './raw-trace-archive-manager.js';

export class RunMemoryFileStore {
  readonly runDir: string;
  private readonly archiveManager: RawTraceArchiveManager;

  constructor(runDir: string) {
    this.runDir = runDir;
    this.archiveManager = new RawTraceArchiveManager(this.runDir);
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

  getRawTracesArchiveDirPath(): string {
    return this.archiveManager.getArchiveDirPath();
  }

  getRawTracesArchiveManifestPath(): string {
    return this.archiveManager.getManifestPath();
  }

  getRawTraceArchiveRevisionInfo(): { exists: true; mtime: number } | null {
    return this.archiveManager.getRevisionInfo();
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

  readRawTraceArchiveManifest(): RawTraceArchiveManifest {
    return this.archiveManager.readManifest();
  }

  readCompleteArchiveRawTraceDicts(): Record<string, unknown>[] {
    return this.archiveManager.readCompleteArchiveRawTraceDicts();
  }

  listArchiveRawTracesOrdered(): RawTraceItem[] {
    return this.readCompleteArchiveRawTraceDicts().map((record) => RawTraceItem.fromDict(record));
  }

  readCompleteRawTraceCorpusDicts(limit?: number): Record<string, unknown>[] {
    const active = this.listRawTraceDicts();
    const byId = new Map<string, Record<string, unknown>>();
    const noIdRecords: Record<string, unknown>[] = [];
    for (const item of this.readCompleteArchiveRawTraceDicts()) {
      const id = traceId(item);
      if (id) byId.set(id, item);
      else noIdRecords.push(item);
    }
    for (const item of active) {
      const id = traceId(item);
      if (id) byId.set(id, item);
      else noIdRecords.push(item);
    }
    const records = [...byId.values(), ...noIdRecords].sort(compareTraceRecords);
    return typeof limit === 'number' ? records.slice(-limit) : records;
  }

  findActiveRawTraceByCorrelationId(correlationId: string, traceType?: string): RawTraceItem | null {
    const record = this.listRawTraceDicts().find((item) =>
      item.correlation_id === correlationId &&
      (!traceType || item.trace_type === traceType),
    );
    return record ? RawTraceItem.fromDict(record) : null;
  }

  hasCompleteRawTraceArchiveSegment(boundaryKey: string): boolean {
    return this.archiveManager.hasCompleteSegment(boundaryKey);
  }

  removeActiveRawTracesArchivedByBoundary(boundaryKey: string): boolean {
    const archivedIds = this.archiveManager.readCompleteSegmentTraceIds(boundaryKey);
    if (!archivedIds) {
      return false;
    }
    this.rewriteActiveWithoutTraceIds(archivedIds);
    return true;
  }

  rotateActiveRawTracesBeforeBoundary(input: RawTraceArchiveBoundaryInput & { boundaryTraceId: string }): RawTraceArchiveResult {
    const active = this.listRawTraceDicts();
    const markerIndex = active.findIndex((item) => traceId(item) === input.boundaryTraceId);
    if (markerIndex <= 0) {
      return null;
    }
    const moveSet = active.slice(0, markerIndex);
    const keepSet = active.slice(markerIndex);
    return this.archiveAndRewriteActive(moveSet, keepSet, input);
  }

  pruneRawTracesById(traceIdsToRemove: Iterable<string>, archive = true): void {
    const traceIdSet = new Set(Array.from(traceIdsToRemove));
    if (!traceIdSet.size) {
      return;
    }
    const active = this.listRawTraceDicts();
    if (!active.length) {
      return;
    }
    const keep = active.filter((item) => !traceIdSet.has(traceId(item) ?? ''));
    const removed = active.filter((item) => traceIdSet.has(traceId(item) ?? ''));
    if (archive) {
      const boundaryKey = `native_compaction:${hashBoundaryKey([...traceIdSet].sort().join(','))}`;
      this.archiveAndRewriteActive(removed, keep, {
        boundaryType: 'native_compaction',
        boundaryKey,
        runtimeKind: 'AUTOBYTEUS',
        sourceEvent: 'native_compaction',
      });
      return;
    }
    writeJsonl(this.getRawTracesPath(), keep);
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

  private archiveAndRewriteActive(
    moveSet: Record<string, unknown>[],
    keepSet: Record<string, unknown>[],
    boundary: RawTraceArchiveBoundaryInput,
  ): RawTraceArchiveResult {
    const result = this.archiveManager.archiveRecords(moveSet, boundary);
    if (!result) {
      return null;
    }
    if (result.created) {
      writeJsonl(this.getRawTracesPath(), keepSet);
    } else {
      this.removeActiveRawTracesArchivedByBoundary(boundary.boundaryKey);
    }
    return result.segment;
  }

  private rewriteActiveWithoutTraceIds(traceIds: Set<string>): void {
    writeJsonl(
      this.getRawTracesPath(),
      this.listRawTraceDicts().filter((item) => !traceIds.has(traceId(item) ?? '')),
    );
  }
}
