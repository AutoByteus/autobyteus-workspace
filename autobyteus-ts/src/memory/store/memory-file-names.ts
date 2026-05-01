export const RAW_TRACES_MEMORY_FILE_NAME = 'raw_traces.jsonl';
export const EPISODIC_MEMORY_FILE_NAME = 'episodic.jsonl';
export const SEMANTIC_MEMORY_FILE_NAME = 'semantic.jsonl';
export const WORKING_CONTEXT_SNAPSHOT_FILE_NAME = 'working_context_snapshot.json';
export const COMPACTED_MEMORY_MANIFEST_FILE_NAME = 'compacted_memory_manifest.json';

export const MEMORY_FILE_NAMES = {
  rawTraces: RAW_TRACES_MEMORY_FILE_NAME,
  episodic: EPISODIC_MEMORY_FILE_NAME,
  semantic: SEMANTIC_MEMORY_FILE_NAME,
  workingContextSnapshot: WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
  compactedMemoryManifest: COMPACTED_MEMORY_MANIFEST_FILE_NAME,
} as const;
