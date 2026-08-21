import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { MemoryType, MemoryItem } from '../models/memory-types.js';
import { RawTraceItem } from '../models/raw-trace-item.js';
import {
  parseSystemInstructionTraceRecord,
  SYSTEM_INSTRUCTION_TRACE_TYPE,
  SYSTEM_INSTRUCTIONS_SUPPLIED_SOURCE_EVENT,
  type SystemInstructionCaptureResult,
  type SystemInstructionTraceRecord,
} from '../models/system-instruction-trace.js';
import { EpisodicItem } from '../models/episodic-item.js';
import { SemanticItem } from '../models/semantic-item.js';
import { WorkingContext } from '../working-context.js';
import { WorkingContextSnapshotSerializer } from '../working-context-snapshot-serializer.js';
import type { SnapshotMetadata } from '../working-context-snapshot-serializer.js';
import {
  EPISODIC_MEMORY_FILE_NAME,
  RAW_TRACES_ACTIVE_MEMORY_FILE_NAME,
  SEMANTIC_MEMORY_FILE_NAME,
  WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
} from './memory-file-names.js';
import type { RawTraceArchiveManifest, RawTraceArchiveSegmentEntry } from './raw-trace-archive-manifest.js';
import {
  RawTraceArchiveManager,
  type RawTraceArchiveBoundaryInput,
  type RawTraceArchiveResult,
} from './raw-trace-archive-manager.js';

const readJsonl = (filePath: string): Record<string, unknown>[] => {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n');
  const records: Record<string, unknown>[] = [];
  let validBytes = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const trimmed = line.trim();
    const isLastPhysicalLine = index === lines.length - 1;
    if (!trimmed) {
      validBytes += Buffer.byteLength(line + (isLastPhysicalLine ? '' : '\n'), 'utf8');
      continue;
    }
    try {
      records.push(JSON.parse(trimmed) as Record<string, unknown>);
      validBytes += Buffer.byteLength(line + (isLastPhysicalLine ? '' : '\n'), 'utf8');
    } catch (error) {
      if (isLastPhysicalLine || index === lines.length - 2 && lines.at(-1) === '') {
        // A process crash can leave only the final JSONL record incomplete.
        // Preserve complete prior evidence and truncate the broken tail.
        fs.writeFileSync(filePath, raw.slice(0, validBytes), 'utf-8');
        break;
      }
      throw error;
    }
  }
  return records;
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

