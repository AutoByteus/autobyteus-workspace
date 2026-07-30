import type { RawTraceItem } from '../models/raw-trace-item.js';
import type { RawTraceArchiveSegmentEntry } from '../store/raw-trace-archive-manifest.js';
import type { EpisodicItem } from '../models/episodic-item.js';
import type { SemanticItem } from '../models/semantic-item.js';
import type { CompactionLineageRecord } from './compaction-lineage-record.js';
import type { CompactionLineageStore } from './compaction-lineage-store.js';
import type { CompactionLineageScope } from './compaction-lineage-scope.js';
import { MemoryOriginIntegrityError } from './memory-origin-resolution.js';
import type {
  MemoryArtifactRef,
  MemoryOriginResolution,
  SourceInterval,
} from './memory-origin-resolution.js';

export interface CompactionLineageArchiveReader {
  findCompleteSegmentByFileName(fileName: string): RawTraceArchiveSegmentEntry | null;
  readCompleteSegmentRawTracesByFileName(fileName: string): RawTraceItem[] | null;
}

export interface CompactionLineageOutputReader {
  findEpisodicItemsByIds(ids: readonly string[]): EpisodicItem[];
  findSemanticItemsByIds(ids: readonly string[]): SemanticItem[];
}

const sourceInterval = (traces: readonly RawTraceItem[]): SourceInterval => {
  const timestamps = traces.map(({ ts }) => ts).filter(Number.isFinite);
  return {
    firstObservedAt: timestamps.length ? Math.min(...timestamps) : null,
    lastObservedAt: timestamps.length ? Math.max(...timestamps) : null,
  };
};

const requireArtifact = (artifact: MemoryArtifactRef): MemoryArtifactRef => {
  if ((artifact.kind !== 'episode' && artifact.kind !== 'semantic') || !artifact.id.trim()) {
    throw new Error('Origin resolution requires an explicit artifact kind and non-empty ID.');
  }
  return { kind: artifact.kind, id: artifact.id.trim() };
};

export class CompactionLineageResolver {
  constructor(
    private readonly scope: CompactionLineageScope,
    private readonly lineageStore: CompactionLineageStore,
    private readonly archiveReader: CompactionLineageArchiveReader,
    private readonly outputReader: CompactionLineageOutputReader,
  ) {}

  resolve(artifactInput: MemoryArtifactRef): MemoryOriginResolution {
    const artifact = requireArtifact(artifactInput);
    let producing: CompactionLineageRecord | null;
    try {
      producing = this.lineageStore.findProducingRecord(artifact);
    } catch (error) {
      throw new MemoryOriginIntegrityError(
        `Compaction lineage failed validation: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    if (!producing) {
      return {
        status: 'not_found',
        scope: this.scope,
        artifact,
      };
    }

    const visited = new Set<string>();
    const rootById = new Map<string, { archiveFile: string; trace: RawTraceItem }>();
    let cursor = producing;
    let directTraces: RawTraceItem[] | null = null;

    while (cursor) {
      if (visited.has(cursor.compactionId)) {
        throw new MemoryOriginIntegrityError(
          `Compaction lineage cycle detected at '${cursor.compactionId}'.`,
        );
      }
      visited.add(cursor.compactionId);
      this.validateOutputMembership(cursor);
      const traces = this.readValidatedArchive(cursor.rawTraceArchiveFile);
      if (directTraces === null) directTraces = traces;
      for (const trace of traces) {
        const existing = rootById.get(trace.id);
        if (existing && JSON.stringify(existing.trace.toDict()) !== JSON.stringify(trace.toDict())) {
          throw new MemoryOriginIntegrityError(
            `Raw root '${trace.id}' has conflicting archive content.`,
          );
        }
        if (!existing) rootById.set(trace.id, {
          archiveFile: cursor.rawTraceArchiveFile,
          trace,
        });
      }
      if (!cursor.previousCompactionId) break;
      let previous: CompactionLineageRecord | null;
      try {
        previous = this.lineageStore.getByCompactionId(cursor.previousCompactionId);
      } catch (error) {
        throw new MemoryOriginIntegrityError(
          `Compaction lineage failed validation: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      if (!previous) {
        throw new MemoryOriginIntegrityError(
          `Compaction '${cursor.compactionId}' references missing previous compaction '${cursor.previousCompactionId}'.`,
        );
      }
      cursor = previous;
    }

    const roots = [...rootById.values()].sort((left, right) =>
      left.trace.ts - right.trace.ts || left.trace.id.localeCompare(right.trace.id));
    return {
      status: 'complete',
      scope: this.scope,
      artifact,
      producingCompactionId: producing.compactionId,
      direct: {
        rawTraceArchiveFile: producing.rawTraceArchiveFile,
        rawTraces: directTraces ?? [],
        rawSourceInterval: sourceInterval(directTraces ?? []),
        previousCompactionId: producing.previousCompactionId,
      },
      roots,
      rootSourceInterval: sourceInterval(roots.map(({ trace }) => trace)),
      derivedAt: producing.derivedAt,
    };
  }

  private readValidatedArchive(fileName: string): RawTraceItem[] {
    const descriptor = this.archiveReader.findCompleteSegmentByFileName(fileName);
    if (!descriptor || descriptor.status !== 'complete') {
      throw new MemoryOriginIntegrityError(
        `Compaction lineage archive '${fileName}' is missing or incomplete.`,
      );
    }
    const traces = this.archiveReader.readCompleteSegmentRawTracesByFileName(fileName);
    if (!traces || traces.length !== descriptor.record_count) {
      throw new MemoryOriginIntegrityError(
        `Compaction lineage archive '${fileName}' failed record-count validation.`,
      );
    }
    if (!traces.length) {
      throw new MemoryOriginIntegrityError(`Compaction lineage archive '${fileName}' is empty.`);
    }
    if (
      (descriptor.first_trace_id ?? null) !== (traces[0]?.id ?? null)
      || (descriptor.last_trace_id ?? null) !== (traces.at(-1)?.id ?? null)
    ) {
      throw new MemoryOriginIntegrityError(
        `Compaction lineage archive '${fileName}' failed identity-bound validation.`,
      );
    }
    return traces;
  }

  private validateOutputMembership(record: CompactionLineageRecord): void {
    let episodeIds: string[];
    let semanticIds: string[];
    try {
      episodeIds = this.outputReader
        .findEpisodicItemsByIds(record.episodeIds)
        .map(({ id }) => id);
      semanticIds = this.outputReader
        .findSemanticItemsByIds(record.semanticIds)
        .map(({ id }) => id);
    } catch (error) {
      throw new MemoryOriginIntegrityError(
        `Compaction '${record.compactionId}' output rows failed validation: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    if (
      JSON.stringify(episodeIds) !== JSON.stringify(record.episodeIds)
      || JSON.stringify(semanticIds) !== JSON.stringify(record.semanticIds)
    ) {
      throw new MemoryOriginIntegrityError(
        `Compaction '${record.compactionId}' output rows do not match lineage membership.`,
      );
    }
  }
}
