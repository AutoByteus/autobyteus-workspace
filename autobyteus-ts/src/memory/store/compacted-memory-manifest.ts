export const COMPACTED_MEMORY_SCHEMA_VERSION = 3;

export type CompactedMemoryManifest = {
  schema_version: number;
  last_reset_ts: number;
};
