import fs from 'node:fs';
import path from 'node:path';

import { RawTraceItem } from '../models/raw-trace-item.js';
import {
  buildRawTraceSegmentFileName,
  createEmptyRawTraceArchiveManifest,
  RAW_TRACES_ARCHIVE_DIR_NAME,
  RAW_TRACES_ARCHIVE_MANIFEST_FILE_NAME,
  RAW_TRACES_MANIFEST_FILE_NAME,
  type RawTraceArchiveBoundaryType,
  type RawTraceArchiveManifest,
  type RawTraceArchiveSegmentEntry,
} from './raw-trace-archive-manifest.js';

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

export type RawTraceArchiveBoundaryInput = {
  boundaryType: RawTraceArchiveBoundaryType;
  boundaryKey: string;
  boundaryTraceId?: string | null;
  runtimeKind?: string | null;
  sourceEvent?: string | null;
};

export type RawTraceArchiveResult = RawTraceArchiveSegmentEntry | null;

export type RawTraceArchiveWriteResult = {
  segment: RawTraceArchiveSegmentEntry;
  created: boolean;
};

export type CompletedRawTraceArchiveDescriptor = {
  fileName: string;
  recordCount: number;
  firstTraceId: string | null;
  lastTraceId: string | null;
  firstObservedAt: number | null;
  lastObservedAt: number | null;
};

export class RawTraceArchiveManager {
  constructor(private readonly runDir: string) {}

  getArchiveDirPath(): string {
    return path.join(this.runDir, RAW_TRACES_ARCHIVE_DIR_NAME);
  }

  getManifestPath(): string {
    return path.join(this.runDir, RAW_TRACES_MANIFEST_FILE_NAME);
  }

  getOldArchiveManifestPath(): string {
    return path.join(this.runDir, RAW_TRACES_ARCHIVE_MANIFEST_FILE_NAME);
  }

  getRevisionInfo(): { exists: true; mtime: number } | null {
    const manifestPath = this.getReadableManifestPath();
    if (!fs.existsSync(manifestPath)) {
      return null;
    }
    return { exists: true, mtime: fs.statSync(manifestPath).mtimeMs / 1000 };
  }

