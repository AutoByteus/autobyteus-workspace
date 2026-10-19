import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

/**
 * Identifies the rendering rules. A closed journal file is reused only when it was written by
 * this revision (a cache key for derived output, not a schema version of the manifest).
 */
export const WORK_JOURNAL_RENDERER_REVISION = 1;

/** One run's journal: the run, its own memory folder, and the live run's runtime. */
export type WorkJournalTarget = Readonly<{
  runId: string;
  memoryDir: string;
  runtimeKind: RuntimeKind;
}>;

export type WorkJournalFileState = "closed" | "open";

export type WorkJournalPackageFile = Readonly<{
  path: string;
  sourceFile: string;
  state: WorkJournalFileState;
}>;

/** What a consumer receives: the journal files in order and a hash over their contents. */
export type WorkJournalPackage = Readonly<{
  rootPath: string;
  manifestPath: string;
  files: readonly WorkJournalPackageFile[];
  evidenceHash: string;
}>;

export type WorkJournalManifestFile = Readonly<{
  journal_file: string;
  source_file: string;
  /** For a closed file, the raw manifest's record count of its segment. */
  source_record_count: number;
  state: WorkJournalFileState;
  /** sha256 of the journal file's content, so the evidence hash never re-reads closed files. */
  content_sha256: string;
}>;

export type WorkJournalManifest = Readonly<{
  run_id: string;
  runtime_kind: string;
  renderer_revision: number;
  files: readonly WorkJournalManifestFile[];
}>;
