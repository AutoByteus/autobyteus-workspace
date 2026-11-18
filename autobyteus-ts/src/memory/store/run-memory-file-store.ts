import type { PreparedCompactionArchive } from './base-store.js';
import { collectMessageRawTraceIds } from '../working-context-provenance.js';
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
import { WorkingContext } from '../working-context.js';
import { WorkingContextSnapshotSerializer } from '../working-context-snapshot-serializer.js';
import type { SnapshotMetadata } from '../working-context-snapshot-serializer.js';
import {
  EPISODIC_MEMORY_FILE_NAME,
  RAW_TRACES_ACTIVE_MEMORY_FILE_NAME,
  SEMANTIC_MEMORY_FILE_NAME,
  WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
} from './memory-file-names.js';
import { replaceFileDurably } from './durable-file-replace.js';
import {
  jsonlLogEndsCleanly,
  readLastJsonlRecord,
  repairJsonlDamagedEnd,
  scanJsonlRecordsFromStart,
  serializeJsonlRecords,
} from './jsonl-log-file.js';
import type { RawTraceArchiveManifest, RawTraceArchiveSegmentEntry } from './raw-trace-archive-manifest.js';
import {
  RawTraceArchiveManager,
  type RawTraceArchiveBoundaryInput,
  type RawTraceArchiveResult,
} from './raw-trace-archive-manager.js';

