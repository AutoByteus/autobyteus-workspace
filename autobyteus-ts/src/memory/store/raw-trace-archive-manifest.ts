export const RAW_TRACE_ARCHIVE_MANIFEST_SCHEMA_VERSION = 1;

export type RawTraceArchiveBoundaryType =
  | 'native_compaction'
  | 'provider_compaction_boundary';

export type RawTraceArchiveSegmentStatus = 'pending' | 'complete';

export type RawTraceArchiveSegmentEntry = {
  index: number;
  file_name: string;
  boundary_type: RawTraceArchiveBoundaryType;
  boundary_key: string;
  boundary_trace_id?: string | null;
  runtime_kind?: string | null;
  source_event?: string | null;
  archived_at: number;
  first_trace_id?: string | null;
  last_trace_id?: string | null;
  first_ts?: number | null;
  last_ts?: number | null;
  record_count: number;
  status: RawTraceArchiveSegmentStatus;
};

export type RawTraceArchiveManifest = {
  schema_version: typeof RAW_TRACE_ARCHIVE_MANIFEST_SCHEMA_VERSION;
  next_segment_index: number;
  segments: RawTraceArchiveSegmentEntry[];
};

export const createEmptyRawTraceArchiveManifest = (): RawTraceArchiveManifest => ({
  schema_version: RAW_TRACE_ARCHIVE_MANIFEST_SCHEMA_VERSION,
  next_segment_index: 1,
  segments: [],
});