const nativeCompactionSelectionBoundaryKey = (traceIds: readonly string[]): string => {
  const canonicalSelection = JSON.stringify([...traceIds].sort());
  const selectionDigest = crypto
    .createHash('sha256')
    .update(canonicalSelection, 'utf8')
    .digest('hex');
  return `native_compaction_selection:${selectionDigest}`;
};

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
      return path.join(this.runDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME);
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

  recordSystemInstructionSupply(content: string, suppliedAt: number): SystemInstructionCaptureResult {
    if (typeof content !== 'string') {
      throw new Error('System instruction content must be a string.');
    }
    if (!Number.isFinite(suppliedAt) || suppliedAt <= 0) {
      throw new Error('System instruction suppliedAt must be a positive finite epoch timestamp.');
    }

    const activeRecords = this.listRawTraceDicts();
    for (let index = activeRecords.length - 1; index >= 0; index -= 1) {
      const existing = parseSystemInstructionTraceRecord(activeRecords[index]!);
      if (!existing) continue;
      if (existing.content === content) {
        return { trace: existing, created: false };
      }
      break;
    }

    const trace: SystemInstructionTraceRecord = {
      id: `rt_${Math.trunc(suppliedAt * 1000)}_${crypto.randomUUID()}`,
      ts: suppliedAt,
      trace_type: SYSTEM_INSTRUCTION_TRACE_TYPE,
      content,
      source_event: SYSTEM_INSTRUCTIONS_SUPPLIED_SOURCE_EVENT,
    };
    fs.mkdirSync(path.dirname(this.getRawTracesPath()), { recursive: true });
    fs.appendFileSync(this.getRawTracesPath(), `${JSON.stringify(trace)}\n`, 'utf-8');
    return { trace, created: true };
  }

  readMemoryDicts(memoryType: MemoryType, limit?: number): Record<string, unknown>[] {
    const records = readJsonl(this.getFilePath(memoryType));
    return typeof limit === 'number' ? records.slice(-limit) : records;
  }

  listTurnRawTracesOrdered(limit?: number): RawTraceItem[] {
    const records = this.readMemoryDicts(MemoryType.RAW_TRACE)
      .filter((record) => record.trace_type !== SYSTEM_INSTRUCTION_TRACE_TYPE);
    const selected = typeof limit === 'number' ? records.slice(-limit) : records;
    return selected.map((record) => RawTraceItem.fromDict(record));
  }

  listTurnRawTraceCorpusOrdered(limit?: number): RawTraceItem[] {
    const records = this.readCompleteRawTraceCorpusDicts()
      .filter((record) => record.trace_type !== SYSTEM_INSTRUCTION_TRACE_TYPE);
    const selected = typeof limit === 'number' ? records.slice(-limit) : records;
    return selected.map((record) => RawTraceItem.fromDict(record));
  }

  listRawTraceDicts(): Record<string, unknown>[] {
    return this.readMemoryDicts(MemoryType.RAW_TRACE);
  }

  private readEpisodicRecords(): Record<string, unknown>[] {
    return this.readMemoryDicts(MemoryType.EPISODIC);
  }

  private readSemanticRecords(): Record<string, unknown>[] {
    return this.readMemoryDicts(MemoryType.SEMANTIC);
  }

  findEpisodicItemsByIds(ids: readonly string[]): EpisodicItem[] {
    return this.findExactItemsByIds(ids, this.readEpisodicRecords(), (record) =>
      EpisodicItem.fromDict(record), 'episode');
  }

  findSemanticItemsByIds(ids: readonly string[]): SemanticItem[] {
    return this.findExactItemsByIds(ids, this.readSemanticRecords(), (record) =>
      SemanticItem.fromDict(record), 'semantic');
  }

  hasMemoryArtifactIds(input: {
    episodeIds: readonly string[];
    semanticIds: readonly string[];
  }): boolean {
    const episodeIds = new Set(input.episodeIds);
    const semanticIds = new Set(input.semanticIds);
    return this.readEpisodicRecords().some((record) => episodeIds.has(String(record.id ?? '')))
      || this.readSemanticRecords().some((record) => semanticIds.has(String(record.id ?? '')));
  }

  readRawTraceArchiveManifest(): RawTraceArchiveManifest {
    return this.archiveManager.readManifest();
  }

  readCompleteArchiveRawTraceDicts(): Record<string, unknown>[] {
    return this.archiveManager.readCompleteArchiveRawTraceDicts();
  }

  listCompleteRawTraceArchiveSegments(): RawTraceArchiveSegmentEntry[] {
    return this.archiveManager.listCompleteSegments();
  }

  getCompleteRawTraceArchiveSegmentPathByFileName(fileName: string): string | null {
    return this.archiveManager.getCompleteSegmentPathByFileName(fileName);
  }

  readCompleteRawTraceArchiveSegmentDictsByFileName(fileName: string): Record<string, unknown>[] | null {
    return this.archiveManager.readCompleteSegmentRawTraceDictsByFileName(fileName);
  }

  listArchiveTurnRawTracesOrdered(): RawTraceItem[] {
    return this.readCompleteArchiveRawTraceDicts()
      .filter((record) => record.trace_type !== SYSTEM_INSTRUCTION_TRACE_TYPE)
      .map((record) => RawTraceItem.fromDict(record));
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

  archiveCompactedRawTraces(selectedTurnTraceIds: readonly string[]): void {
    const ids = selectedTurnTraceIds.map((id) => id.trim()).filter(Boolean);
    if (!ids.length || new Set(ids).size !== ids.length) {
      throw new Error('Exact raw-trace archive requires unique non-empty selected IDs.');
    }
    const active = this.listRawTraceDicts();
    const activeById = new Map<string, Record<string, unknown>>();
    for (const record of active) {
      const id = traceId(record);
      if (!id) continue;
      if (activeById.has(id)) throw new Error(`Active raw traces contain duplicate ID '${id}'.`);
      activeById.set(id, record);
    }
    const missing = ids.filter((id) => !activeById.has(id));
    if (missing.length) {
      throw new Error(`Selected raw traces are missing from active storage: ${missing.join(', ')}.`);
    }
    const selectedTurnRecords = active.filter((record) => ids.includes(traceId(record) ?? ''));
    if (selectedTurnRecords.length !== ids.length) {
      throw new Error('Exact raw-trace archive membership validation failed.');
    }
    if (selectedTurnRecords.some((record) => record.trace_type === SYSTEM_INSTRUCTION_TRACE_TYPE)) {
      throw new Error('Compaction selection must contain turn-scoped raw traces only.');
    }
    const lastSelectedPhysicalIndex = active.reduce(
      (latest, record, index) => ids.includes(traceId(record) ?? '') ? index : latest,
      -1,
    );
    const selected = active.filter((record, index) =>
      ids.includes(traceId(record) ?? '')
      || index <= lastSelectedPhysicalIndex && record.trace_type === SYSTEM_INSTRUCTION_TRACE_TYPE,
    );
    const selectedIds = new Set(selected.map((record) => traceId(record)).filter((id): id is string => Boolean(id)));
    const result = this.archiveAndRewriteActive(
      selected,
      active.filter((record) => !selectedIds.has(traceId(record) ?? '')),
      {
        boundaryType: 'native_compaction',
        boundaryKey: nativeCompactionSelectionBoundaryKey(ids),
        runtimeKind: 'AUTOBYTEUS',
        sourceEvent: 'native_compaction',
      },
    );
    if (!result) throw new Error('Exact raw-trace archive did not create a completed file.');
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

  readWorkingContextSnapshotState(): { workingContext: WorkingContext; metadata: SnapshotMetadata } | null {
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
    workingContext: WorkingContext,
    options: WorkingContextSnapshotWriteOptions = {},
  ): void {
    this.writeWorkingContextSnapshot(
      WorkingContextSnapshotSerializer.serialize(workingContext, {
        agent_id: options.agentId ?? undefined,
      }),
    );
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

  private findExactItemsByIds<T>(
    ids: readonly string[],
    records: Record<string, unknown>[],
    deserialize: (record: Record<string, unknown>) => T,
    label: string,
  ): T[] {
    const requested = ids.map((id) => id.trim());
    const result: T[] = [];
    for (const id of requested) {
      const matches = records.filter((record) => record.id === id);
      if (matches.length !== 1) {
        throw new Error(`Expected exactly one ${label} row '${id}', found ${matches.length}.`);
      }
      result.push(deserialize(matches[0]!));
    }
    return result;
  }
}