/** The value the server's `RuntimeKind.AUTOBYTEUS` stores; this library has no enum of its own. */
const NATIVE_RUNTIME_KIND = 'autobyteus';

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
  /** JSONL files of this instance whose end is known to be clean; appends to them need no further check. */
  private readonly verifiedEndPaths = new Set<string>();

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
      this.appendJsonlRecord(this.getFilePath(item.memoryType), item.toDict());
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
    this.appendJsonlRecord(this.getRawTracesPath(), trace);
    return { trace, created: true };
  }

  /** Reads a file for use: its damaged end, if any, is cut first. */
  readMemoryDicts(memoryType: MemoryType, limit?: number): Record<string, unknown>[] {
    const filePath = this.getFilePath(memoryType);
    const records = repairJsonlDamagedEnd(filePath);
    this.verifiedEndPaths.add(filePath);
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

  /** Read-only and cheap: the ID of the last complete record of the active raw-trace file, or null when it has none. */
  readLastActiveRawTraceId(): string | null {
    const record = readLastJsonlRecord(this.getRawTracesPath());
    return record ? traceId(record) : null;
  }

  /**
   * Read-only and bounded by the visitor: the active raw-trace file's complete records in order until `visit` returns
   * false. It never cuts a damaged end (unlike `listRawTraceDicts`, which is a write).
   */
  scanActiveRawTraces(visit: (record: Record<string, unknown>) => boolean): void {
    scanJsonlRecordsFromStart(this.getRawTracesPath(), visit);
  }

  /**
   * The archive step of an agent runtime switch. `throughTraceId` (the watermark) is the last record of the previous agent;
   * everything after it was written by the new agent's session while it prepared. Rules, in order:
   * 1. A complete segment of the boundary key exists: the watermark is ignored; the records that segment holds are removed
   *    from the active file and the marker is ensured to be its first record.
   * 2. The marker is already in the active file (no segment: nothing was archived, because the previous era was empty): it
   *    is ensured to be first and nothing else changes.
   * 3. Otherwise the records through the watermark are archived as one segment (none: no segment is made) and the active
   *    file becomes the marker followed by the records after the watermark.
   * The marker is the record whose correlation ID is the boundary key; it is written only if absent. Idempotent: a repeated
   * call, a call after a failed commit and a call after an interrupted rewrite complete what is missing.
   */
  rotateActiveRawTracesForRuntimeSwitch(input: {
    boundary: RawTraceArchiveBoundaryInput;
    marker: Record<string, unknown>;
    throughTraceId: string | null;
  }): RawTraceArchiveResult {
    const key = input.boundary.boundaryKey;
    const markerId = traceId(input.marker);
    if (!markerId || input.marker.correlation_id !== key) {
      throw new Error('The switch marker needs an ID and the boundary key as its correlation ID.');
    }
    const isMarker = (item: Record<string, unknown>): boolean => item.correlation_id === key;
    const active = this.listRawTraceDicts();
    const present = active.find(isMarker) ?? null;
    const segment = this.archiveManager.listCompleteSegments().find((entry) => entry.boundary_key === key) ?? null;
    if (segment) {
      const archivedIds = this.archiveManager.readCompleteSegmentTraceIds(key) ?? new Set<string>();
      const rest = active.filter((item) => !isMarker(item) && !archivedIds.has(traceId(item) ?? ''));
      this.writeActiveRawTraces([present ?? input.marker, ...rest]);
      return segment;
    }
    if (present) {
      if (!isMarker(active[0]!)) this.writeActiveRawTraces([present, ...active.filter((item) => !isMarker(item))]);
      return null;
    }
    let moveSet: Record<string, unknown>[] = [];
    let keepSet = active;
    if (input.throughTraceId !== null) {
      const index = active.findIndex((item) => traceId(item) === input.throughTraceId);
      if (index < 0) {
        throw new Error(`The switch watermark '${input.throughTraceId}' is not in the active raw traces.`);
      }
      moveSet = active.slice(0, index + 1);
      keepSet = active.slice(index + 1);
    }
    const archived = this.archiveManager.archiveRecords(moveSet, { ...input.boundary, boundaryTraceId: markerId });
    this.writeActiveRawTraces([input.marker, ...keepSet]);
    return archived?.segment ?? null;
  }

  /**
   * Removes the records after `afterTraceId` (all of them for null) from the active raw-trace file: what a failed switch attempt
   * wrote after its watermark. It does nothing once a record correlated with `unlessCorrelationId` (the switch's marker) is
   * in the file, and nothing when a non-null `afterTraceId` is not in the file. Returns the number of records removed.
   */
  removeActiveRawTracesAfter(afterTraceId: string | null, options: { unlessCorrelationId: string }): number {
    const active = this.listRawTraceDicts();
    if (active.some((item) => item.correlation_id === options.unlessCorrelationId)) return 0;
    let keepCount = 0;
    if (afterTraceId !== null) {
      const index = active.findIndex((item) => traceId(item) === afterTraceId);
      if (index < 0) return 0;
      keepCount = index + 1;
    }
    const removed = active.length - keepCount;
    if (removed > 0) this.writeActiveRawTraces(active.slice(0, keepCount));
    return removed;
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
        runtimeKind: NATIVE_RUNTIME_KIND,
        sourceEvent: 'native_compaction',
      });
      return;
    }
    this.writeActiveRawTraces(keep);
  }

  prepareCompactionArchive(selectedTurnTraceIds: readonly string[]): PreparedCompactionArchive {
    const ids = selectedTurnTraceIds.map((id) => id.trim());
    if (!ids.length || ids.some((id) => !id) || new Set(ids).size !== ids.length) {
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
    const boundaryKey = nativeCompactionSelectionBoundaryKey(ids);
    const result = this.archiveManager.archiveRecords(selected, {
      boundaryType: 'native_compaction', boundaryKey,
      runtimeKind: NATIVE_RUNTIME_KIND, sourceEvent: 'native_compaction',
    });
    if (!result) throw new Error('Compaction archive preparation failed.');
    const archivedIds = this.archiveManager.readCompleteSegmentTraceIds(boundaryKey);
    if (!archivedIds || archivedIds.size !== selected.length || selected.some((record) => !archivedIds.has(traceId(record) ?? ''))) {
      throw new Error('Prepared archive does not contain every selected trace.');
    }
    return { boundaryKey, archivedIds: [...archivedIds] };
  }

  prunePreparedCompactionArchive(prepared: PreparedCompactionArchive, retainedIds: readonly string[]): void {
    const archived = this.archiveManager.readCompleteSegmentTraceIds(prepared.boundaryKey);
    if (!archived || prepared.archivedIds.some((id) => !archived.has(id))) {
      throw new Error('Prepared archive membership no longer matches.');
    }
    const snapshot = this.readWorkingContextSnapshotState();
    if (!snapshot) throw new Error('Archive pruning requires a committed snapshot.');
    const retained = new Set([...retainedIds, ...collectMessageRawTraceIds(snapshot.workingContext.buildMessages())]);
    this.rewriteActiveWithoutTraceIds(new Set(prepared.archivedIds.filter((id) => !retained.has(id))));
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
    replaceFileDurably(this.getWorkingContextSnapshotPath(), JSON.stringify(payload));
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
      this.writeActiveRawTraces(keepSet);
    } else {
      this.removeActiveRawTracesArchivedByBoundary(boundary.boundaryKey);
    }
    return result.segment;
  }

  private rewriteActiveWithoutTraceIds(traceIds: Set<string>): void {
    this.writeActiveRawTraces(this.listRawTraceDicts().filter((item) => !traceIds.has(traceId(item) ?? '')));
  }

  private writeActiveRawTraces(records: Record<string, unknown>[]): void {
    replaceFileDurably(this.getRawTracesPath(), serializeJsonlRecords(records));
  }

  /** An appended record is always a line of its own: the first append to a file per instance cuts a damaged end. */
  private appendJsonlRecord(filePath: string, record: Record<string, unknown>): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (!this.verifiedEndPaths.has(filePath)) {
      if (!jsonlLogEndsCleanly(filePath)) repairJsonlDamagedEnd(filePath);
      this.verifiedEndPaths.add(filePath);
    }
    fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, 'utf-8');
  }
}
