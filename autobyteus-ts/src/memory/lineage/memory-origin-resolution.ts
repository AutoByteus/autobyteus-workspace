import type { RawTraceItem } from '../models/raw-trace-item.js';
import type { CompactionLineageScope } from './compaction-lineage-scope.js';

export type MemoryArtifactRef =
  | { kind: 'episode'; id: string }
  | { kind: 'semantic'; id: string };

export type SourceInterval = {
  firstObservedAt: number | null;
  lastObservedAt: number | null;
};

export type ResolvedRawTraceRoot = {
  archiveFile: string;
  trace: RawTraceItem;
};

export type MemoryOriginResolution =
  | {
      status: 'not_found';
      scope: CompactionLineageScope;
      artifact: MemoryArtifactRef;
    }
  | {
      status: 'complete';
      scope: CompactionLineageScope;
      artifact: MemoryArtifactRef;
      producingCompactionId: string;
      direct: {
        rawTraceArchiveFile: string;
        rawTraces: RawTraceItem[];
        rawSourceInterval: SourceInterval;
        previousCompactionId: string | null;
      };
      roots: ResolvedRawTraceRoot[];
      rootSourceInterval: SourceInterval;
      derivedAt: string;
    };

export class MemoryOriginIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MemoryOriginIntegrityError';
  }
}