  readManifest(): RawTraceArchiveManifest {
    const filePath = this.getReadableManifestPath();
    if (!fs.existsSync(filePath)) {
      return createEmptyRawTraceArchiveManifest();
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as RawTraceArchiveManifest;
    return {
      schema_version: 1,
      next_segment_index: Math.max(1, Number(parsed.next_segment_index) || 1),
      segments: Array.isArray(parsed.segments) ? parsed.segments : [],
    };
  }

  readCompleteArchiveRawTraceDicts(): Record<string, unknown>[] {
    const records: Record<string, unknown>[] = [];
    for (const segment of this.listCompleteSegments()) {
      records.push(...this.readSegmentRawTraceDicts(segment));
    }
    return records;
  }

  listCompleteSegments(): RawTraceArchiveSegmentEntry[] {
    return this.readManifest().segments
      .filter((entry) => entry.status === 'complete')
      .sort((a, b) => a.index - b.index);
  }

  findCompleteSegmentByFileName(fileName: string): RawTraceArchiveSegmentEntry | null {
    return this.listCompleteSegments().find((entry) => entry.file_name === fileName) ?? null;
  }

  getCompleteSegmentPathByFileName(fileName: string): string | null {
    const segment = this.findCompleteSegmentByFileName(fileName);
    return segment ? this.resolveSegmentPath(segment.file_name) : null;
  }

  readCompleteSegmentRawTraceDictsByFileName(fileName: string): Record<string, unknown>[] | null {
    const segment = this.findCompleteSegmentByFileName(fileName);
    return segment ? this.readSegmentRawTraceDicts(segment) : null;
  }

  readCompleteSegmentRawTracesByFileName(fileName: string): RawTraceItem[] | null {
    const records = this.readCompleteSegmentRawTraceDictsByFileName(fileName);
    return records?.map((record) => RawTraceItem.fromDict(record)) ?? null;
  }

  hasCompleteSegment(boundaryKey: string): boolean {
    return this.findCompleteSegmentForBoundary(boundaryKey) !== null;
  }

  readCompleteSegmentTraceIds(boundaryKey: string): Set<string> | null {
    const segment = this.findCompleteSegmentForBoundary(boundaryKey);
    if (!segment) {
      return null;
    }
    return new Set(
      this.readSegmentRawTraceDicts(segment)
        .map((item) => traceId(item))
        .filter((id): id is string => Boolean(id)),
    );
  }

  archiveRecords(
    records: Record<string, unknown>[],
    boundary: RawTraceArchiveBoundaryInput,
  ): RawTraceArchiveWriteResult | null {
    if (!records.length) {
      return null;
    }
    const existingComplete = this.findCompleteSegmentForBoundary(boundary.boundaryKey);
    if (existingComplete) {
      return { segment: existingComplete, created: false };
    }

    const manifest = this.removePendingSegmentsForBoundary(this.readManifest(), boundary.boundaryKey);
    const index = manifest.next_segment_index;
    const archivedAt = Date.now() / 1000;
    const fileName = buildRawTraceSegmentFileName(index);
    const entry = this.buildSegmentEntry(index, fileName, archivedAt, records, boundary, 'pending');
    manifest.next_segment_index = index + 1;
    manifest.segments.push(entry);
    this.writeManifest(manifest);

    writeJsonl(this.resolveNewSegmentPath(fileName), records);
    const completed = { ...entry, status: 'complete' as const };
    this.writeManifest({
      ...manifest,
      segments: manifest.segments.map((segment) => segment.index === index ? completed : segment),
    });
    return { segment: completed, created: true };
  }

  private findCompleteSegmentForBoundary(boundaryKey: string): RawTraceArchiveSegmentEntry | null {
    return this.readManifest().segments.find(
      (entry) => entry.boundary_key === boundaryKey && entry.status === 'complete',
    ) ?? null;
  }

  private readSegmentRawTraceDicts(entry: RawTraceArchiveSegmentEntry): Record<string, unknown>[] {
    return readJsonl(this.resolveSegmentPath(entry.file_name));
  }

  private removePendingSegmentsForBoundary(
    manifest: RawTraceArchiveManifest,
    boundaryKey: string,
  ): RawTraceArchiveManifest {
    return {
      ...manifest,
      segments: manifest.segments.filter(
        (entry) => entry.boundary_key !== boundaryKey || entry.status !== 'pending',
      ),
    };
  }

  private writeManifest(manifest: RawTraceArchiveManifest): void {
    writeJson(this.getManifestPath(), manifest as unknown as Record<string, unknown>);
  }

  private getReadableManifestPath(): string {
    const newManifestPath = this.getManifestPath();
    if (fs.existsSync(newManifestPath)) {
      return newManifestPath;
    }
    return this.getOldArchiveManifestPath();
  }

  private resolveNewSegmentPath(fileName: string): string {
    return this.resolveSafeRunRelativePath(fileName);
  }

  private resolveSegmentPath(fileName: string): string {
    const normalized = fileName.trim();
    if (normalized.includes('/') || normalized.includes('\\')) {
      return this.resolveSafeRunRelativePath(normalized);
    }
    if (/^raw_traces_\d{6}\.jsonl$/.test(normalized)) {
      return this.resolveSafeRunRelativePath(normalized);
    }
    return this.resolveSafeRunRelativePath(path.join(RAW_TRACES_ARCHIVE_DIR_NAME, normalized));
  }

  private resolveSafeRunRelativePath(relativePath: string): string {
    if (!relativePath || path.isAbsolute(relativePath) || path.posix.isAbsolute(relativePath) || path.win32.isAbsolute(relativePath)) {
      throw new Error(`Invalid raw trace segment path: ${relativePath}`);
    }
    const runRoot = path.resolve(this.runDir);
    const resolved = path.resolve(runRoot, relativePath);
    if (resolved !== runRoot && !resolved.startsWith(`${runRoot}${path.sep}`)) {
      throw new Error(`Invalid raw trace segment path outside run directory: ${relativePath}`);
    }
    return resolved;
  }

  private buildSegmentEntry(
    index: number,
    fileName: string,
    archivedAt: number,
    records: Record<string, unknown>[],
    boundary: RawTraceArchiveBoundaryInput,
    status: 'pending' | 'complete',
  ): RawTraceArchiveSegmentEntry {
    const first = records[0] ?? null;
    const last = records[records.length - 1] ?? null;
    return {
      index,
      file_name: fileName,
      boundary_type: boundary.boundaryType,
      boundary_key: boundary.boundaryKey,
      boundary_trace_id: boundary.boundaryTraceId ?? null,
      runtime_kind: boundary.runtimeKind ?? null,
      source_event: boundary.sourceEvent ?? null,
      archived_at: archivedAt,
      first_trace_id: first ? traceId(first) : null,
      last_trace_id: last ? traceId(last) : null,
      first_ts: first ? traceTs(first) : null,
      last_ts: last ? traceTs(last) : null,
      record_count: records.length,
      status,
    };
  }
}
